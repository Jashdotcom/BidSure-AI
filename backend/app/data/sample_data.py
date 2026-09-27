"""
BidSure AI Sample & In-Memory Data Store
Provides realistic user credentials and dynamic in-memory data store for procurement workflows.
"""
from typing import Dict, List, Any, Optional
import os
import copy
import time
import hashlib
import threading
import re
from datetime import datetime, timezone
from app.config import load_project_env
load_project_env()

# Centralized Demo Mode Switch (default: false)
DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "t", "yes")

SAMPLE_USERS: List[Dict[str, Any]] = [
    {
        "id": "usr_officer_001",
        "email": "officer@cpcl.gov.in",
        # PBKDF2 hash of "admin123"
        "password_hash": "pbkdf2:sha256:600000$saltsalt$f3b890864ebae47ad4b9fb7cd355ec6b043257cd67ecaa697669d67db8fdfe9f",
        "name": "Rajesh Kumar",
        "role": "PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Materials & Procurement Division",
        "designation": "Senior Manager (Procurement)"
    },
    {
        "id": "usr_senior_002",
        "email": "cpo@cpcl.gov.in",
        # PBKDF2 hash of "admin123"
        "password_hash": "pbkdf2:sha256:600000$saltsalt$f3b890864ebae47ad4b9fb7cd355ec6b043257cd67ecaa697669d67db8fdfe9f",
        "name": "Dr. Ananya Sharma",
        "role": "SENIOR_PROCUREMENT_OFFICER",
        "organization": "Chennai Petroleum Corporation Limited (CPCL)",
        "department": "Executive Procurement Board",
        "designation": "Chief General Manager (Procurement)"
    },
    {
        "id": "usr_bidder_001",
        "email": "abc@abcsafety.com",
        # PBKDF2 hash of "bidder123"
        "password_hash": "pbkdf2:sha256:600000$saltsalt$045b85a363d3390c29cf4fba462e74213b2cbe0052adbbd6d31eb46342c8d2c4",
        "name": "Suresh Patel",
        "role": "BIDDER",
        "organization": "ABC Safety Solutions Pvt Ltd",
        "designation": "Managing Director",
        "bidder_id": "BID-001"
    }
]

# Clean Operational Seed Lists (All synthetic procurement records purged)
DEMO_TENDERS: List[Dict[str, Any]] = []
DEMO_BIDDERS: List[Dict[str, Any]] = []
DEMO_NOTIFICATIONS: List[Dict[str, Any]] = []
DEMO_AUDIT_LOGS: List[Dict[str, Any]] = []

# Pre-seeded canonical bidder profiles (isolated profile source of truth)
SEED_BIDDER_PROFILES: Dict[str, Dict[str, Any]] = {
    "BID-001": {
        "id": "BID-001",
        "user_id": "usr_bidder_001",
        "name": "ABC Safety Solutions Pvt Ltd",
        "company_name": "ABC Safety Solutions Pvt Ltd",
        "contact_person": "Suresh Patel",
        "email": "abc@abcsafety.com",
        "phone": "+91 98765 43210",
        "entity_type": "Private Limited Company",
        "business_address": "Plot 42, Guindy Industrial Estate",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600032",
        "pan": "AABCA1234F",
        "gstin": "33AABCA1234F1Z5",
        "udyam": "UDYAM-TN-02-0012345",
        "epfo_code": "TN/MAS/0099881",
        "business_registration_number": "U74999TN2021PTC142890",
        "business_registration_date": "2021-04-15",
        "annual_turnover_cr": 12.5,
        "years_experience": 8,
        "oem_authorization": "Direct OEM Authorization",
        "local_content": 65.0,
        "emd_paid": True,
        "status": "VERIFIED",
        "verification_status": "IDENTITY_CONSISTENT",
        "government_verifications": {
            "pan": {
                "source": "Income Tax Department / NSDL PAN API (Mock Adapter)",
                "status": "VALID",
                "pan": "AABCA1234F",
                "entity_name": "ABC Safety Solutions Pvt Ltd",
                "category": "Company",
                "message": "PAN verified as active and valid with Income Tax Department records."
            },
            "gstin": {
                "source": "GSTN Portal API (Adapter)",
                "status": "VALID",
                "gstin": "33AABCA1234F1Z5",
                "trade_name": "ABC Safety Solutions Pvt Ltd",
                "legal_name": "ABC SAFETY SOLUTIONS PRIVATE LIMITED",
                "gstin_status": "Active",
                "message": "GSTIN verified active on Goods and Services Tax Network."
            },
            "udyam": {
                "source": "MSME Udyam Portal API",
                "status": "VALID",
                "udyam_number": "UDYAM-TN-02-0012345",
                "enterprise_name": "ABC Safety Solutions Pvt Ltd",
                "category": "Small Enterprise",
                "message": "Valid MSME Udyam registration verified with Ministry of MSME database."
            },
            "epfo": {
                "source": "EPFO / ESIC Unified Portal (Mock Adapter)",
                "status": "VALID",
                "establishment_code": "TN/MAS/0099881",
                "epfo_status": "Active",
                "message": "Statutory registrations (EPFO/ESIC) verified with regular monthly contributions."
            }
        },
        "score": 95.0,
        "documents": {}
    }
}

# Live Mutable Operational Data Stores
SAMPLE_BIDDER_PROFILES: Dict[str, Dict[str, Any]] = copy.deepcopy(SEED_BIDDER_PROFILES)
SAMPLE_TENDERS: List[Dict[str, Any]] = []
SAMPLE_BIDDERS: List[Dict[str, Any]] = []
SAMPLE_BIDDER_BIDS: List[Dict[str, Any]] = []
SAMPLE_AUDIT_LOGS: List[Dict[str, Any]] = []
SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = []
SAMPLE_ANALYSIS_JOBS: Dict[str, Dict[str, Any]] = {}

_tender_number_lock = threading.RLock()


# Helper data query and mutation functions
def get_all_users() -> List[Dict[str, Any]]:
    return SAMPLE_USERS

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    norm = email.strip().lower()
    for u in SAMPLE_USERS:
        if u["email"].lower() == norm:
            return u
    return None

def add_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    SAMPLE_USERS.append(user_data)
    return user_data

NON_SUBMITTED_STATUSES = {"DRAFT", "CANCELLED", "WITHDRAWN"}

def is_submitted_bid(bid: Optional[Dict[str, Any]]) -> bool:
    """
    Determines if a bid record represents a formally received and submitted bid.
    Excludes DRAFT, CANCELLED, and WITHDRAWN bids from the officer received bids pool.
    """
    if not bid:
        return False
    if bid.get("is_draft", False) is True:
        return False
    status = (bid.get("status") or "").strip().upper()
    if status in NON_SUBMITTED_STATUSES:
        return False
    return True

