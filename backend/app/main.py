"""
BidSure AI - Main FastAPI Application
Smart India Hackathon 2024 / SIH26100 - CPCL
Automated Bid Evaluation & Statutory Compliance Verification System
"""
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
    bidder_portal_router
)

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

# Include API Routers with /api prefix for proxy compatibility
app.include_router(auth_router, prefix="/api")
app.include_router(tenders_router, prefix="/api")
app.include_router(bidders_router, prefix="/api")
app.include_router(compliance_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(bidder_portal_router, prefix="/api")

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "BidSure AI Core Backend",
        "security_mode": "JWT Role-Enforced"
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
