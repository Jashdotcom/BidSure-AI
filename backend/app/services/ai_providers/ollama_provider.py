"""
Ollama AI Provider — real local LLM integration for tender requirement extraction.
Connects to a locally running Ollama instance, sends page-aware tender text,
and returns structured requirement candidates for downstream grounding validation.
"""
import json
import logging
import os
import re
import socket
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin

from app.services.ai_providers.base import (
    AIProvider,
    AIProviderUnavailableError,
    AIModelUnavailableError,
    AIExtractionError,
    AITimeoutError,
)

logger = logging.getLogger("bidsure.ai.ollama")

# Valid requirement category codes that the LLM may return
VALID_RULE_CODES = {
    "TURNOVER_MIN", "EXP_YEARS_MIN", "EXP_SIMILAR_CONTRACTS", "EXP_MIN_ORDER_VALUE",
    "STAT_PAN_VALID", "STAT_GST_REG", "STAT_UDYAM_MSME", "OEM_AUTHORIZATION",
    "MII_LOCAL_CONTENT", "STAT_EPFO_ESIC", "VIG_NON_BLACKLISTED",
    "QUAL_SAFETY_CERTIFICATES", "TECH_THROUGHPUT", "TECH_CONCURRENT_SESSIONS",
    "TECH_SESSION_RATE", "TECH_VPN_CAPACITY", "TECH_VIRTUAL_SYSTEMS",
    "COMM_EMD_SECURITY", "GENERAL",
}

VALID_CATEGORIES = {
    "FINANCIAL", "TECHNICAL", "STATUTORY", "OEM_AUTHORIZATION", "LOCAL_CONTENT",
    "VIGILANCE", "QUALITY_COMPLIANCE", "TECHNICAL_SPECIFICATION", "COMMERCIAL",
    "GENERAL",
}

SYSTEM_PROMPT = """You are a procurement compliance extraction engine.
Your task is to extract structured eligibility and qualification requirements from the supplied Indian government tender document text.

STRICT RULES:
1. Use ONLY the supplied document text. Do NOT invent requirements, values, clauses, page numbers, or evidence.
2. Do NOT use general procurement knowledge, previous tenders, or assumptions.
3. For each requirement, extract the EXACT threshold value from the source text (e.g., "Rs.10 crores" → threshold_value: 10, unit: "Crore INR").
4. Do NOT confuse dates (31 March, 2026), clause numbers, page numbers, item numbers, or years with threshold values.
5. The evidence_text MUST be a verbatim excerpt from the supplied text — do NOT paraphrase or rewrite.
6. Each requirement must be independently testable. Split compound clauses when they contain separate conditions.
7. source_page must match the page number where the text actually appears.

Return a JSON object with this exact structure:
{
  "requirements": [
    {
      "code": "<rule code from: TURNOVER_MIN, EXP_YEARS_MIN, EXP_SIMILAR_CONTRACTS, EXP_MIN_ORDER_VALUE, STAT_PAN_VALID, STAT_GST_REG, STAT_UDYAM_MSME, OEM_AUTHORIZATION, MII_LOCAL_CONTENT, STAT_EPFO_ESIC, VIG_NON_BLACKLISTED, QUAL_SAFETY_CERTIFICATES, TECH_THROUGHPUT, TECH_CONCURRENT_SESSIONS, TECH_SESSION_RATE, TECH_VPN_CAPACITY, TECH_VIRTUAL_SYSTEMS, COMM_EMD_SECURITY, GENERAL>",
      "name": "<short requirement title>",
      "category": "<FINANCIAL|TECHNICAL|STATUTORY|OEM_AUTHORIZATION|LOCAL_CONTENT|VIGILANCE|QUALITY_COMPLIANCE|TECHNICAL_SPECIFICATION|COMMERCIAL|GENERAL>",
      "mandatory": true,
      "description": "<1-2 sentence specification with threshold>",
      "threshold_value": <numeric value or 1 for document requirements>,
      "unit": "<Crore INR|Lakh INR|INR|Years|Projects|Gbps|Mbps|Sessions|Percentage|Valid Document|Self Declaration|null>",
      "source_page": <1-indexed page number>,
      "evidence_text": "<verbatim excerpt from the source text that supports this requirement>",
      "clause_reference": "<e.g. Clause 4.1 or Section VII>"
    }
  ]
}

Return ONLY valid JSON. No markdown, no explanation, no preamble."""


