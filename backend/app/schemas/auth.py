from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterBidderRequest(BaseModel):
    full_name: str = Field(..., description="Full Name of the authorized representative")
    company_name: str = Field(..., description="Registered entity name")
    email: str = Field(..., description="Official contact email")
    phone: str = Field(..., description="Primary contact phone number")
    password: str = Field(..., min_length=6, description="Account password")
    confirm_password: str = Field(..., min_length=6, description="Confirm account password")
    gstin: str = Field(..., description="Goods and Services Tax Identification Number")
    pan: str = Field(..., description="Permanent Account Number")
    udyam: str = Field(..., description="MSME Udyam Registration Number")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    organization: str
    department: Optional[str] = None
    designation: Optional[str] = None
    bidder_id: Optional[str] = None
