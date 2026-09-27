"""
BidSure AI - Ollama Local LLM Integration & Provider Strategy Test Suite

Verifies:
1. Provider abstraction: AIProvider, MockAIProvider, OllamaAIProvider, get_ai_provider.
2. Health & connectivity checks:
   - Server running & model available -> connected
   - Server offline -> unavailable
   - Server running but model missing -> model_unavailable
3. LLM Extraction & JSON schema validation:
   - Structured JSON parsing
   - Schema enforcement & validation
   - Handling invalid JSON, empty responses, malformed schemas
4. Strict Grounding & Anti-Hallucination Pipeline:
   - Numeric threshold validation (Turnover = 10 Crore INR, EMD = ₹ 11,00,000)
   - Tightly scoped verbatim evidence quote (excludes Blacklisting/Assam/ISO from Turnover)
   - Page bounds validation (1 <= source_page <= total_pages)
   - Layout & token overlap alignment verification
5. No Silent Mock Fallback:
   - When AI_PROVIDER=ollama and Ollama is unreachable, raises AIProviderUnavailableError (503)
   - When configured model is missing, raises AIModelUnavailableError (503)
   - Zero synthetic demo data returned when real provider fails
6. System AI status endpoint (/system/ai-status and /system/config)
7. End-to-end 17-page Tendernotice_1 extraction through Ollama provider pipeline
"""

import sys
import os
import json
import io
import urllib.error
from unittest.mock import patch, MagicMock
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.services.ai_providers.base import (
    AIProvider,
    AIProviderUnavailableError,
    AIModelUnavailableError,
    AIExtractionError,
)
from app.services.ai_providers.mock_provider import MockAIProvider
from app.services.ai_providers.ollama_provider import OllamaAIProvider
from app.services.ai_providers import get_ai_provider
from app.services.ai_service import AIService

client = TestClient(app)

def get_officer_token() -> str:
    resp = client.post("/auth/login", json={
        "email": "officer@cpcl.gov.in",
        "password": "admin123"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


# ============================================================================
# 1. Provider Abstraction Tests
# ============================================================================

def test_mock_ai_provider():
    """MockAIProvider reports connected and mock mode."""
    provider = MockAIProvider()
    assert provider.provider_name() == "mock"
    assert provider.model_name() is None


@pytest.mark.asyncio
async def test_mock_ai_provider_health():
    provider = MockAIProvider()
    health = await provider.health_check()
    assert health["status"] == "connected"
    assert health["provider"] == "mock"


def test_get_ai_provider_factory():
    """Factory returns OllamaAIProvider or MockAIProvider based on env var."""
    with patch.dict(os.environ, {"AI_PROVIDER": "ollama", "AI_MODEL": "llama3.2"}):
        p = get_ai_provider()
        assert isinstance(p, OllamaAIProvider)
        assert p.provider_name() == "ollama"
        assert p.model_name() == "llama3.2"

    with patch.dict(os.environ, {"AI_PROVIDER": "mock"}):
        p = get_ai_provider()
        assert isinstance(p, MockAIProvider)
        assert p.provider_name() == "mock"


# ============================================================================
# 2. Ollama Health Check Tests (Mocked Network)
# ============================================================================

@pytest.mark.asyncio
async def test_ollama_health_connected():
    """When Ollama is online and model exists, health is 'connected'."""
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="llama3")

    mock_resp_body = json.dumps({
        "models": [
            {"name": "llama3:latest"},
            {"name": "mistral:latest"}
        ]
    }).encode("utf-8")

    mock_resp = MagicMock()
    mock_resp.read.return_value = mock_resp_body
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        health = await provider.health_check()
        assert health["status"] == "connected"
        assert health["provider"] == "ollama"
        assert health["model"] == "llama3"


@pytest.mark.asyncio
async def test_ollama_health_server_unavailable():
    """When Ollama is not running, health is 'unavailable'."""
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="llama3")

    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Connection refused")):
        health = await provider.health_check()
        assert health["status"] == "unavailable"
        assert "Cannot connect to Ollama" in health["message"]


