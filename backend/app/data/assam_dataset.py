"""Import and query the Assam public procurement metadata dataset.

Dataset records live in their own SQLite database so importing historical
metadata cannot overwrite operational tenders, documents, bids, or audits.
"""
from __future__ import annotations

import csv
import json
import os
import re
import sqlite3
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

DATASET_ID = "7259310"
DATASET_SOURCE = "Assam Public Procurement Data"
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "assam_public_procurement.sqlite"
FISCAL_FILES = {
    f"{year}_{year + 1}": f"ocds_mapped_procurement_data_fiscal_year_{year}_{year + 1}.csv"
    for year in range(2016, 2022)
}


def _connect(path: Path = DB_PATH) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS dataset_tenders (
        source_key TEXT PRIMARY KEY, tender_id TEXT, ocid TEXT, title TEXT,
        procurement_category TEXT, procurement_method TEXT, contract_type TEXT,
        classification TEXT, estimated_value REAL, published_date TEXT,
        duration_days INTEGER, bid_opening_date TEXT, number_of_tenderers INTEGER,
        stage TEXT, payment_mode TEXT, buyer_name TEXT, fiscal_year TEXT,
        external_reference TEXT, submission_method TEXT,
        preferential_bidder_allowed TEXT, two_stage_tender_allowed TEXT,
        source TEXT NOT NULL, source_type TEXT NOT NULL, source_dataset_id TEXT NOT NULL,
        source_fiscal_year TEXT, source_tender_id TEXT, source_ocid TEXT,
        source_buyer TEXT, raw_json TEXT NOT NULL
    )")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_tender_id ON dataset_tenders(tender_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_ocid ON dataset_tenders(ocid)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_dataset_year ON dataset_tenders(fiscal_year)")
    return conn


def _norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())


def _value(row: dict[str, Any], *names: str) -> str | None:
    indexed = {_norm(k): v for k, v in row.items()}
    for name in names:
        raw = indexed.get(_norm(name))
        if raw is not None and str(raw).strip().lower() not in ("", "nan", "null", "none", "n/a"):
            return str(raw).strip()
    return None


