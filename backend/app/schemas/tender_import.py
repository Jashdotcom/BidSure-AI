from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any

class TenderImportSchema(BaseModel):
    source_url: Optional[HttpUrl] = Field(None, description="URL of the tender document from CPPP/eProcurement")
    manual_upload: Optional[bool] = Field(False, description="Flag indicating if this is a manual file upload")
    tender_number: Optional[str] = Field(None, description="Optional forced tender number")
    title: Optional[str] = Field(None, description="Title if overriding from CPPP source")
    estimated_value: Optional[float] = Field(None, description="Estimated value override")