def get_bidders_for_tender(tender_id: str, eligible_only: bool = True) -> List[Dict[str, Any]]:
    """
    Retrieves bidders associated with a tender ID or tender number.
    By default (eligible_only=True), returns only formally submitted bids.
    """
    if not tender_id:
        return []
    tender = None
    # Fast matching against SAMPLE_TENDERS directly to avoid recursion
    for t in SAMPLE_TENDERS:
        if (
            t.get("id") == tender_id
            or t.get("tender_number") == tender_id
            or t.get("ref") == tender_id
            or t.get("tender_id") == tender_id
        ):
            tender = t
            break

    matched_ids = {str(tender_id).strip()}
    if tender:
        for k in ["id", "tender_number", "ref", "tender_id"]:
            if tender.get(k):
                matched_ids.add(str(tender[k]).strip())

    res = [
        b for b in SAMPLE_BIDDERS
        if (b.get("tender_id") and str(b.get("tender_id")).strip() in matched_ids)
        or (b.get("tender_number") and str(b.get("tender_number")).strip() in matched_ids)
    ]
    if eligible_only:
        res = [b for b in res if is_submitted_bid(b)]
    return res

def count_submitted_bids_for_tender(tender_id: str) -> int:
    """
    Single source of truth for count of submitted bids for a tender.
    """
    return len(get_bidders_for_tender(tender_id, eligible_only=True))

