"""
BidSure AI Backend Schemas Module
"""
from .auth import LoginRequest, RegisterBidderRequest, TokenResponse, UserResponse
from .tender import (
    RequirementSchema,
    RequirementCreateSchema,
    RequirementUpdateSchema,
    TenderDetailSchema,
    TenderAnalysisResponseSchema,
    TenderUploadResponseSchema,
)
from .compliance import EvidenceItemSchema, SummarySchema, ComplianceResultSchema

__all__ = [
    "LoginRequest",
    "RegisterBidderRequest",
    "TokenResponse",
    "UserResponse",
    "RequirementSchema",
    "RequirementCreateSchema",
    "RequirementUpdateSchema",
    "TenderDetailSchema",
    "TenderAnalysisResponseSchema",
    "TenderUploadResponseSchema",
    "EvidenceItemSchema",
    "SummarySchema",
    "ComplianceResultSchema",
]
