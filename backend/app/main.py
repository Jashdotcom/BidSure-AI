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
    officer_portal_router,
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
app.include_router(officer_portal_router)
app.include_router(dashboard_router)

# Include API Routers with /api prefix for proxy compatibility
app.include_router(auth_router, prefix="/api")
app.include_router(tenders_router, prefix="/api")
app.include_router(bidders_router, prefix="/api")
app.include_router(compliance_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(bidder_portal_router, prefix="/api")
app.include_router(officer_portal_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """
    Initializes document store and infrastructure.
    """
    print("[STARTUP] BidSure AI backend startup initiated...")
    try:
        from app.data.document_store import ensure_seed_documents
        print("[STARTUP] Ensuring seed documents in document store...")
        seed_docs = ensure_seed_documents()
        print(f"[STARTUP] Document store initialized with {len(seed_docs)} seed document(s).")
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
        "base_url": getattr(provider, "_resolved_base_url", None) or getattr(provider, "_base_url", None),
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