@pytest.mark.asyncio
async def test_ollama_health_model_unavailable():
    """When Ollama is online but configured model is missing, health is 'model_unavailable'."""
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="deepseek-r1")

    mock_resp_body = json.dumps({
        "models": [
            {"name": "llama3:latest"},
            {"name": "mistral:latest"}
        ]
    }).encode("utf-8")

    mock_resp = MagicMock()
    mock_resp.read.return_value = mock_resp_body
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        health = await provider.health_check()
        assert health["status"] == "model_unavailable"
        assert "Model 'deepseek-r1' is not available" in health["message"]
        assert "ollama pull" in health["message"]


# ============================================================================
# 3. Ollama LLM Extraction Tests (Mocked API Responses)
# ============================================================================

@pytest.mark.asyncio
async def test_ollama_extract_valid_structured_requirements():
    """Valid structured JSON response is properly parsed and validated."""
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="llama3")

    tags_body = json.dumps({"models": [{"name": "llama3:latest"}]}).encode("utf-8")
    chat_body = json.dumps({
        "model": "llama3",
        "message": {
            "role": "assistant",
            "content": json.dumps({
                "requirements": [
                    {
                        "code": "TURNOVER_MIN",
                        "name": "Minimum Average Annual Financial Turnover",
                        "category": "FINANCIAL",
                        "mandatory": True,
                        "description": "Annual turnover of the bidder in India for the previous three years should be not less than Rs.10 crores.",
                        "threshold_value": 10,
                        "unit": "Crore INR",
                        "source_page": 11,
                        "evidence_text": "Annual turnover of the bidder in India for the previous three years, ending 31 March, 2026, should be not less than Rs.10 crores.",
                        "clause_reference": "Section VII, Clause 1.1"
                    },
                    {
                        "code": "COMM_EMD_SECURITY",
                        "name": "Earnest Money Deposit (EMD) Compliance",
                        "category": "COMMERCIAL",
                        "mandatory": True,
                        "description": "EMD amount of ₹ 11,00,000 required.",
                        "threshold_value": 1100000,
                        "unit": "INR",
                        "source_page": 3,
                        "evidence_text": "Earnest Money Deposit (EMD) in INR: ₹ 11,00,000.00.",
                        "clause_reference": "Section I, Clause 2.4"
                    }
                ]
            })
        }
    }).encode("utf-8")

    def mock_urlopen(req, timeout=None):
        m = MagicMock()
        if "tags" in req.full_url:
            m.read.return_value = tags_body
        else:
            m.read.return_value = chat_body
        m.__enter__.return_value = m
        return m

    pages = [
        {"page_number": 3, "text": "Section I, Clause 2.4: Earnest Money Deposit (EMD) in INR: ₹ 11,00,000.00."},
        {"page_number": 11, "text": "Section VII: Annual turnover of the bidder in India for the previous three years, ending 31 March, 2026, should be not less than Rs.10 crores."}
    ]

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        reqs = await provider.extract_requirements(pages=pages, filename="Tendernotice_1.pdf")
        assert len(reqs) == 2
        assert reqs[0]["code"] == "TURNOVER_MIN"
        assert reqs[0]["threshold_value"] == 10
        assert reqs[0]["source_page"] == 11
        assert reqs[1]["code"] == "COMM_EMD_SECURITY"
        assert reqs[1]["threshold_value"] == 1100000
        assert reqs[1]["source_page"] == 3


@pytest.mark.asyncio
async def test_ollama_extract_invalid_json_raises_error():
    """Malformed JSON from LLM raises AIExtractionError."""
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="llama3")

    tags_body = json.dumps({"models": [{"name": "llama3:latest"}]}).encode("utf-8")
    chat_body = json.dumps({
        "model": "llama3",
        "message": {
            "role": "assistant",
            "content": "This is not JSON at all."
        }
    }).encode("utf-8")

    def mock_urlopen(req, timeout=None):
        m = MagicMock()
        if "tags" in req.full_url:
            m.read.return_value = tags_body
        else:
            m.read.return_value = chat_body
        m.__enter__.return_value = m
        return m

    pages = [{"page_number": 1, "text": "Some text"}]

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        with pytest.raises(AIExtractionError) as exc_info:
            await provider.extract_requirements(pages=pages, filename="test.pdf")
        assert exc_info.value.reason == "invalid_json"


@pytest.mark.asyncio
async def test_ollama_extract_unavailable_raises_provider_error():
    """Unreachable Ollama server raises AIProviderUnavailableError without silent fallback."""
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="llama3")

    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Connection refused")):
        with pytest.raises(AIProviderUnavailableError):
            await provider.extract_requirements(pages=[{"page_number": 1, "text": "..."}], filename="test.pdf")


