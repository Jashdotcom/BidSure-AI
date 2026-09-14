from .auth import router as auth_router
from .tenders import router as tenders_router
from .bidders import router as bidders_router
from .compliance import router as compliance_router
from .reports import router as reports_router
from .audit import router as audit_router
from .bidder_portal import router as bidder_portal_router
from .dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "tenders_router",
    "bidders_router",
    "compliance_router",
    "reports_router",
    "audit_router",
    "bidder_portal_router",
    "dashboard_router"
]
