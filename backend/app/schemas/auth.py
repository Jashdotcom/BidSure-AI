from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    email: str
    password: str

class SendOTPRequest(BaseModel):
    email: str = Field(..., description="Email address to send OTP")

class VerifyOTPRequest(BaseModel):
    email: str = Field(..., description="Email address")
    otp_code: str = Field(..., description="6-digit OTP code")

class RegisterBidderRequest(BaseModel):
    # Account Holder / Contact Person
    full_name: str = Field(..., description="Full Name of the authorized representative")
    email: str = Field(..., description="Official contact email")
    phone: str = Field(..., description="Primary contact phone number")
    password: str = Field(..., min_length=6, description="Account password")
    confirm_password: str = Field(..., min_length=6, description="Confirm account password")

    # Business / Company Details
    company_name: str = Field(..., description="Legal Business Name / Company Name")
    entity_type: str = Field(default="Private Limited Company", description="Entity Type")
    business_address: str = Field(default="", description="Registered Business Address")
    city: str = Field(default="", description="City")
    state: str = Field(default="", description="State")
    pincode: str = Field(default="", description="Pincode")

    # Statutory Credentials (Belonging to Business/Entity)
    pan: str = Field(..., description="Company / Business PAN")
    gstin: str = Field(..., description="Business GSTIN")
    udyam: Optional[str] = Field(default="", description="Business Udyam Registration Number")
    business_registration_number: Optional[str] = Field(default="", description="Business Registration / Incorporation Number")
    business_registration_date: Optional[str] = Field(default="", description="Business Registration Date")
    otp_verified: Optional[bool] = Field(default=False, description="Whether email OTP was verified")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    verification_summary: Optional[Dict[str, Any]] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    organization: str
    department: Optional[str] = None
    designation: Optional[str] = None
    bidder_id: Optional[str] = None