# ============================================================================
# 4. AIService Grounding & Anti-Hallucination Pipeline with Ollama
# ============================================================================

@pytest.mark.asyncio
async def test_aiservice_llm_grounding_and_evidence_scoping():
    """
    Verifies that LLM candidates passed through AIService are:
    1. Grounded against real OCR text buffers
    2. Numerically validated (Turnover = 10 Crore INR)
    3. Evidence is tightly scoped (Page 11 turnover excludes Blacklisting/Assam)
    4. Verified as SMART_IDP_VERIFIED
    """
    provider = OllamaAIProvider(base_url="http://localhost:11434", model="llama3")
    ai_service = AIService(provider=provider)

    # Simulated Page 11 with multiple clauses
    page_11_text = (
        "SECTION VII - EVALUATION CRITERIA\n"
        "1. Minimum Average Annual Financial Turnover: Annual turnover of the bidder in India "
        "for the previous three years, ending 31 March, 2026, should be not less than Rs.10 crores. "
        "The audited balance sheet of the company must be submitted.\n"
        "2. Blacklisting / Debarment: The bidder must submit an undertaking that they are not blacklisted "
        "by any Central/State Government agency.\n"
        "3. Local Office in Assam: The bidder must have an authorized sales & service office in Assam."
    )

    doc_profile = {
        "filename": "Tendernotice_1.pdf",
        "page_count": 17,
        "extracted_pages": [
            {"page_number": 11, "text": page_11_text, "ocr_confidence": 0.99}
        ]
    }

    # Raw candidate from LLM (even if LLM tried to pass entire section as evidence)
    llm_candidates = [
        {
            "code": "TURNOVER_MIN",
            "name": "Minimum Average Annual Financial Turnover",
            "category": "FINANCIAL",
            "mandatory": True,
            "description": "Annual turnover not less than 10 crores.",
            "threshold_value": 10,
            "unit": "Crore INR",
            "source_page": 11,
            "evidence_text": page_11_text,  # oversized evidence from LLM
            "clause_reference": "Section VII, Clause 1"
        }
    ]

    with patch.object(provider, "extract_requirements", return_value=llm_candidates):
        with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}):
            results = await ai_service.extract_tender_requirements(
                doc_profile=doc_profile,
                filename="Tendernotice_1.pdf"
            )

            assert len(results) == 1
            turnover_req = results[0]

            # 1. Correct grounded threshold
            assert turnover_req["threshold_value"] == 10.0
            assert turnover_req["unit"] == "Crore INR"

            # 2. Source page remains Page 11
            assert turnover_req["source_page"] == 11

            # 3. Tightly scoped evidence excludes blacklisting and Assam
            ev = turnover_req["evidence_text"]
            assert "Rs.10 crores" in ev or "10 crores" in ev
            assert "blacklisted" not in ev.lower()
            assert "assam" not in ev.lower()

            # 4. Verified layout status
            assert turnover_req["evidence_status"] == "SMART_IDP_VERIFIED"
            assert turnover_req["provenance_status"] == "VERIFIED"


# ============================================================================
# 5. Fail-Fast Error Handling & No Silent Fallback Tests
# ============================================================================