def _build_page_context(pages: List[Dict[str, Any]]) -> str:
    """Builds page-aware context string for the LLM prompt."""
    parts = []
    for p in pages:
        page_num = p.get("page_number", 1)
        text = (p.get("text") or "").strip()
        if text:
            parts.append(f"--- PAGE {page_num} ---\n{text}")
    return "\n\n".join(parts)


class OllamaAIProvider(AIProvider):
    """
    Real local LLM provider using Ollama's HTTP API.

    Configuration (via environment variables):
        AI_BASE_URL: Ollama server URL (default: http://127.0.0.1:11434)
        AI_MODEL: Model name to use (default: gemma3:4b)
    """

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None, timeout: Optional[int] = None):
        self._base_url = (base_url or os.getenv("AI_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
        self._model = model or os.getenv("AI_MODEL", "gemma3:4b")
        self._timeout = int(timeout or os.getenv("AI_TIMEOUT", "120"))
        self._resolved_base_url: Optional[str] = None
        self._last_health: Optional[Dict[str, Any]] = None
        self._last_health_ts: float = 0.0

    def provider_name(self) -> str:
        return "ollama"

    def model_name(self) -> Optional[str]:
        return self._model

    def _get_candidate_base_urls(self) -> List[str]:
        """
        Returns list of candidate base URLs to try.
        Handles Windows IPv4 vs IPv6 resolution differences for localhost vs 127.0.0.1.
        """
        urls = []
        if self._resolved_base_url and self._resolved_base_url not in urls:
            urls.append(self._resolved_base_url)
        if self._base_url not in urls:
            urls.append(self._base_url)
        if "localhost" in self._base_url:
            alt = self._base_url.replace("localhost", "127.0.0.1")
            if alt not in urls:
                urls.append(alt)
        elif "127.0.0.1" in self._base_url:
            alt = self._base_url.replace("127.0.0.1", "localhost")
            if alt not in urls:
                urls.append(alt)
        return urls

    def _get_active_base_url(self) -> str:
        return self._resolved_base_url or self._base_url

    async def health_check(self, force: bool = False) -> Dict[str, Any]:
        """
        Checks Ollama connectivity and model availability.
        Caches connected status for up to 30s to avoid redundant roundtrips per prompt.
        """
        import time
        import urllib.request
        import urllib.error

        now = time.time()
        if not force and self._last_health and (now - self._last_health_ts < 30.0) and self._last_health.get("status") == "connected":
            return self._last_health

        body = None
        last_error = None
        working_url = None

        candidate_urls = self._get_candidate_base_urls()
        for base in candidate_urls:
            tags_url = f"{base}/api/tags"
            try:
                req = urllib.request.Request(tags_url, method="GET")
                req.add_header("Accept", "application/json")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                    working_url = base
                    self._resolved_base_url = working_url
                    break
            except urllib.error.URLError as e:
                last_error = getattr(e, "reason", str(e))
            except Exception as e:
                last_error = str(e)

        if not body or working_url is None:
            return {
                "status": "unavailable",
                "provider": "ollama",
                "model": self._model,
                "base_url": self._base_url,
                "message": f"Cannot connect to Ollama at {self._base_url}. Ensure Ollama is running. Error: {last_error}",
            }

        # 2. Check model availability
        available_models = []
        model_names_lower = set()
        for m in body.get("models", []):
            for field in ("name", "model"):
                val = m.get(field)
                if val and isinstance(val, str):
                    if field == "name" and val not in available_models:
                        available_models.append(val)
                    model_names_lower.add(val.lower())
                    if ":" in val:
                        model_names_lower.add(val.split(":")[0].lower())
                    else:
                        model_names_lower.add(f"{val}:latest".lower())

        target = self._model.lower()
        target_base = target.split(":")[0]

        model_found = (
            target in model_names_lower
            or target_base in model_names_lower
            or any(m.startswith(target_base) for m in model_names_lower)
            or any(target_base in m for m in model_names_lower)
        )

        if not model_found:
            return {
                "status": "model_unavailable",
                "provider": "ollama",
                "model": self._model,
                "base_url": working_url,
                "available_models": available_models,
                "message": (
                    f"Model '{self._model}' is not available on Ollama. "
                    f"Available models: {', '.join(available_models) if available_models else 'None'}. "
                    f"Run 'ollama pull {self._model}' to download it."
                ),
            }

        result = {
            "status": "connected",
            "provider": "ollama",
            "model": self._model,
            "base_url": working_url,
            "message": f"Ollama connected. Model '{self._model}' is available.",
        }
        self._last_health = result
        self._last_health_ts = time.time()
        return result

    async def extract_requirements(
        self,
        pages: List[Dict[str, Any]],
        filename: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Sends page-aware tender text to Ollama and returns structured requirement candidates.
        Validates the response JSON schema before returning.
        """
        import urllib.request
        import urllib.error

        # 0. Pre-flight health check
        health = await self.health_check()
        if health["status"] == "unavailable":
            raise AIProviderUnavailableError("ollama", health["message"])
        if health["status"] == "model_unavailable":
            raise AIModelUnavailableError("ollama", self._model, health["message"])

        # 1. Build page-aware context
        page_context = _build_page_context(pages)
        total_pages = len(pages)

        user_prompt = (
            f"Extract all eligibility, qualification, and compliance requirements from this tender document.\n"
            f"Document: {filename}\n"
            f"Total pages: {total_pages}\n\n"
            f"{page_context}"
        )

        # 2. Call Ollama API
        active_url = self._get_active_base_url()
        api_url = f"{active_url}/api/chat"
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_predict": 4096,
            },
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                api_url,
                data=req_data,
                method="POST",
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                response_body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.URLError as e:
            raise AIProviderUnavailableError(
                "ollama",
                f"Ollama request failed: {getattr(e, 'reason', str(e))}",
            )
        except Exception as e:
            raise AIExtractionError("ollama", "request_failed", str(e))

        # 3. Extract content from Ollama response
        message = response_body.get("message", {})
        content = message.get("content", "")

        if not content or not content.strip():
            raise AIExtractionError("ollama", "empty_response", "Ollama returned an empty response.")

        logger.info(
            "Ollama response received: model=%s, eval_count=%s, total_duration=%s",
            response_body.get("model"),
            response_body.get("eval_count"),
            response_body.get("total_duration"),
        )

        # 4. Parse JSON from response
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    raise AIExtractionError(
                        "ollama", "invalid_json",
                        f"Could not parse LLM output as JSON: {str(e)}"
                    )
            else:
                raise AIExtractionError(
                    "ollama", "invalid_json",
                    f"Could not parse LLM output as JSON: {str(e)}"
                )

        # 5. Validate structure
        requirements_raw = parsed.get("requirements", [])
        if not isinstance(requirements_raw, list):
            raise AIExtractionError(
                "ollama", "invalid_schema",
                f"Expected 'requirements' to be a list, got {type(requirements_raw).__name__}"
            )

        # 6. Validate and normalize each requirement
        validated = []
        for idx, req in enumerate(requirements_raw):
            if not isinstance(req, dict):
                logger.warning("Skipping non-dict requirement at index %d", idx)
                continue

            # Required fields
            code = req.get("code", "GENERAL")
            if code not in VALID_RULE_CODES:
                code = "GENERAL"

            category = req.get("category", "GENERAL")
            if category not in VALID_CATEGORIES:
                category = "GENERAL"

            name = req.get("name", "")
            if not name or not isinstance(name, str) or len(name.strip()) < 3:
                logger.warning("Skipping requirement at index %d: missing or short name", idx)
                continue

            description = req.get("description", name)
            evidence_text = req.get("evidence_text", "")

            # Validate source_page bounds
            source_page = req.get("source_page", 1)
            try:
                source_page = int(source_page)
            except (TypeError, ValueError):
                source_page = 1
            source_page = max(1, min(source_page, total_pages))

            # Validate threshold_value
            threshold_value = req.get("threshold_value", 1)
            if threshold_value is None:
                threshold_value = 1

            unit = req.get("unit")
            mandatory = req.get("mandatory", True)
            if not isinstance(mandatory, bool):
                mandatory = True

            confidence = 0.85  # LLM extractions start at moderate confidence

            clause_reference = req.get("clause_reference", f"Page {source_page}")

            validated.append({
                "code": code,
                "name": name.strip(),
                "category": category,
                "type": category,
                "mandatory": mandatory,
                "description": description.strip() if isinstance(description, str) else str(description),
                "threshold_value": threshold_value,
                "unit": unit,
                "source_page": source_page,
                "evidence_text": evidence_text.strip() if isinstance(evidence_text, str) else "",
                "confidence": confidence,
                "clause_reference": clause_reference,
                "extraction_source": "OLLAMA_LLM",
            })

        if not validated:
            raise AIExtractionError(
                "ollama", "no_valid_requirements",
                "LLM returned no valid requirements after schema validation."
            )

        logger.info(
            "Ollama extraction complete: %d requirements validated out of %d raw candidates",
            len(validated), len(requirements_raw)
        )

        return validated

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None,
    ) -> str:
        """
        Generate chat assistant response using Ollama /api/chat endpoint.
        """
        import urllib.request
        import urllib.error

        health = await self.health_check()
        if health["status"] == "unavailable":
            raise AIProviderUnavailableError("ollama", health["message"])
        if health["status"] == "model_unavailable":
            raise AIModelUnavailableError("ollama", self._model, health["message"])

        active_url = self._get_active_base_url()
        api_url = f"{active_url}/api/chat"
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role in ("user", "assistant", "system") and content:
                formatted_messages.append({"role": role, "content": content})

        # Base options tuned for fast, deterministic, and bounded conversational generation
        gen_options: Dict[str, Any] = {
            "temperature": 0.1,
            "num_predict": 384,
            "top_k": 40,
            "top_p": 0.9,
        }
        if options:
            gen_options.update(options)

        payload = {
            "model": self._model,
            "messages": formatted_messages,
            "stream": False,
            "options": gen_options,
        }

        chat_timeout = timeout or min(self._timeout, 30)

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                api_url,
                data=req_data,
                method="POST",
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=chat_timeout) as resp:
                response_body = json.loads(resp.read().decode("utf-8"))
        except (TimeoutError, socket.timeout) as e:
            logger.warning("Ollama chat generation timed out after %ds: %s", chat_timeout, str(e))
            raise AITimeoutError("ollama", f"Ollama generation timed out after {chat_timeout}s: {str(e)}")
        except urllib.error.URLError as e:
            reason_str = str(getattr(e, "reason", e)).lower()
            if "timed out" in reason_str or "timeout" in reason_str:
                logger.warning("Ollama chat generation URLError timeout: %s", reason_str)
                raise AITimeoutError("ollama", f"Ollama generation timed out: {reason_str}")
            logger.error("Ollama chat URLError: %s", str(e))
            raise AIProviderUnavailableError(
                "ollama",
                f"Ollama chat request failed: {getattr(e, 'reason', str(e))}",
            )
        except Exception as e:
            if "timeout" in str(e).lower():
                raise AITimeoutError("ollama", f"Ollama generation timed out: {str(e)}")
            logger.error("Ollama chat unexpected error: %s", str(e))
            raise AIProviderUnavailableError(
                "ollama",
                f"Ollama chat request failed: {str(e)}",
            )

        message = response_body.get("message", {})
        content = message.get("content", "")
        if not content or not content.strip():
            return "Hello! I am your BidSure AI Assistant. How can I help you with your tenders and bids today?"

        # Strip any internal thought tags emitted by reasoning models
        cleaned_content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
        return cleaned_content or content.strip()
