"""
OCR and Document Ingestion Service
Extracts text and structured tables from scanned tender PDFs, bidder work orders, and financial statements.
"""
from typing import Dict, Any, Optional

class OCRService:
    def __init__(self):
        pass

    async def process_document(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Simulates high-precision OCR extraction for uploaded PDF / scanned images.
        """
        clean_name = filename.lower()
        if "tender" in clean_name or "nit" in clean_name:
            doc_type = "TENDER_NOTICE"
            extracted_text = "CHENNAI PETROLEUM CORPORATION LIMITED (CPCL)\nNOTICE INVITING TENDER\nTender No: CPCL/PROC/SAFETY/2024/09\nSupply of Industrial Safety Equipment..."
        elif "balance" in clean_name or "financial" in clean_name:
            doc_type = "FINANCIAL_AUDIT"
            extracted_text = "INDEPENDENT AUDITOR'S REPORT\nAnnual Turnover for FY 2023-24: ₹4,50,00,000 /-\nNet Worth: Positive..."
        elif "udyam" in clean_name or "msme" in clean_name:
            doc_type = "MSME_CERTIFICATE"
            extracted_text = "UDYAM REGISTRATION CERTIFICATE\nUdyam Reg No: UDYAM-TN-02-0012345\nType: Small Enterprise..."
        else:
            doc_type = "GENERAL_COMPLIANCE_EVIDENCE"
            extracted_text = f"Extracted contents from {filename} with 99.4% OCR confidence."

        return {
            "filename": filename,
            "document_type": doc_type,
            "ocr_confidence": 0.994,
            "extracted_text": extracted_text,
            "page_count": 12
        }
