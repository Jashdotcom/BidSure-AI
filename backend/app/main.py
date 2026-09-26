"""
BidSure AI - Main FastAPI Application
Smart India Hackathon 2024 / SIH26100 - CPCL
Automated Bid Evaluation & Statutory Compliance Verification System
"""
from app.config import load_project_env, settings
load_project_env()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from app.api import (
    auth_router,
    tenders_router,
    bidders_router,
    compliance_router,
    reports_router,
    audit_router,
    bidder_portal_router,
    dashboard_router
)
from app.data.sample_data import is_demo_mode
from app.services.ai_providers import get_ai_provider

app = FastAPI(
    title="BidSure AI - CPCL Tender Evaluation API",
    description="Intelligent, deterministic, and audit-compliant bid evaluation system for Chennai Petroleum Corporation Limited.",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers (Direct Mount)
app.include_router(auth_router)
app.include_router(tenders_router)
app.include_router(bidders_router)
app.include_router(compliance_router)
app.include_router(reports_router)
app.include_router(audit_router)
app.include_router(bidder_portal_router)
app.include_router(dashboard_router)

# Include API Routers with /api prefix for proxy compatibility
app.include_router(auth_router, prefix="/api")
app.include_router(tenders_router, prefix="/api")
app.include_router(bidders_router, prefix="/api")
app.include_router(compliance_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(bidder_portal_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """
    Initializes document store and ensures the authentic 17-page IITG NIT test tender
    (Tendernotice_1.pdf) is seeded for real document processing and officer review.
    """
    print("[STARTUP] BidSure AI backend startup initiated...")
    try:
        from app.data.document_store import ensure_seed_documents
        from app.data.sample_data import get_all_tenders, add_tender
        print("[STARTUP] Ensuring seed documents in document store...")
        seed_docs = ensure_seed_documents()
        print(f"[STARTUP] Document store initialized with {len(seed_docs)} seed document(s).")
        existing_tenders = get_all_tenders()
        if not any(
            t.get("tender_number") == "2026_IITG_925833_1"
            or t.get("id") == "2026_IITG_925833_1"
            or t.get("tender_id") == "2026_IITG_925833_1"
            for t in existing_tenders
        ):
            print("[STARTUP] Seeding IITG Next Gen Firewall Tender (2026_IITG_925833_1)...")
            doc_hash = seed_docs[0].get("document_hash_sha256") if seed_docs else ""
            add_tender({
                "id": "2026_IITG_925833_1",
                "tender_number": "2026_IITG_925833_1",
                "ref": "EPT/SNP/CC/EQT-26.1130",
                "tender_id": "2026_IITG_925833_1",
                "title": "Supply and installation of Next Generation Firewall Solution at IIT Guwahati",
                "organization": "Indian Institute of Technology Guwahati",
                "department": "Central Procurement & Stores Division",
                "category": "IT Hardware & Software",
                "status": "PUBLISHED",
                "estimated_value": 55000000.0,
                "estimated_value_display": "₹ 5,50,00,000",
                "emd_amount": 1100000.0,
                "emd_amount_display": "₹ 11,00,000",
                "publish_date": "2026-09-15T09:00:00Z",
                "closing_date": "2026-10-15T18:00:00Z",
                "deadline": "15 Oct 2026",
                "bid_opening_date": "2026-10-16T15:00:00Z",
                "description": "Notice Inviting Tender for supply, installation, testing, and commissioning of Enterprise Next Generation Firewall Solution at IIT Guwahati.",
                "file_name": "Tendernotice_1.pdf",
                "document_hash_sha256": doc_hash,
                "source_type": "OFFICER_UPLOAD",
                "documents": seed_docs or [],
                "requirements": [],
                "bids_count": 0,
                "verified_count": 0
            })
            print("[STARTUP] Seed tender 2026_IITG_925833_1 registered successfully.")
    except Exception as e:
        print(f"[STARTUP WARNING] Startup initialization encountered non-fatal error: {e}")
    print("[STARTUP] BidSure AI backend startup completed successfully.")


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "BidSure AI Core Backend",
        "security_mode": "JWT Role-Enforced"
    }

@app.get("/system/config", tags=["System"])
@app.get("/api/system/config", tags=["System"])
async def get_system_config():
    provider = get_ai_provider()
    health = await provider.health_check()
    return {
        "demo_mode": is_demo_mode(),
        "ai_provider": provider.provider_name(),
        "ai_model": provider.model_name(),
        "ai_status": health.get("status", "unknown"),
        "ai_message": health.get("message", ""),
        "service": "BidSure AI Core Backend",
        "version": "1.0.0"
    }

@app.get("/system/ai-status", tags=["System"])
@app.get("/api/system/ai-status", tags=["System"])
async def get_ai_status():
    provider = get_ai_provider()
    health = await provider.health_check()
    return {
        "provider": provider.provider_name(),
        "model": provider.model_name(),
        "status": health.get("status", "unknown"),
        "message": health.get("message", ""),
        "base_url": getattr(provider, "_base_url", None),
        "demo_mode": is_demo_mode(),
    }

@app.get("/", tags=["Root"])
@app.get("/api", tags=["Root"])
async def root():
    return {
        "message": "Welcome to BidSure AI API (SIH26100 - CPCL)",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