def compute_tender_bid_counts(tender: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dynamically computes bids_count (submitted bids only) and verified_count
    for a tender record based on live database state in SAMPLE_BIDDERS.
    """
    tender_copy = dict(tender)
    tid = tender.get("id") or tender.get("tender_number") or ""
    submitted_bids = get_bidders_for_tender(tid, eligible_only=True)
    tender_copy["bids_count"] = len(submitted_bids)
    tender_copy["verified_count"] = sum(
        1 for b in submitted_bids
        if b.get("verification_status") in ["AUTHENTICATED", "COMPLETED", "VERIFIED"]
        or b.get("status") in ["COMPLETED", "AUTHENTICATED", "VERIFIED"]
    )
    if "deadline_history" not in tender_copy or tender_copy["deadline_history"] is None:
        tender_copy["deadline_history"] = []
    if "amendments" not in tender_copy or tender_copy["amendments"] is None:
        tender_copy["amendments"] = list(tender_copy.get("deadline_history") or [])
    if "requirements" not in tender_copy or tender_copy["requirements"] is None:
        tender_copy["requirements"] = []
    return tender_copy

def format_tender_deadline_display(val: Any) -> str:
    """Formats an ISO timestamp or date string into a readable format (e.g., '18 Sep 2026, 05:30 PM')."""
    if not val:
        return "Not Specified"
    val_str = str(val).strip()
    try:
        if "T" in val_str:
            clean_str = val_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            return dt.strftime("%d %b %Y, %I:%M %p")
        else:
            dt = datetime.fromisoformat(val_str)
            return dt.strftime("%d %b %Y")
    except Exception:
        return val_str

def parse_deadline_datetime(dt_input: str) -> datetime:
    """Parses various date/time input formats into a UTC-aware datetime."""
    s = str(dt_input).strip()
    s = s.replace("Z", "+00:00")
    if " " in s and "T" not in s:
        s = s.replace(" ", "T")
    try:
        if "T" in s:
            dt = datetime.fromisoformat(s)
        else:
            # Default closing time: 17:30:00 UTC
            dt = datetime.fromisoformat(f"{s}T17:30:00+00:00")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as err:
        raise ValueError(f"Invalid date format for deadline: '{dt_input}'. Expected YYYY-MM-DD or ISO 8601 timestamp.") from err

def get_all_tenders(query: Optional[str] = None, status: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    results = [compute_tender_bid_counts(t) for t in SAMPLE_TENDERS]
    if query:
        q = query.strip().lower()
        results = [
            t for t in results
            if q in t.get("id", "").lower()
            or q in t.get("tender_number", "").lower()
            or q in t.get("ref", "").lower()
            or q in t.get("tender_id", "").lower()
            or q in t.get("title", "").lower()
            or q in t.get("organization", "").lower()
            or q in t.get("department", "").lower()
            or q in t.get("category", "").lower()
            or q in t.get("description", "").lower()
        ]
    if status and status.upper() != "ALL":
        st = status.strip().upper()
        if st in ["ACTIVE", "OPEN", "PUBLISHED"]:
            results = [t for t in results if t.get("status", "").upper() in ["ACTIVE", "OPEN", "PUBLISHED"]]
        elif st in ["INACTIVE", "CLOSED", "CANCELLED", "ARCHIVED"]:
            results = [t for t in results if t.get("status", "").upper() in ["INACTIVE", "CLOSED", "CANCELLED", "ARCHIVED"]]
        elif st in ["DRAFT", "ANALYZING", "REQUIREMENTS_REVIEW"]:
            results = [t for t in results if t.get("status", "").upper() in ["DRAFT", "ANALYZING", "REQUIREMENTS_REVIEW"]]
        else:
            results = [
                t for t in results
                if t.get("status", "").upper() == st
                or (st in ["UNDER REVIEW", "EVALUATING", "REVIEW"] and t.get("status", "").upper() in ["UNDER REVIEW", "EVALUATING", "REVIEW"])
            ]
    if category and category.upper() != "ALL":
        cat = category.strip().lower()
        results = [t for t in results if cat in t.get("category", "").lower()]
    return results

def get_tender_by_id(tender_id: str) -> Optional[Dict[str, Any]]:
    for t in SAMPLE_TENDERS:
        if (
            t.get("id") == tender_id
            or t.get("tender_number") == tender_id
            or t.get("ref") == tender_id
            or t.get("tender_id") == tender_id
        ):
            return compute_tender_bid_counts(t)
    return None

def check_tender_id_exists(tender_num_or_id: str, exclude_id: Optional[str] = None) -> bool:
    """
    Checks if a Tender ID or Tender Number already exists in the system.
    Used to prevent duplicate tender creations.
    """
    if not tender_num_or_id:
        return False
    normalized = tender_num_or_id.strip().lower()
    for t in SAMPLE_TENDERS:
        if exclude_id and (t.get("id") == exclude_id or t.get("tender_number") == exclude_id):
            continue
        if (
            (t.get("id") and t.get("id").strip().lower() == normalized)
            or (t.get("tender_number") and t.get("tender_number").strip().lower() == normalized)
            or (t.get("ref") and t.get("ref").strip().lower() == normalized)
            or (t.get("tender_id") and t.get("tender_id").strip().lower() == normalized)
        ):
            return True
    return False

def get_highest_tender_sequence(year: int = 2026) -> int:
    highest = 0
    year_str = str(year)
    for t in SAMPLE_TENDERS:
        for field in ("tender_number", "ref", "tender_id", "id"):
            val = t.get(field)
            if val and isinstance(val, str):
                m = re.search(r'CPCL/PROC/(?:[A-Z0-9_-]+/)?' + re.escape(year_str) + r'/(\d+)', val, re.IGNORECASE)
                if m:
                    try:
                        seq = int(m.group(1))
                        if seq > highest:
                            highest = seq
                    except ValueError:
                        pass
                m2 = re.search(r'TND[-/]' + re.escape(year_str) + r'[-/](\d+)', val, re.IGNORECASE)
                if m2:
                    try:
                        seq = int(m2.group(1))
                        if seq > highest:
                            highest = seq
                    except ValueError:
                        pass
    return highest

def get_next_tender_number(year: Optional[int] = None) -> Dict[str, Any]:
    if year is None:
        year_int = 2026
    else:
        try:
            year_int = int(year)
        except (ValueError, TypeError):
            year_int = 2026

    highest = get_highest_tender_sequence(year_int)
    next_seq = highest + 1

    formatted_number = f"CPCL/PROC/{year_int}/{next_seq:03d}"
    internal_id = f"TND-{year_int}-{next_seq:03d}"

    return {
        "tender_number": formatted_number,
        "tender_id": formatted_number,
        "internal_id": internal_id,
        "year": year_int,
        "sequence": next_seq,
        "highest_existing_sequence": highest
    }

def generate_and_reserve_tender_number(year: Optional[int] = None) -> Dict[str, Any]:
    with _tender_number_lock:
        if year is None:
            year_int = 2026
        else:
            try:
                year_int = int(year)
            except (ValueError, TypeError):
                year_int = 2026

        highest = get_highest_tender_sequence(year_int)
        next_seq = highest + 1

        formatted_number = f"CPCL/PROC/{year_int}/{next_seq:03d}"
        while check_tender_id_exists(formatted_number):
            next_seq += 1
            formatted_number = f"CPCL/PROC/{year_int}/{next_seq:03d}"

        internal_id = f"TND-{year_int}-{next_seq:03d}"
        while check_tender_id_exists(internal_id):
            internal_id = f"TND-{year_int}-{next_seq + 1:03d}"

        return {
            "tender_number": formatted_number,
            "tender_id": formatted_number,
            "internal_id": internal_id,
            "year": year_int,
            "sequence": next_seq
        }

def add_tender(tender_data: Dict[str, Any]) -> Dict[str, Any]:
    with _tender_number_lock:
        issue = tender_data.get("issue_date") or tender_data.get("publish_date")
        target_year = 2026
        if issue and len(str(issue)) >= 4:
            try:
                target_year = int(str(issue)[:4])
            except ValueError:
                target_year = 2026

        raw_id = (
            tender_data.get("tender_number")
            or tender_data.get("tender_id")
            or tender_data.get("ref")
            or tender_data.get("id")
        )

        if not raw_id or "AUTO" in str(raw_id).upper() or "DRAFT-" in str(raw_id).upper():
            gen = generate_and_reserve_tender_number(target_year)
            tender_data["tender_number"] = gen["tender_number"]
            tender_data["ref"] = gen["tender_number"]
            tender_data["tender_id"] = gen["tender_number"]
            tender_data["id"] = gen["internal_id"]
        else:
            raw_id_str = str(raw_id).strip()
            if check_tender_id_exists(raw_id_str):
                raise ValueError(f"Tender ID '{raw_id_str}' already exists in the registry. Please use a unique Tender ID.")
            if not tender_data.get("id"):
                tender_data["id"] = f"TND-{target_year}-{get_highest_tender_sequence(target_year) + 1:03d}"
            if not tender_data.get("tender_number"):
                tender_data["tender_number"] = raw_id_str
            if not tender_data.get("ref"):
                tender_data["ref"] = tender_data["tender_number"]
            if not tender_data.get("tender_id"):
                tender_data["tender_id"] = tender_data["tender_number"]

        if not tender_data.get("organization"):
            tender_data["organization"] = "Chennai Petroleum Corporation Limited (CPCL)"
        if not tender_data.get("status"):
            tender_data["status"] = "DRAFT"

        SAMPLE_TENDERS.insert(0, tender_data)
        return tender_data

def update_tender(tender_id: str, patch_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    with _tender_number_lock:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break
        if tender:
            new_num = patch_data.get("tender_number") or patch_data.get("tender_id")
            if new_num and new_num != tender.get("tender_number") and check_tender_id_exists(new_num, exclude_id=tender.get("id")):
                raise ValueError(f"Tender ID '{new_num}' already exists in the registry.")
            tender.update(patch_data)
            return compute_tender_bid_counts(tender)
        return None

def extend_tender_deadline(
    tender_id: str,
    new_deadline: str,
    reason: str,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    with _tender_number_lock:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break

        if not tender:
            raise ValueError(f"Tender '{tender_id}' not found.")

        current_status = (tender.get("status") or "DRAFT").strip().upper()
        if current_status in ["CLOSED", "CANCELLED", "ARCHIVED"]:
            raise ValueError(f"Cannot extend deadline for a tender in '{current_status}' status.")

        if not reason or len(reason.strip()) < 3:
            raise ValueError("An official justification / corrigendum rationale is required (minimum 3 characters).")

        new_dt = parse_deadline_datetime(new_deadline)
        now_dt = datetime.now(timezone.utc)

        if new_dt <= now_dt:
            raise ValueError(
                f"New deadline must be in the future. Provided: {new_dt.strftime('%d %b %Y, %I:%M %p UTC')}, Current UTC time: {now_dt.strftime('%d %b %Y, %I:%M %p UTC')}."
            )

        prev_deadline_raw = tender.get("closing_date") or tender.get("submission_deadline") or tender.get("deadline") or ""
        if prev_deadline_raw:
            try:
                prev_dt = parse_deadline_datetime(prev_deadline_raw)
                if new_dt <= prev_dt:
                    raise ValueError(
                        f"New deadline ({new_dt.strftime('%d %b %Y, %I:%M %p')}) must be strictly later than current deadline ({prev_dt.strftime('%d %b %Y, %I:%M %p')})."
                    )
            except ValueError as ve:
                if "must be strictly later" in str(ve):
                    raise
                pass

        prev_deadline_display = format_tender_deadline_display(prev_deadline_raw)
        iso_new_deadline = new_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        new_deadline_display = new_dt.strftime("%d %b %Y, %I:%M %p")
        short_deadline = new_dt.strftime("%d %b %Y")

        if "deadline_history" not in tender or not isinstance(tender["deadline_history"], list):
            tender["deadline_history"] = []

        seq_num = len(tender["deadline_history"]) + 1
        t_ref = (tender.get("tender_number") or tender.get("id") or tender_id).replace("/", "-")
        amd_id = f"AMD-{t_ref}-{seq_num:02d}"

        officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
        officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
        officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
        changed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        amendment_entry = {
            "id": amd_id,
            "amendment_number": f"Corrigendum-{seq_num:02d}",
            "tender_id": tender.get("tender_number") or tender.get("id"),
            "previous_deadline": prev_deadline_raw,
            "previous_deadline_display": prev_deadline_display,
            "new_deadline": iso_new_deadline,
            "new_deadline_display": new_deadline_display,
            "reason": reason.strip(),
            "changed_by": officer_name,
            "changed_by_email": officer_email,
            "changed_at": changed_at
        }
        tender["deadline_history"].append(amendment_entry)
        tender["amendments"] = list(tender["deadline_history"])

        tender["closing_date"] = iso_new_deadline
        tender["submission_deadline"] = iso_new_deadline
        tender["deadline"] = short_deadline
        tender["last_amended_at"] = changed_at
        tender["last_amendment_reason"] = reason.strip()

        add_audit_log({
            "user_email": officer_email,
            "user_role": officer_role,
            "action": "TENDER_DEADLINE_UPDATED",
            "entity_type": "TENDER",
            "entity_id": tender.get("tender_number") or tender.get("id"),
            "details": f"Submission deadline extended from '{prev_deadline_display}' to '{new_deadline_display}' ({amendment_entry['amendment_number']}). Justification: {reason.strip()}",
            "status": "SUCCESS"
        })

        return compute_tender_bid_counts(tender)

def close_tender(
    tender_id: str,
    reason: Optional[str] = None,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    with _tender_number_lock:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break

        if not tender:
            raise ValueError(f"Tender '{tender_id}' not found.")

        current_status = (tender.get("status") or "DRAFT").strip().upper()
        if current_status == "CLOSED":
            raise ValueError(f"Tender '{tender.get('tender_number') or tender_id}' is already closed.")

        officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
        officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
        officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"

        close_reason = (reason or "").strip() or "Bidding window concluded and sealed by Procurement Officer."
        closed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        old_status = tender.get("status", "PUBLISHED")
        tender["status"] = "CLOSED"
        tender["closed_at"] = closed_at
        tender["closed_by"] = officer_name
        tender["closed_by_email"] = officer_email
        tender["close_reason"] = close_reason

        add_audit_log({
            "user_email": officer_email,
            "user_role": officer_role,
            "action": "TENDER_CLOSED",
            "entity_type": "TENDER",
            "entity_id": tender.get("tender_number") or tender.get("id"),
            "details": f"Tender {tender.get('tender_number') or tender.get('id')} status changed from {old_status} to CLOSED. Reason: {close_reason}",
            "status": "SUCCESS"
        })

        return compute_tender_bid_counts(tender)

def get_all_bidders(
    query: Optional[str] = None,
    tender_id: Optional[str] = None,
    status: Optional[str] = None,
    include_drafts: bool = False
) -> List[Dict[str, Any]]:
    results = list(SAMPLE_BIDDERS)
    if tender_id:
        tender = None
        for t in SAMPLE_TENDERS:
            if (
                t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id
            ):
                tender = t
                break
        matched_ids = {str(tender_id).strip()}
        if tender:
            for k in ["id", "tender_number", "ref", "tender_id"]:
                if tender.get(k):
                    matched_ids.add(str(tender[k]).strip())
        results = [
            b for b in results
            if (b.get("tender_id") and str(b.get("tender_id")).strip() in matched_ids)
            or (b.get("tender_number") and str(b.get("tender_number")).strip() in matched_ids)
        ]
    if query:
        q = query.strip().lower()
        results = [
            b for b in results
            if q in b.get("id", "").lower()
            or q in b.get("name", "").lower()
            or q in b.get("bid_submission_id", "").lower()
            or q in b.get("tender_id", "").lower()
            or q in b.get("tender_number", "").lower()
            or q in b.get("tender_title", "").lower()
            or q in b.get("contact_person", "").lower()
            or q in b.get("email", "").lower()
            or q in b.get("location", "").lower()
            or q in b.get("status", "").lower()
            or q in b.get("compliance_status", "").lower()
        ]
    st = (status or "ALL").strip().upper().replace(" ", "_")
    if st == "DRAFT":
        results = [b for b in results if not is_submitted_bid(b)]
    elif st != "ALL" and st != "ALL_WITH_DRAFTS":
        results = [
            b for b in results
            if is_submitted_bid(b) and (
                b.get("status", "").upper().replace(" ", "_") == st
                or b.get("compliance_status", "").upper().replace(" ", "_") == st
                or (st == "REVIEW" and b.get("status", "").upper() in ["REVIEW", "UNDER_VERIFICATION", "REQUIRES_REVIEW"])
                or (st == "UNDER_VERIFICATION" and b.get("status", "").upper() in ["UNDER_VERIFICATION", "REVIEW", "PROCESSING"])
                or (st == "SUBMITTED" and b.get("status", "").upper() in ["SUBMITTED", "COMPLIANT", "NON_COMPLIANT"])
                or (st == "COMPLETED" and b.get("status", "").upper() in ["COMPLETED", "AUTHENTICATED", "COMPLIANT"])
            )
        ]
    elif not include_drafts and st != "ALL_WITH_DRAFTS":
        results = [b for b in results if is_submitted_bid(b)]

    return results

def delete_tender(tender_id: str) -> Dict[str, Any]:
    with _tender_number_lock:
        tender = get_tender_by_id(tender_id)
        if not tender:
            raise KeyError(f"Tender '{tender_id}' not found.")

        t_status = (tender.get("status") or "DRAFT").strip().upper()

        NON_DELETABLE = {"PUBLISHED", "REQUIREMENTS_REVIEW", "ANALYZING", "CLOSED", "AWARDED"}
        if t_status in NON_DELETABLE:
            raise ValueError(
                f"Tenders with status '{t_status}' cannot be permanently deleted. "
                f"Only DRAFT tenders with no submitted bids may be deleted."
            )

        t_num = tender.get("tender_number") or tender.get("tender_id") or tender.get("ref") or tender.get("id")
        t_internal_id = tender.get("id")
        dependent_bids = [
            b for b in SAMPLE_BIDDERS
            if b.get("tender_id") == t_internal_id or b.get("tender_number") == t_num
        ]
        if dependent_bids:
            raise ValueError(
                f"Cannot delete tender '{t_num}': it has {len(dependent_bids)} associated bid(s). "
                f"Delete the bids first or archive this tender instead."
            )

        for i, t in enumerate(SAMPLE_TENDERS):
            if (t.get("id") == tender_id
                or t.get("tender_number") == tender_id
                or t.get("ref") == tender_id
                or t.get("tender_id") == tender_id):
                SAMPLE_TENDERS.pop(i)
                return tender

        raise KeyError(f"Tender '{tender_id}' not found during removal.")

def get_bidder_profile(bidder_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the canonical profile for a bidder by bidder_id, user_id, or email.
    Single source of truth for bidder organization, contact, and statutory profile data.
    """
    if not bidder_id:
        return None
    if bidder_id in SAMPLE_BIDDER_PROFILES:
        return SAMPLE_BIDDER_PROFILES[bidder_id]
    for p in SAMPLE_BIDDER_PROFILES.values():
        if p.get("id") == bidder_id or p.get("user_id") == bidder_id or p.get("email") == bidder_id:
            return p
    for b in SAMPLE_BIDDERS:
        if b.get("id") == bidder_id or b.get("bidder_id") == bidder_id:
            return b
    return None

def update_bidder_profile(bidder_id: str, patch_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates or creates a bidder profile in the canonical profile store.
    Keeps user accounts synchronized.
    """
    profile = get_bidder_profile(bidder_id)
    if profile is None:
        profile = {
            "id": bidder_id,
            "user_id": bidder_id,
            "name": patch_data.get("name") or patch_data.get("company_name", "Vendor Organization"),
            "company_name": patch_data.get("company_name") or patch_data.get("name", "Vendor Organization"),
            "contact_person": patch_data.get("contact_person") or patch_data.get("name", "Authorized Signatory"),
            "email": patch_data.get("email", ""),
            "phone": patch_data.get("phone", ""),
            "entity_type": patch_data.get("entity_type", "Private Limited Company"),
            "business_address": patch_data.get("business_address", ""),
            "city": patch_data.get("city", ""),
            "state": patch_data.get("state", ""),
            "pincode": patch_data.get("pincode", ""),
            "pan": patch_data.get("pan", ""),
            "gstin": patch_data.get("gstin", ""),
            "udyam": patch_data.get("udyam", ""),
            "epfo_code": patch_data.get("epfo_code", ""),
            "business_registration_number": patch_data.get("business_registration_number", ""),
            "business_registration_date": patch_data.get("business_registration_date", ""),
            "annual_turnover_cr": float(patch_data.get("annual_turnover_cr", 0.0)),
            "years_experience": float(patch_data.get("years_experience", 0)),
            "oem_authorization": patch_data.get("oem_authorization", "Unregistered"),
            "local_content": float(patch_data.get("local_content", 0.0)),
            "emd_paid": patch_data.get("emd_paid", False),
            "status": patch_data.get("status", "REGISTERED"),
            "verification_status": patch_data.get("verification_status", "PENDING"),
            "documents": patch_data.get("documents", {})
        }
        SAMPLE_BIDDER_PROFILES[bidder_id] = profile
    else:
        profile.update(patch_data)
        bidder_key = profile.get("id") or bidder_id
        SAMPLE_BIDDER_PROFILES[bidder_key] = profile

    # Also keep SAMPLE_USERS synchronized if matching
    user_id = profile.get("user_id") or bidder_id
    for u in SAMPLE_USERS:
        if u.get("id") == user_id or u.get("bidder_id") == bidder_id or u.get("email") == profile.get("email"):
            if "contact_person" in patch_data or "name" in patch_data:
                u["name"] = patch_data.get("contact_person") or patch_data.get("name") or u["name"]
            if "company_name" in patch_data:
                u["organization"] = patch_data["company_name"]
            if "email" in patch_data:
                u["email"] = patch_data["email"]
            if "phone" in patch_data:
                u["phone"] = patch_data["phone"]
            break

    return profile

def get_bidder_by_id(bidder_id: str) -> Optional[Dict[str, Any]]:
    # First check profile store
    if bidder_id in SAMPLE_BIDDER_PROFILES:
        return SAMPLE_BIDDER_PROFILES[bidder_id]
    for p in SAMPLE_BIDDER_PROFILES.values():
        if p.get("id") == bidder_id or p.get("bid_submission_id") == bidder_id or p.get("user_id") == bidder_id:
            return p
    for b in SAMPLE_BIDDERS:
        if b.get("id") == bidder_id or b.get("bid_submission_id") == bidder_id or b.get("bidder_id") == bidder_id:
            return b
    return None

def add_bidder(bidder_data: Dict[str, Any]) -> Dict[str, Any]:
    b_id = bidder_data.get("id")
    if b_id:
        SAMPLE_BIDDER_PROFILES[b_id] = bidder_data
    SAMPLE_BIDDERS.append(bidder_data)
    return bidder_data

def get_bids_by_bidder_id(bidder_id: str) -> List[Dict[str, Any]]:
    return [b for b in SAMPLE_BIDDER_BIDS if b.get("bidder_id") == bidder_id]

def add_bid_for_bidder(bid_data: Dict[str, Any]) -> Dict[str, Any]:
    target_tender_id = bid_data.get("tender_id")
    target_tender_num = bid_data.get("tender_number")
    bidder_id = bid_data.get("bidder_id")
    is_draft = bid_data.get("is_draft") is True or bid_data.get("status") == "DRAFT"
    status_str = "DRAFT" if is_draft else bid_data.get("status", "SUBMITTED")

    tender_title = bid_data.get("tender_title")
    if not tender_title and target_tender_id:
        t_obj = get_tender_by_id(target_tender_id)
        if t_obj:
            tender_title = t_obj.get("title", "")
            if not target_tender_num:
                target_tender_num = t_obj.get("tender_number")
    bid_data["tender_title"] = tender_title or ""
    if target_tender_num:
        bid_data["tender_number"] = target_tender_num

    bidder_name = bid_data.get("name")
    if not bidder_name and bidder_id:
        b_profile = get_bidder_by_id(bidder_id)
        if b_profile:
            bidder_name = b_profile.get("name")
    bid_data["name"] = bidder_name or "Authorized Bidder"

    existing_bid_idx = -1
    for idx, b in enumerate(SAMPLE_BIDDER_BIDS):
        if b.get("id") == bid_data.get("id") or (
            b.get("bidder_id") == bidder_id and (
                (target_tender_id and b.get("tender_id") == target_tender_id) or
                (target_tender_num and b.get("tender_number") == target_tender_num)
            )
        ):
            existing_bid_idx = idx
            break

    if existing_bid_idx >= 0:
        SAMPLE_BIDDER_BIDS[existing_bid_idx].update(bid_data)
    else:
        SAMPLE_BIDDER_BIDS.append(bid_data)

    promoted = False
    for b in SAMPLE_BIDDERS:
        if (b.get("id") == bidder_id or b.get("bidder_id") == bidder_id) and (
            (target_tender_id and b.get("tender_id") == target_tender_id) or
            (target_tender_num and b.get("tender_number") == target_tender_num)
        ):
            b["status"] = status_str
            b["verification_status"] = "PENDING" if is_draft else bid_data.get("verification_status", "PROCESSING")
            b["compliance_status"] = "PENDING" if is_draft else bid_data.get("compliance_status", "REVIEW_REQUIRED")
            b["bid_amount"] = bid_data.get("bid_amount", b.get("bid_amount", "₹ 0"))
            b["tender_title"] = tender_title or b.get("tender_title", "")
            if not is_draft:
                b["submitted_at"] = bid_data.get("submission_date") or datetime.utcnow().isoformat() + "Z"
                b["is_draft"] = False
            else:
                b["is_draft"] = True
            promoted = True
            break

    if not promoted:
        submitted_ts = None if is_draft else (bid_data.get("submission_date") or datetime.utcnow().isoformat() + "Z")
        new_bidder_entry = {
            "id": bid_data.get("id") or f"BID-{len(SAMPLE_BIDDERS) + 1:03d}",
            "bid_submission_id": bid_data.get("bid_submission_id") or f"SUB-{target_tender_id}-{len(SAMPLE_BIDDERS) + 1}",
            "tender_id": target_tender_id,
            "tender_number": target_tender_num or target_tender_id,
            "tender_title": tender_title or "",
            "name": bid_data.get("name", "Authorized Bidder"),
            "contact_person": bid_data.get("contact_person", "Authorized Signatory"),
            "email": bid_data.get("email", "bidder@vendor.com"),
            "phone": bid_data.get("phone", "+91 98765 43210"),
            "location": bid_data.get("location", "Chennai, Tamil Nadu"),
            "bid_amount": bid_data.get("bid_amount", "₹ 0"),
            "gstin": bid_data.get("gstin", ""),
            "pan": bid_data.get("pan", ""),
            "udyam": bid_data.get("udyam", ""),
            "epfo_code": bid_data.get("epfo_code", ""),
            "annual_turnover_cr": float(bid_data.get("annual_turnover_cr", 0.0)),
            "years_experience": float(bid_data.get("years_experience", 0.0)),
            "experience_years": float(bid_data.get("years_experience", 0.0)),
            "oem_status": bid_data.get("oem_status", "Unregistered"),
            "local_content": float(bid_data.get("local_content", 0.0)),
            "local_content_pct": float(bid_data.get("local_content", 0.0)),
            "is_debarred": False,
            "emd_paid": not is_draft,
            "submitted_at": submitted_ts,
            "status": status_str,
            "verification_status": "PENDING" if is_draft else bid_data.get("verification_status", "PROCESSING"),
            "compliance_status": "PENDING" if is_draft else bid_data.get("compliance_status", "REVIEW_REQUIRED"),
            "compliance_score": 0.0 if is_draft else float(bid_data.get("compliance_score", 0.0)),
            "risk_level": "LOW",
            "summary": {"pass_count": 0, "fail_count": 0, "review_count": 0, "total": 0, "total_requirements": 0},
            "highlight_issue": "Draft submission in preparation by vendor." if is_draft else "Submitted via Bidder Self-Service Portal.",
            "documents": {},
            "is_draft": is_draft
        }
        SAMPLE_BIDDERS.append(new_bidder_entry)

    if not is_draft:
        add_audit_log({
            "user_email": bid_data.get("email", "bidder@vendor.com"),
            "user_role": "BIDDER",
            "action": "BID_SUBMISSION",
            "entity_type": "TENDER",
            "entity_id": target_tender_num or target_tender_id or "TENDER",
            "details": f"Formal bid submitted by {bid_data.get('name', 'Vendor')} for {tender_title or target_tender_num or target_tender_id} (Amount: {bid_data.get('bid_amount', 'N/A')}).",
            "status": "SUCCESS"
        })

    return bid_data

def get_recent_bid_activities(limit: int = 10) -> List[Dict[str, Any]]:
    submitted_bids = [b for b in SAMPLE_BIDDERS if is_submitted_bid(b)]
    sorted_bids = sorted(
        submitted_bids,
        key=lambda b: str(b.get("submitted_at") or ""),
        reverse=True
    )

    activities: List[Dict[str, Any]] = []
    for bid in sorted_bids[:limit]:
        tender_title = bid.get("tender_title")
        if not tender_title and bid.get("tender_id"):
            t_obj = get_tender_by_id(bid.get("tender_id"))
            if t_obj:
                tender_title = t_obj.get("title")

        bid_id = bid.get("id") or "BID"
        submitted_ts = bid.get("submitted_at") or datetime.utcnow().isoformat() + "Z"

        activities.append({
            "id": f"ACT-{bid_id}",
            "type": "BID_SUBMITTED",
            "bid_id": bid_id,
            "bid_submission_id": bid.get("bid_submission_id") or bid_id,
            "tender_id": bid.get("tender_id") or "",
            "tender_number": bid.get("tender_number") or bid.get("tender_id") or "",
            "tender_title": tender_title or "Procurement Tender",
            "bidder_id": bid.get("bidder_id") or bid_id,
            "bidder_name": bid.get("name") or "Vendor",
            "submitted_at": submitted_ts,
            "bid_amount": bid.get("bid_amount") or "N/A",
            "status": bid.get("status") or "SUBMITTED",
            "compliance_status": bid.get("compliance_status") or "REVIEW_REQUIRED",
            "compliance_score": bid.get("compliance_score", 0.0),
            "risk_level": bid.get("risk_level", "LOW")
        })

    return activities

def get_dashboard_stats() -> Dict[str, Any]:
    all_tenders = SAMPLE_TENDERS
    submitted_bidders = [b for b in SAMPLE_BIDDERS if is_submitted_bid(b)]

    total_tenders = len(all_tenders)
    active_tenders = len([t for t in all_tenders if t.get("status", "").upper() in ["PUBLISHED", "OPEN", "ACTIVE"]])

    total_bids = len(submitted_bidders)
    under_verification = len([b for b in submitted_bidders if b.get("status") in ["UNDER_VERIFICATION", "PROCESSING", "UNDER REVIEW"]])
    pending_review = len([b for b in submitted_bidders if b.get("compliance_status") in ["REQUIRES_REVIEW", "REVIEW_REQUIRED", "REVIEW"]])
    compliant_bids = len([b for b in submitted_bidders if b.get("compliance_status") == "COMPLIANT"])
    high_risk = len([b for b in submitted_bidders if b.get("risk_level") == "HIGH"])

    return {
        "active_tenders": active_tenders,
        "total_tenders": total_tenders,
        "total_bids": total_bids,
        "total_bidders": total_bids,
        "under_verification": under_verification,
        "pending_review": pending_review,
        "pending_reviews": pending_review,
        "compliant_bids": compliant_bids,
        "high_risk": high_risk
    }

def get_notifications_for_bidder(bidder_id: str) -> List[Dict[str, Any]]:
    notifs = [n for n in SAMPLE_NOTIFICATIONS if n.get("bidder_id") == bidder_id]
    if not notifs:
        return [
            {
                "id": f"NOTIF-NEW-{bidder_id}",
                "bidder_id": bidder_id,
                "title": "Welcome to BidSure AI",
                "message": "Your organization account is active. Complete your statutory document profile to apply for active tenders.",
                "timestamp": "Just now",
                "type": "SUCCESS",
                "read": False
            }
        ]
    return notifs

def get_all_audit_logs(query: Optional[str] = None) -> List[Dict[str, Any]]:
    if not query:
        return list(SAMPLE_AUDIT_LOGS)
    q = query.strip().lower()
    return [
        log for log in SAMPLE_AUDIT_LOGS
        if q in log.get("id", "").lower()
        or q in log.get("user_email", "").lower()
        or q in log.get("action", "").lower()
        or q in log.get("entity_id", "").lower()
        or q in log.get("details", "").lower()
    ]

def add_audit_log(entry: Dict[str, Any]) -> Dict[str, Any]:
    if not entry.get("id"):
        entry["id"] = f"LOG-{len(SAMPLE_AUDIT_LOGS) + 1:03d}"
    if not entry.get("timestamp"):
        entry["timestamp"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    if not entry.get("integrity_hash"):
        h_src = f"{entry.get('id')}:{entry.get('action')}:{entry.get('entity_id')}:{time.time()}"
        entry["integrity_hash"] = hashlib.sha256(h_src.encode()).hexdigest()
    if not entry.get("actor") and entry.get("user_email"):
        entry["actor"] = entry["user_email"]
    if not entry.get("target") and entry.get("entity_id"):
        entry["target"] = entry["entity_id"]
    SAMPLE_AUDIT_LOGS.insert(0, entry)
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# AI Tender Analysis & Document Intelligence In-Memory Store & Operations
# ─────────────────────────────────────────────────────────────────────────────
def create_analysis_job(job_dict: Dict[str, Any]) -> Dict[str, Any]:
    job_id = job_dict.get("job_id") or f"JOB-AI-{len(SAMPLE_ANALYSIS_JOBS) + 1:03d}"
    job_dict["job_id"] = job_id
    if not job_dict.get("created_at"):
        job_dict["created_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    SAMPLE_ANALYSIS_JOBS[job_id] = job_dict

    tender_id = job_dict.get("tender_id")
    if tender_id:
        SAMPLE_ANALYSIS_JOBS[str(tender_id)] = job_dict

    return job_dict

def get_analysis_job(job_id_or_tender_id: str) -> Optional[Dict[str, Any]]:
    if not job_id_or_tender_id:
        return None
    key = str(job_id_or_tender_id).strip()
    if key in SAMPLE_ANALYSIS_JOBS:
        return SAMPLE_ANALYSIS_JOBS[key]

    for job in SAMPLE_ANALYSIS_JOBS.values():
        if (
            job.get("job_id") == key
            or job.get("tender_id") == key
            or job.get("filename") == key
        ):
            return job
    return None

def verify_analysis_requirement(
    job_id_or_tender_id: str,
    req_id: str,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    reqs = job.get("requirements", [])
    target_req = None
    for r in reqs:
        if r.get("id") == req_id or r.get("code") == req_id:
            target_req = r
            break

    if not target_req:
        raise KeyError(f"Requirement '{req_id}' not found in analysis job.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    target_req["review_status"] = "VERIFIED"
    target_req["reviewed_by"] = officer_name
    target_req["reviewed_at"] = now_ts
    target_req["rejection_reason"] = None

    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_VERIFIED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{target_req.get('clause_reference') or req_id}",
        "details": f"Officer verified clause '{target_req.get('name')}' ({target_req.get('clause_reference')}) with {int(target_req.get('confidence', 1.0) * 100)}% AI confidence.",
        "status": "SUCCESS"
    })

    return target_req

def update_analysis_requirement(
    job_id_or_tender_id: str,
    req_id: str,
    update_payload: Dict[str, Any],
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    reqs = job.get("requirements", [])
    target_req = None
    for r in reqs:
        if r.get("id") == req_id or r.get("code") == req_id:
            target_req = r
            break

    if not target_req:
        raise KeyError(f"Requirement '{req_id}' not found in analysis job.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    if not target_req.get("original_data"):
        target_req["original_data"] = {
            "name": target_req.get("name"),
            "clause_reference": target_req.get("clause_reference"),
            "category": target_req.get("category"),
            "threshold_value": target_req.get("threshold_value"),
            "unit": target_req.get("unit"),
            "mandatory": target_req.get("mandatory"),
            "description": target_req.get("description")
        }

    for field in ["name", "clause_reference", "category", "mandatory", "description", "threshold_value", "unit", "weight"]:
        if field in update_payload and update_payload[field] is not None:
            target_req[field] = update_payload[field]

    target_req["review_status"] = "EDITED"
    target_req["reviewed_by"] = officer_name
    target_req["reviewed_at"] = now_ts
    target_req["rejection_reason"] = None

    edit_reason = update_payload.get("edit_reason") or "Officer modified extracted threshold/details."
    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_EDITED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{target_req.get('clause_reference') or req_id}",
        "details": f"Officer edited requirement '{target_req.get('name')}'. Justification: {edit_reason}",
        "status": "SUCCESS"
    })

    return target_req

def reject_analysis_requirement(
    job_id_or_tender_id: str,
    req_id: str,
    reason: str,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    if not reason or len(reason.strip()) < 3:
        raise ValueError("A formal rejection reason (minimum 3 characters) is required.")

    reqs = job.get("requirements", [])
    target_req = None
    for r in reqs:
        if r.get("id") == req_id or r.get("code") == req_id:
            target_req = r
            break

    if not target_req:
        raise KeyError(f"Requirement '{req_id}' not found in analysis job.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    target_req["review_status"] = "REJECTED"
    target_req["rejection_reason"] = reason.strip()
    target_req["reviewed_by"] = officer_name
    target_req["reviewed_at"] = now_ts

    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_REJECTED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{target_req.get('clause_reference') or req_id}",
        "details": f"Officer excluded/rejected clause '{target_req.get('name')}' ({target_req.get('clause_reference')}). Reason: {reason.strip()}",
        "status": "SUCCESS"
    })

    return target_req

def add_analysis_requirement(
    job_id_or_tender_id: str,
    req_data: Dict[str, Any],
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    if not job.get("requirements"):
        job["requirements"] = []

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    seq = len(job["requirements"]) + 1
    new_req = {
        "id": f"REQ-MAN-{seq:03d}",
        "code": req_data.get("code") or f"CUSTOM_REQ_{seq}",
        "clause_reference": req_data.get("clause_reference", f"Clause Special-{seq}"),
        "name": req_data.get("name", "Custom Requirement"),
        "category": req_data.get("category", "TECHNICAL"),
        "type": req_data.get("type", "GENERAL"),
        "mandatory": bool(req_data.get("mandatory", True)),
        "description": req_data.get("description", ""),
        "threshold_value": req_data.get("threshold_value", 1),
        "unit": req_data.get("unit"),
        "confidence": 1.0,
        "review_status": "ADDED_MANUALLY",
        "source_document": job.get("filename", "Manual_Addition.pdf"),
        "source_page": req_data.get("source_page", 1),
        "evidence_text": req_data.get("description", "Manually inserted by procurement officer."),
        "validation_source": req_data.get("validation_source", "Manual Tender Clause Addition"),
        "weight": req_data.get("weight", 10),
        "reviewed_by": officer_name,
        "reviewed_at": now_ts
    }

    job["requirements"].append(new_req)

    t_ref = job.get("tender_id") or job.get("filename") or "TENDER"
    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENT_ADDED",
        "entity_type": "REQUIREMENT",
        "entity_id": f"{t_ref}:{new_req.get('clause_reference')}",
        "details": f"Officer manually added new requirement '{new_req.get('name')}' ({new_req.get('clause_reference')}).",
        "status": "SUCCESS"
    })

    return new_req

def finalize_tender_requirements(
    job_id_or_tender_id: str,
    target_tender_id: Optional[str] = None,
    override_existing: bool = True,
    officer_user: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    job = get_analysis_job(job_id_or_tender_id)
    if not job:
        raise KeyError(f"Analysis job '{job_id_or_tender_id}' not found.")

    tid = target_tender_id or job.get("tender_id")
    if not tid:
        raise KeyError("No target tender ID associated with this analysis job.")

    tender = get_tender_by_id(tid)
    if not tender:
        raise KeyError(f"Target tender '{tid}' not found in registry.")

    officer_name = (officer_user.get("name") if officer_user else None) or "Procurement Officer"
    officer_email = (officer_user.get("email") if officer_user else None) or "officer@cpcl.gov.in"
    officer_role = (officer_user.get("role") if officer_user else None) or "PROCUREMENT_OFFICER"
    now_ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Filter out REJECTED requirements
    active_reqs = [
        r for r in job.get("requirements", [])
        if r.get("review_status") != "REJECTED"
    ]

    converted_reqs = []
    for r in active_reqs:
        converted_reqs.append({
            "id": r.get("id"),
            "code": r.get("code", r.get("id")),
            "clause_reference": r.get("clause_reference"),
            "clause": r.get("clause_reference"),
            "title": r.get("name"),
            "name": r.get("name"),
            "category": r.get("category"),
            "type": r.get("category"),
            "mandatory": r.get("mandatory", True),
            "description": r.get("description"),
            "threshold_value": r.get("threshold_value"),
            "threshold": r.get("threshold_value"),
            "unit": r.get("unit"),
            "scoring_weight": r.get("weight", 10),
            "weight": r.get("weight", 10),
            "confidence": r.get("confidence", 1.0),
            "review_status": r.get("review_status", "VERIFIED"),
            "source_document": r.get("source_document"),
            "source_page": r.get("source_page", 1),
            "evidence_text": r.get("evidence_text"),
            "validation_source": r.get("validation_source", "Tender Document Analysis")
        })

    with _tender_number_lock:
        if override_existing:
            tender["requirements"] = converted_reqs
        else:
            tender["requirements"] = (tender.get("requirements") or []) + converted_reqs

        tender["requirements_count"] = len(tender["requirements"])
        tender["total_requirements_count"] = len(tender["requirements"])
        tender["is_analyzed"] = True
        tender["requirements_finalized_at"] = now_ts
        tender["requirements_finalized_by"] = officer_name

        for idx, t in enumerate(SAMPLE_TENDERS):
            if t.get("id") == tender.get("id") or t.get("tender_number") == tender.get("tender_number"):
                SAMPLE_TENDERS[idx] = tender
                break

    add_audit_log({
        "user_email": officer_email,
        "user_role": officer_role,
        "action": "TENDER_REQUIREMENTS_FINALIZED",
        "entity_type": "TENDER",
        "entity_id": tender.get("tender_number") or tender.get("id"),
        "details": f"Officer finalized {len(converted_reqs)} evaluation criteria for tender {tender.get('tender_number') or tender.get('id')}. Evaluation engine updated.",
        "status": "SUCCESS"
    })

    return {
        "tender_id": tender.get("id"),
        "tender_number": tender.get("tender_number"),
        "requirements_count": len(converted_reqs),
        "requirements": converted_reqs,
        "finalized_at": now_ts,
        "finalized_by": officer_name,
        "message": f"Successfully finalized {len(converted_reqs)} evaluation criteria for {tender.get('tender_number') or tender.get('id')}."
    }


# ─────────────────────────────────────────────────────────────────────────────
# Environment State Management Utilities
# ─────────────────────────────────────────────────────────────────────────────
def is_demo_mode() -> bool:
    """Returns whether the centralized DEMO_MODE toggle is active."""
    return DEMO_MODE

def reset_to_demo_data() -> None:
    """Resets operational stores."""
    clear_all_procurement_data()

def clear_all_procurement_data() -> None:
    """
    Resets all operational procurement records (tenders, tender bids, logs)
    to empty state while keeping authenticated officer credentials and bidder profiles intact.
    """
    global SAMPLE_TENDERS, SAMPLE_BIDDERS, SAMPLE_BIDDER_BIDS, SAMPLE_AUDIT_LOGS, SAMPLE_NOTIFICATIONS, SAMPLE_ANALYSIS_JOBS, SAMPLE_BIDDER_PROFILES
    with _tender_number_lock:
        SAMPLE_TENDERS.clear()
        SAMPLE_BIDDERS.clear()
        SAMPLE_BIDDER_BIDS.clear()
        SAMPLE_AUDIT_LOGS.clear()
        SAMPLE_NOTIFICATIONS.clear()
        SAMPLE_ANALYSIS_JOBS.clear()
        SAMPLE_BIDDER_PROFILES = copy.deepcopy(SEED_BIDDER_PROFILES)