def _date(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S", "%d-%b-%Y"):
        try:
            return datetime.strptime(value[:19], fmt).isoformat()
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def _number(raw: str | None, integer: bool = False) -> int | float | None:
    if raw is None:
        return None
    cleaned = re.sub(r"[,₹$\s]", "", raw)
    try:
        number = float(cleaned)
        if number != number or number in (float("inf"), float("-inf")):
            return None
        return int(number) if integer and number.is_integer() else (None if integer else number)
    except ValueError:
        return None


def map_row(row: dict[str, Any], fiscal_year: str) -> dict[str, Any] | None:
    # Normalize headers while retaining the untouched original row in raw_json.
    tender_id = _value(row, "tender/id", "tender_id", "tender id", "id")
    ocid = _value(row, "ocid")
    title = _value(row, "tender/title", "title")
    if not tender_id and not ocid:
        return None
    v = lambda *keys: _value(row, *keys)
    return {
        "source_key": f"{DATASET_ID}:{tender_id or ocid}", "tender_id": tender_id, "ocid": ocid,
        "title": title, "procurement_category": v("tender/mainProcurementCategory"),
        "procurement_method": v("tender/procurementMethod"), "contract_type": v("tender/contractType"),
        "classification": v("tenderclassification/description"),
        "estimated_value": _number(v("tender/value/amount")),
        "published_date": _date(v("tender/datePublished")),
        "duration_days": _number(v("tender/tenderPeriod/durationInDays"), True),
        "bid_opening_date": _date(v("tender/bidOpening/date")),
        "number_of_tenderers": _number(v("tender/numberOfTenderers"), True),
        "stage": v("tender/stage"), "payment_mode": v("Payment Mode"),
        "buyer_name": v("buyer/name"), "fiscal_year": v("fiscal_year") or fiscal_year,
        "external_reference": v("tender/externalReference"),
        "submission_method": v("tender/submissionMethodDetails"),
        "preferential_bidder_allowed": v("tender/allowPreferentialBidder"),
        "two_stage_tender_allowed": v("tender/allowTwoStageTender"),
        "source": DATASET_SOURCE, "source_type": "government_dataset", "source_dataset_id": DATASET_ID,
        "source_fiscal_year": fiscal_year, "source_tender_id": tender_id,
        "source_ocid": ocid, "source_buyer": v("buyer/name"),
        "raw_json": json.dumps(row, ensure_ascii=False, default=str),
    }


def import_zip(zip_path: str | os.PathLike[str], db_path: Path = DB_PATH) -> dict[str, Any]:
    summary: dict[str, Any] = {"source": DATASET_SOURCE, "dataset_id": DATASET_ID, "fiscal_years": {}, "duplicates_skipped": 0, "invalid_records": 0, "imported": 0}
    conn = _connect(db_path)
    columns = [r[1] for r in conn.execute("PRAGMA table_info(dataset_tenders)") if r[1] != ""]
    insert_columns = columns
    sql = f"INSERT OR IGNORE INTO dataset_tenders ({','.join(insert_columns)}) VALUES ({','.join('?' for _ in insert_columns)})"
    try:
        with zipfile.ZipFile(zip_path) as archive:
            names = archive.namelist()
            for fy, filename in FISCAL_FILES.items():
                match = next((n for n in names if n.replace('\\', '/').endswith(filename)), None)
                if not match:
                    summary["fiscal_years"][fy] = {"rows": 0, "imported": 0, "missing_file": True}
                    continue
                rows = inserted = duplicates = invalid = 0
                with archive.open(match) as binary:
                    import io
                    text = io.TextIOWrapper(binary, encoding="utf-8-sig", newline="")
                    reader = csv.DictReader(text)
                    for raw in reader:
                        rows += 1
                        mapped = map_row(raw, fy)
                        if not mapped or not mapped.get("title"):
                            invalid += 1
                        if not mapped:
                            continue
                        before = conn.total_changes
                        conn.execute(sql, [mapped.get(c) for c in insert_columns])
                        if conn.total_changes == before:
                            duplicates += 1
                        else:
                            inserted += 1
                    conn.commit()
                summary["fiscal_years"][fy] = {"rows": rows, "imported": inserted, "duplicates_skipped": duplicates, "invalid_records": invalid}
                summary["imported"] += inserted
                summary["duplicates_skipped"] += duplicates
                summary["invalid_records"] += invalid
    finally:
        conn.close()
    return summary


def query_tenders(page: int = 1, page_size: int = 25, search: str | None = None,
                  fiscal_year: str | None = None, procurement_category: str | None = None,
                  procurement_method: str | None = None, contract_type: str | None = None,
                  stage: str | None = None, buyer: str | None = None,
                  min_amount: float | None = None, max_amount: float | None = None) -> dict[str, Any]:
    filters, args = [], []
    if search:
        like = f"%{search.strip()}%"
        filters.append("(tender_id LIKE ? OR title LIKE ? OR buyer_name LIKE ? OR external_reference LIKE ? OR ocid LIKE ?)")
        args.extend([like] * 5)
    for col, val in (("fiscal_year", fiscal_year), ("procurement_category", procurement_category), ("procurement_method", procurement_method), ("contract_type", contract_type), ("stage", stage), ("buyer_name", buyer)):
        if val:
            filters.append(f"{col} = ?"); args.append(val)
    if min_amount is not None:
        filters.append("estimated_value >= ?"); args.append(min_amount)
    if max_amount is not None:
        filters.append("estimated_value <= ?"); args.append(max_amount)
    where = " WHERE " + " AND ".join(filters) if filters else ""
    conn = _connect()
    try:
        total = conn.execute(f"SELECT COUNT(*) FROM dataset_tenders{where}", args).fetchone()[0]
        rows = conn.execute(f"SELECT * FROM dataset_tenders{where} ORDER BY fiscal_year DESC, published_date DESC LIMIT ? OFFSET ?", [*args, page_size, (page-1)*page_size]).fetchall()
        items = [dict(r) | {"id": dict(r)["source_key"], "organization": dict(r)["buyer_name"] or "Unknown buyer", "category": dict(r)["procurement_category"] or "Unspecified", "status": "HISTORICAL", "bids_count": dict(r)["number_of_tenderers"], "source_label": DATASET_SOURCE, "record_type": "dataset_tender"} for r in rows]
        return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": (total + page_size - 1)//page_size}
    finally:
        conn.close()


def get_dataset_tender(identifier: str) -> dict[str, Any] | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM dataset_tenders WHERE source_key = ? OR tender_id = ? OR ocid = ? LIMIT 1", (identifier, identifier, identifier)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