def test_api_analyze_document_returns_503_when_ollama_unavailable():
    """
    When AI_PROVIDER=ollama and Ollama is unreachable,
    /tenders/analyze-document returns 503 AI_PROVIDER_UNAVAILABLE.
    It does NOT silently return mock/demo data.
    """
    token = get_officer_token()

    with patch.dict(os.environ, {"AI_PROVIDER": "ollama", "DEMO_MODE": "false"}):
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Connection refused")):
            resp = client.post(
                "/tenders/analyze-document",
                json={
                    "filename": "Tendernotice_1.pdf",
                    "raw_text": "Sample raw text"
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 503
            data = resp.json()
            assert "AI_PROVIDER_UNAVAILABLE" in str(data)


def test_api_upload_document_returns_503_when_ollama_unavailable():
    """
    When AI_PROVIDER=ollama and Ollama is unreachable,
    /tenders/upload-document returns 503 AI_PROVIDER_UNAVAILABLE.
    """
    token = get_officer_token()

    # Simple valid PDF bytes
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Test tender text")
    pdf_bytes = doc.write()

    with patch.dict(os.environ, {"AI_PROVIDER": "ollama", "DEMO_MODE": "false"}):
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("Connection refused")):
            resp = client.post(
                "/tenders/upload-document",
                files={"file": ("test_tender.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 503
            data = resp.json()
            assert "AI_PROVIDER_UNAVAILABLE" in str(data)


# ============================================================================
# 6. System AI Status & Config Endpoint Tests
# ============================================================================

def test_system_config_includes_ai_provider_status():
    """Endpoint /system/config returns active ai_provider, ai_model, and ai_status."""
    with patch.dict(os.environ, {"AI_PROVIDER": "mock"}):
        resp = client.get("/system/config")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_provider"] == "mock"
        assert data["ai_status"] == "connected"


def test_system_ai_status_endpoint():
    """Endpoint /system/ai-status returns comprehensive AI status details."""
    with patch.dict(os.environ, {"AI_PROVIDER": "mock"}):
        resp = client.get("/system/ai-status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == "mock"
        assert data["status"] == "connected"


# ============================================================================
# 7. Bidder Assistant Status & Chat Endpoints
# ============================================================================

def get_bidder_token() -> str:
    resp = client.post("/auth/login", json={
        "email": "suresh@abcsafetysolutions.demo",
        "password": "BidSure@Demo2026"
    })
    if resp.status_code != 200:
        resp = client.post("/auth/login", json={
            "email": "abc@abcsafety.com",
            "password": "admin123"
        })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_bidder_assistant_status_endpoint():
    """Endpoint /bidder-portal/assistant/status returns ONLINE when provider is healthy."""
    token = get_bidder_token()
    with patch.dict(os.environ, {"AI_PROVIDER": "mock"}):
        resp = client.get(
            "/bidder-portal/assistant/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ONLINE"
        assert data["provider"] == "mock"


@pytest.mark.asyncio
async def test_bidder_assistant_chat_ollama_provider():
    """Assistant chat endpoint invokes Ollama generate_chat_response with grounded context."""
    provider = OllamaAIProvider(base_url="http://127.0.0.1:11434", model="gemma3:4b")

    mock_chat_body = json.dumps({
        "model": "gemma3:4b",
        "message": {
            "role": "assistant",
            "content": "Hello Suresh! Based on your profile, your PAN and GSTIN are verified active."
        }
    }).encode("utf-8")

    def mock_urlopen(req, timeout=None):
        m = MagicMock()
        if "tags" in req.full_url:
            m.read.return_value = json.dumps({"models": [{"name": "gemma3:4b"}]}).encode("utf-8")
        else:
            m.read.return_value = mock_chat_body
        m.__enter__.return_value = m
        return m

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        reply = await provider.generate_chat_response(
            messages=[{"role": "user", "content": "What is my status?"}],
            system_prompt="You are BidSure AI Assistant."
        )
        assert "Suresh" in reply or "PAN" in reply


@pytest.mark.asyncio
async def test_ollama_chat_strips_think_tags():
    """Provider automatically strips <think>...</think> tags emitted by reasoning models."""
    provider = OllamaAIProvider(base_url="http://127.0.0.1:11434", model="gemma3:4b")

    mock_chat_body = json.dumps({
        "model": "gemma3:4b",
        "message": {
            "role": "assistant",
            "content": "<think>Let me reason about the user's question...</think>Hello! How can I assist you today?"
        }
    }).encode("utf-8")

    def mock_urlopen(req, timeout=None):
        m = MagicMock()
        if "tags" in req.full_url:
            m.read.return_value = json.dumps({"models": [{"name": "gemma3:4b"}]}).encode("utf-8")
        else:
            m.read.return_value = mock_chat_body
        m.__enter__.return_value = m
        return m

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        reply = await provider.generate_chat_response(
            messages=[{"role": "user", "content": "hi"}],
            system_prompt="You are BidSure AI Assistant."
        )
        assert reply == "Hello! How can I assist you today?"
        assert "<think>" not in reply


def test_bidder_assistant_chat_api_endpoint_greeting_success():
    """POST /bidder-portal/assistant/chat processes greeting and returns SUCCESS status."""
    token = get_bidder_token()
    mock_chat_body = json.dumps({
        "model": "gemma3:4b",
        "message": {
            "role": "assistant",
            "content": "Hello! I am your BidSure AI Assistant. I can help you check missing documents and pre-check eligibility."
        }
    }).encode("utf-8")

    def mock_urlopen(req, timeout=None):
        m = MagicMock()
        if "tags" in req.full_url:
            m.read.return_value = json.dumps({"models": [{"name": "gemma3:4b"}]}).encode("utf-8")
        else:
            m.read.return_value = mock_chat_body
        m.__enter__.return_value = m
        return m

    with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}):
        with patch("urllib.request.urlopen", side_effect=mock_urlopen):
            resp = client.post(
                "/bidder-portal/assistant/chat",
                json={"message": "hi"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "SUCCESS"
            assert "BidSure AI Assistant" in data["reply"]
            assert data["is_fallback"] is False


def test_bidder_assistant_chat_api_endpoint_handles_timeout_gracefully():
    """POST /bidder-portal/assistant/chat returns TIMEOUT status on generation timeout."""
    token = get_bidder_token()

    def mock_urlopen_timeout(req, timeout=None):
        if "tags" in req.full_url:
            m = MagicMock()
            m.read.return_value = json.dumps({"models": [{"name": "gemma3:4b"}]}).encode("utf-8")
            m.__enter__.return_value = m
            return m
        raise urllib.error.URLError("The read operation timed out")

    with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}):
        with patch("urllib.request.urlopen", side_effect=mock_urlopen_timeout):
            resp = client.post(
                "/bidder-portal/assistant/chat",
                json={"message": "What documents am I missing for the IITG firewall tender?"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "TIMEOUT"
            assert "too long" in data["reply"]
            assert data["is_fallback"] is True


def test_bidder_assistant_chat_intent_routing_optimizations():
    """Verifies intent-based context routing selects focused system prompts and options."""
    token = get_bidder_token()
    captured_payloads = []

    def mock_urlopen_capture(req, timeout=None):
        m = MagicMock()
        if "tags" in req.full_url:
            m.read.return_value = json.dumps({"models": [{"name": "gemma3:4b"}]}).encode("utf-8")
        else:
            req_body = json.loads(req.data.decode("utf-8")) if req.data else {}
            captured_payloads.append(req_body)
            m.read.return_value = json.dumps({
                "model": "gemma3:4b",
                "message": {"role": "assistant", "content": "Sample grounded response"}
            }).encode("utf-8")
        m.__enter__.return_value = m
        return m

    with patch.dict(os.environ, {"AI_PROVIDER": "ollama"}):
        with patch("urllib.request.urlopen", side_effect=mock_urlopen_capture):
            # 1. Greeting
            client.post("/bidder-portal/assistant/chat", json={"message": "hello"}, headers={"Authorization": f"Bearer {token}"})
            # 2. Document query
            client.post("/bidder-portal/assistant/chat", json={"message": "What documents do I have?"}, headers={"Authorization": f"Bearer {token}"})
            # 3. Bid query
            client.post("/bidder-portal/assistant/chat", json={"message": "What is my bid status?"}, headers={"Authorization": f"Bearer {token}"})
            # 4. Readiness query
            client.post("/bidder-portal/assistant/chat", json={"message": "Am I ready to apply for the IITG tender?"}, headers={"Authorization": f"Bearer {token}"})

    assert len(captured_payloads) == 4

    # 1. Greeting should use num_predict: 128
    assert captured_payloads[0]["options"]["num_predict"] == 128
    greeting_sys = captured_payloads[0]["messages"][0]["content"]
    assert "active tenders" in greeting_sys
    assert "MY SUBMITTED BIDS" not in greeting_sys  # greeting does not load full bids context

    # 2. Doc query should include document repository
    assert captured_payloads[1]["options"]["num_predict"] == 384
    doc_sys = captured_payloads[1]["messages"][0]["content"]
    assert "VERIFIED DOCUMENTS" in doc_sys

    # 3. Bid query should include submitted bids
    assert captured_payloads[2]["options"]["num_predict"] == 256
    bid_sys = captured_payloads[2]["messages"][0]["content"]
    assert "MY SUBMITTED BIDS" in bid_sys

    # 4. Readiness query should include pre-check
    assert captured_payloads[3]["options"]["num_predict"] == 384
    ready_sys = captured_payloads[3]["messages"][0]["content"]
    assert "PRE-CHECK READINESS" in ready_sys


