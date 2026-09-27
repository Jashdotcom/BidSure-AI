"""
Officer Portal AI Assistant & Decision Support API Router
Smart India Hackathon 2024 / SIH26100 - CPCL
Automated Bid Evaluation & Statutory Compliance Verification System

Provides authenticated Procurement Officers and Senior Procurement Officers with
an intelligent, context-aware AI Assistant for tender summarization, compliance evaluation,
bid comparison, verification queue inspection, and procurement advisory support.

SECURITY & STATUTORY GOVERNANCE:
- Strictly restricted to PROCUREMENT_OFFICER and SENIOR_PROCUREMENT_OFFICER roles.
- Grounded in live procurement data (tenders, requirements, submitted bids, compliance matrices).
- GFR 144 / CVC Statutory Compliance: The AI Assistant is purely advisory and decision-support.
  It MUST NOT make binding administrative decisions, approve/reject bids, or alter records.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import re
import logging

from app.api.auth import get_current_user, require_roles
from app.data.sample_data import (
    get_all_tenders,
    get_tender_by_id,
    get_all_bidders,
    get_bidders_for_tender,
    get_bidder_by_id,
    get_dashboard_stats,
    get_recent_bid_activities,
    get_all_audit_logs,
    SAMPLE_BIDDER_DOCUMENTS
)
from app.config import settings
from app.services.rules_engine import RulesEngine
from app.services.ranking_engine import RankingEngine
from app.services.government.mock_verification_adapter import MockGovernmentVerificationService
from app.services.ai_providers import get_ai_provider
from app.services.ai_providers.base import (
    AIProviderUnavailableError,
    AIModelUnavailableError,
    AIExtractionError,
    AITimeoutError,
)

logger = logging.getLogger("bidsure.officer_portal")

router = APIRouter(prefix="/officer-portal", tags=["Officer Portal"])

rules_engine = RulesEngine()
ranking_engine = RankingEngine()
gov_service = MockGovernmentVerificationService(is_mock=True)


@router.get("/assistant/status", response_model=Dict[str, Any])
async def get_officer_assistant_status(
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Returns AI Assistant availability and model health status for authorized Procurement Officers.
    """
    try:
        provider = get_ai_provider()
        health = await provider.health_check()
        return {
            "status": "ONLINE" if health.get("status") == "connected" else "OFFLINE",
            "provider": provider.provider_name(),
            "model": provider.model_name(),
            "health": health
        }
    except Exception as e:
        logger.error("Officer assistant health check failed: %s", str(e))
        return {
            "status": "OFFLINE",
            "provider": "ollama",
            "model": settings.AI_MODEL,
            "error": str(e)
        }


@router.post("/assistant/chat", response_model=Dict[str, Any])
async def officer_assistant_chat(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_roles(["PROCUREMENT_OFFICER", "SENIOR_PROCUREMENT_OFFICER"]))
):
    """
    Context-aware BidSure AI Assistant chat endpoint for authenticated Procurement Officers.
    Features:
    1. Fast-path intent classification for simple greetings & pleasantries (<10ms).
    2. Role-based procurement domain context (Active tenders, submitted bids, compliance results, CST rankings, verification queue).
    3. Bounded conversation history and token budgets for real Gemma3:4B generation.
    4. Advisory-only statutory guardrails (GFR 144 / CVC compliance).
    """
    t_start = datetime.now(timezone.utc)

    # 1. Extract messages from payload
    messages = payload.get("messages") or []
    single_msg = payload.get("message")
    if not messages and single_msg:
        messages = [{"role": "user", "content": str(single_msg)}]
    if not messages:
        messages = [{"role": "user", "content": "Hello, what can you help me with?"}]

    # 2. Extract last user message and normalize
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = (m.get("content") or "").strip()
            break

    last_user_msg_lower = last_user_msg.lower()
    clean_msg = re.sub(r"[^\w\s]", "", last_user_msg_lower).strip()

    officer_name = current_user.get("name") or "Rajesh Kumar"
    officer_role = current_user.get("role") or "PROCUREMENT_OFFICER"
    role_display = (
        "Chief Procurement Officer (CPO)"
        if officer_role == "SENIOR_PROCUREMENT_OFFICER"
        else "Procurement Officer"
    )
    org_name = current_user.get("organization") or "Chennai Petroleum Corporation Limited (CPCL)"
    dept_name = current_user.get("department") or "Materials & Procurement Division"

    # 3. Intent Classification: Check for domain/procurement keywords vs simple conversation
    procurement_keywords = [
        "tender", "tenders", "bid", "bids", "bidder", "bidders", "document", "documents", "doc", "docs",
        "requirement", "requirements", "compliance", "matrix", "cst", "compare", "comparison", "ranking",
        "rankings", "l1", "l2", "l3", "price", "amount", "financial", "technical", "turnover", "experience",
        "oem", "maf", "warranty", "local content", "mii", "status", "deadline", "deadlines", "closing",
        "pending", "review", "reviews", "verification", "queue", "verify", "verified", "audit", "activity",
        "recent", "log", "logs", "corrigendum", "nit", "iitg", "cpcl", "firewall", "specification", "spec",
        "specs", "threshold", "emd", "disqualified", "qualified", "fail", "pass", "score", "scores",
        "summary", "summarize", "overview", "stats", "statistics", "health", "action", "actions"
    ]
    has_procurement_keywords = any(k in last_user_msg_lower for k in procurement_keywords)

    greeting_words = {
        "hi", "hello", "hey", "hii", "heyy", "hi there", "hello there", "hey there",
        "good morning", "good afternoon", "good evening", "greetings", "howdy", "sup"
    }
    is_pure_greeting = (
        clean_msg in greeting_words
        or any(clean_msg.startswith(g + " ") for g in ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"])
    )

    pleasantry_words = {
        "thanks", "thank you", "thx", "ok", "okay", "great", "cool", "awesome",
        "perfect", "got it", "bye", "goodbye", "sounds good", "alright"
    }
    is_pleasantry = clean_msg in pleasantry_words

    help_phrases = {
        "who are you", "who are you?", "what can you do", "what can you do?",
        "what is your name", "help", "help me", "intro", "introduce yourself",
        "about yourself", "capabilities", "what are your features", "commands"
    }
    is_help = clean_msg in help_phrases

    # =========================================================================
    # FAST PATH FOR SIMPLE CONVERSATION (Zero DB/LLM overhead, <10ms response)
    # =========================================================================
    if not has_procurement_keywords:
        duration = (datetime.now(timezone.utc) - t_start).total_seconds()

        # A1. Name / Intro mention
        name_match = re.search(r'\b(?:my name is|i am|i\'m|im|call me|this is)\s+([a-zA-Z]+)', last_user_msg, re.IGNORECASE)
        is_intro = bool(name_match or "nice to meet you" in last_user_msg_lower or "pleasure to meet you" in last_user_msg_lower)

        if is_intro:
            extracted_name = name_match.group(1).strip().capitalize() if name_match else officer_name
            reply = (
                f"Greetings, {role_display} {extracted_name}! I am your BidSure AI Procurement Assistant for **{org_name}**.\n\n"
                "I provide decision-support and statutory compliance analysis for your procurement workflows:\n"
                "• **Pending Bid Reviews**: Inspect submitted bids, compliance matrix scores, and clause failures.\n"
                "• **Active Tenders & Deadlines**: Review live RFPs, submission deadlines, and mandatory requirements.\n"
                "• **Comparative Statement (CST)**: Compare bidder pricing, technical qualification, and L1/L2 rankings.\n"
                "• **Document Verification Queue**: Check verified statutory credentials (PAN, GSTIN, MSME, EPFO, MAF).\n"
                "• **Recent Procurement Activity**: Track real-time bid submissions and audit logs.\n\n"
                "*(Advisory Support: In accordance with GFR 144 and CVC guidelines, final procurement decisions and tender award authority remain exclusively with authorized officers.)*\n\n"
                "How can I assist your evaluation today?"
            )
            return {
                "status": "SUCCESS",
                "reply": reply,
                "provider": "ollama",
                "model": settings.AI_MODEL,
                "duration_seconds": round(duration, 3),
                "is_fallback": False
            }

        # A2. Pure Greetings
        if is_pure_greeting:
            reply = (
                f"Good day, {role_display} {officer_name}! I am your BidSure AI Procurement Assistant for **{org_name}**.\n\n"
                "Here are some quick actions I can help you with:\n"
                "• **\"Show pending bid reviews\"**: Overview of submitted bids requiring evaluation or verification.\n"
                "• **\"Summarize active tenders\"**: Status and deadlines of currently open RFP notices.\n"
                "• **\"Compare submitted bids\"**: Commercial and technical comparison across participating bidders.\n"
                "• **\"Explain this bid's compliance\"**: Breakdown of deterministic rule checks and clause pass/fail status.\n"
                "• **\"Show upcoming deadlines\"**: Closing timelines and EMD requirements.\n"
                "• **\"Summarize recent procurement activity\"**: Latest bid submissions and system audit records.\n\n"
                "How may I assist you?"
            )
            return {
                "status": "SUCCESS",
                "reply": reply,
                "provider": "ollama",
                "model": settings.AI_MODEL,
                "duration_seconds": round(duration, 3),
                "is_fallback": False
            }

        # A3. Pleasantries
        if is_pleasantry:
            reply = "You're welcome, Officer! Let me know whenever you need assistance reviewing bids, comparing bidder proposals, or checking compliance evaluation results."
            return {
                "status": "SUCCESS",
                "reply": reply,
                "provider": "ollama",
                "model": settings.AI_MODEL,
                "duration_seconds": round(duration, 3),
                "is_fallback": False
            }

        # A4. Help / Capabilities
        if is_help:
            reply = (
                f"I am the BidSure AI Decision-Support Assistant for **{org_name}** ({dept_name}).\n\n"
                "### Core Capabilities for Procurement Officers:\n"
                "1. **Tender & Clause Analysis**: Summarizing published tender notices, eligibility criteria, and mandatory technical specs.\n"
                "2. **Automated Compliance Explanation**: Explaining why a bidder passed or failed specific clauses (e.g. Turnover thresholds, OEM Authorization, Make-in-India local content).\n"
                "3. **Comparative Statement (CST) Insights**: Multi-bidder technical and commercial comparison with L1 ranking analysis.\n"
                "4. **Verification Queue Monitoring**: Tracking statutory authenticity checks (PAN, GSTIN, MSME, EPFO) across participating vendors.\n"
                "5. **Audit Trail & Governance**: Summarizing immutable evaluation logs in compliance with GFR 2017 & CVC guidelines.\n\n"
                "*(Note: All insights are advisory. Final award and evaluation decisions are reserved for the authorized Procurement Officer.)*"
            )
            return {
                "status": "SUCCESS",
                "reply": reply,
                "provider": "ollama",
                "model": settings.AI_MODEL,
                "duration_seconds": round(duration, 3),
                "is_fallback": False
            }

        # A5. General non-procurement message
        reply = (
            f"Hello, {role_display} {officer_name}! I am your BidSure AI Assistant for **{org_name}**.\n\n"
            "I specialize in public procurement compliance, tender requirement analysis, CST comparisons, and verification tracking.\n\n"
            "You can ask me questions like:\n"
            "• *\"Show pending bid reviews\"*\n"
            "• *\"Summarize active tenders\"*\n"
            "• *\"Compare submitted bids for the IITG firewall tender\"*\n"
            "• *\"Explain the compliance evaluation for ABC Safety Solutions\"*\n"
            "• *\"Show upcoming tender deadlines\"*"
        )
        return {
            "status": "SUCCESS",
            "reply": reply,
            "provider": "ollama",
            "model": settings.AI_MODEL,
            "duration_seconds": round(duration, 3),
            "is_fallback": False
        }

    # =========================================================================
    # REAL PROCUREMENT QUERIES (Handled by Ollama Gemma3:4B with Scoped Context)
    # =========================================================================
    dashboard_stats = get_dashboard_stats()
    all_tenders = get_all_tenders()
    all_bidders = get_all_bidders(eligible_only=False)
    recent_activities = get_recent_bid_activities(limit=6)
    audit_logs = get_all_audit_logs()[:5]

    # Classify query sub-intent
    is_pending_reviews_query = any(k in last_user_msg_lower for k in [
        "pending", "review", "reviews", "queue", "under verification", "to review",
        "pending bid", "pending reviews", "pending review"
    ])

    is_tender_deadline_query = any(k in last_user_msg_lower for k in [
        "tender", "tenders", "active tender", "active tenders", "deadline", "deadlines",
        "closing", "upcoming", "rfp", "published", "iitg", "firewall", "requirement", "requirements"
    ])

    is_compliance_query = any(k in last_user_msg_lower for k in [
        "compliance", "explain compliance", "clause", "clauses", "why did", "fail", "pass",
        "disqualified", "score", "scores", "matrix", "turnover", "local content", "oem", "maf"
    ])

    is_comparison_query = any(k in last_user_msg_lower for k in [
        "compare", "comparison", "cst", "comparative", "rank", "ranking", "rankings",
        "l1", "l2", "l3", "price", "pricing", "lowest", "commercial"
    ])

    is_activity_query = any(k in last_user_msg_lower for k in [
        "activity", "recent activity", "audit", "audit trail", "logs", "events", "history"
    ])

    # Build Tenders Summary
    tenders_summary_list = []
    for t in all_tenders:
        t_status = t.get("status", "PUBLISHED")
        req_count = len(t.get("requirements", []))
        bids_count = t.get("submitted_bids_count", t.get("bids_count", 0))
        tenders_summary_list.append(
            f"- Tender ID: {t.get('id')} | Number: {t.get('tender_number') or t.get('ref')}\n"
            f"  Title: {t.get('title')}\n"
            f"  Category: {t.get('category', 'WORKS')} | Status: {t_status}\n"
            f"  Deadline: {t.get('deadline') or t.get('closing_date')} | EMD: {t.get('emd_amount', 'N/A')}\n"
            f"  Submitted Bids: {bids_count} | Requirements Extracted: {req_count} clauses"
        )
    tenders_str = "\n".join(tenders_summary_list) if tenders_summary_list else "No tenders currently in system."

    # Build Bids Summary
    bids_summary_list = []
    for b in all_bidders:
        is_submitted = str(b.get("status", "")).upper() not in ("DRAFT", "IN_PROGRESS")
        sub_status = b.get("status") or ("SUBMITTED" if is_submitted else "DRAFT")
        c_status = b.get("compliance_status") or "PENDING"
        score = b.get("compliance_score", 0)
        bid_amt = b.get("bid_amount") or b.get("price") or "N/A"
        bids_summary_list.append(
            f"- Bidder: {b.get('name')} (ID: {b.get('id')})\n"
            f"  Tender: {b.get('tender_number') or b.get('tender_id') or 'General'}\n"
            f"  Submission Status: {sub_status} | Compliance Status: {c_status} (Score: {score}%)\n"
            f"  Commercial Bid: {bid_amt} | Risk Level: {b.get('risk_level', 'LOW')}\n"
            f"  Disqualification/Notes: {b.get('disqualification_reason') or b.get('notes') or 'None'}"
        )
    bids_str = "\n".join(bids_summary_list) if bids_summary_list else "No submitted bids found in system."

    # Build Recent Activity Summary
    activity_summary_list = []
    for act in recent_activities:
        activity_summary_list.append(
            f"- {act.get('bidder_name', 'Bidder')} submitted bid for {act.get('tender_number', 'Tender')} "
            f"({act.get('tender_title', '')}) | Status: {act.get('status', 'SUBMITTED')} | Amount: {act.get('bid_amount', 'N/A')}"
        )
    activities_str = "\n".join(activity_summary_list) if activity_summary_list else "No recent bid activity."

    # Build Document Verification Overview
    total_docs = len(SAMPLE_BIDDER_DOCUMENTS)
    verified_docs = sum(1 for d in SAMPLE_BIDDER_DOCUMENTS if str(d.get("status", "")).upper() in ("VERIFIED", "VALID"))
    doc_queue_str = f"Document Repository: {total_docs} total statutory documents ({verified_docs} verified through automated registry checks)."

    # Tailor prompt based on intent
    chat_options = {"num_predict": 300, "temperature": 0.1}

    if is_comparison_query and not (is_pending_reviews_query or is_activity_query):
        chat_options = {"num_predict": 280, "temperature": 0.1}
        system_prompt = f"""You are the BidSure AI Procurement Assistant for {org_name} ({role_display}: {officer_name}).
You assist procurement officers with multi-bidder comparative evaluation, CST generation, and price ranking analysis.

OFFICER CONTEXT:
- Officer: {officer_name} ({role_display})
- Organization: {org_name} | Department: {dept_name}

ACTIVE TENDERS:
{tenders_str}

PARTICIPATING BIDDERS & SUBMISSIONS:
{bids_str}

STRICT INSTRUCTIONS:
1. Provide a clear, structured comparison of submitted bids for the requested tender.
2. Highlight technical qualification (compliance score, pass/fail status) and commercial pricing (L1, L2 ranking).
3. If a bidder is non-compliant or disqualified, explain why based on the stored data.
4. ADVISORY ONLY: State that this is an automated decision-support comparison and final financial/technical acceptance rests with the authorized Procurement Officer under GFR 144.
5. Do NOT hallucinate bidders, prices, or evaluations not present in the data.
6. Do NOT output internal thoughts or <think> tags."""

    elif is_compliance_query and not (is_tender_deadline_query or is_comparison_query):
        chat_options = {"num_predict": 280, "temperature": 0.1}
        system_prompt = f"""You are the BidSure AI Procurement Assistant for {org_name} ({role_display}: {officer_name}).
You assist procurement officers with statutory compliance explanations, clause verification rules, and risk evaluation.

OFFICER CONTEXT:
- Officer: {officer_name} ({role_display})
- Organization: {org_name}

SUBMITTED BIDS & COMPLIANCE STATUS:
{bids_str}

ACTIVE TENDERS & REQUIREMENTS:
{tenders_str}

STRICT INSTRUCTIONS:
1. Explain the compliance evaluation for the requested bidder or tender based on the deterministic rules engine results.
2. Break down statutory criteria: PAN/GSTIN validity, annual turnover thresholds, OEM authorization (MAF), Make-in-India local content (Class I/II), and technical specifications.
3. Clearly specify which requirements were PASSED, FAILED, or REQUIRE REVIEW.
4. ADVISORY ONLY: Clarify that automated rule checks assist the evaluation committee, and final statutory determination is made by the Procurement Officer.
5. Keep answers concise, factual, and formatted with bullet points.
6. Do NOT output internal thoughts or <think> tags."""

    elif is_pending_reviews_query:
        chat_options = {"num_predict": 250, "temperature": 0.1}
        system_prompt = f"""You are the BidSure AI Procurement Assistant for {org_name} ({role_display}: {officer_name}).
You provide immediate visibility into pending bid reviews, verification queues, and active evaluation workloads.

DASHBOARD SUMMARY:
- Active Tenders: {dashboard_stats.get('active_tenders', 0)}
- Total Bids: {dashboard_stats.get('total_bids', 0)}
- Under Verification: {dashboard_stats.get('under_verification', 0)}
- Pending Review: {dashboard_stats.get('pending_review', 0)}
- Compliant Bids: {dashboard_stats.get('compliant_bids', 0)}
- High Risk / Non-Compliant: {dashboard_stats.get('high_risk', 0)}

SUBMITTED BIDS IN QUEUE:
{bids_str}

DOCUMENT VERIFICATION STATUS:
{doc_queue_str}

STRICT INSTRUCTIONS:
1. Summarize all bids currently pending officer review, under verification, or flagged for risk.
2. Group by tender and list the bidder name, submission status, compliance score, and what action is required.
3. Keep the output clean, structured, and prioritized by urgency.
4. Do NOT output internal thoughts or <think> tags."""

    elif is_activity_query:
        chat_options = {"num_predict": 220, "temperature": 0.1}
        system_prompt = f"""You are the BidSure AI Procurement Assistant for {org_name} ({role_display}: {officer_name}).
You summarize recent procurement activities, bid submissions, and system audit trail events.

RECENT BID SUBMISSIONS:
{activities_str}

SYSTEM OVERVIEW:
- Active Tenders: {dashboard_stats.get('active_tenders', 0)} | Total Bids: {dashboard_stats.get('total_bids', 0)}

STRICT INSTRUCTIONS:
1. Summarize the recent procurement activities and audit logs clearly.
2. Mention the bidder names, relevant tenders, timestamps, and submission statuses.
3. Keep the answer concise and well-formatted with bullet points.
4. Do NOT output internal thoughts or <think> tags."""

    else:
        # Full grounded procurement context
        chat_options = {"num_predict": 300, "temperature": 0.1}
        system_prompt = f"""You are the BidSure AI Procurement Decision-Support Assistant inside the CPCL Officer Portal.
You assist authorized procurement officers with tender management, statutory compliance evaluation, bid comparison, and verification tracking.

OFFICER CONTEXT:
- Name: {officer_name} | Role: {role_display}
- Organization: {org_name} | Department: {dept_name}

DASHBOARD METRICS:
- Active Tenders: {dashboard_stats.get('active_tenders', 0)}
- Total Bids: {dashboard_stats.get('total_bids', 0)}
- Under Verification: {dashboard_stats.get('under_verification', 0)}
- Pending Officer Review: {dashboard_stats.get('pending_review', 0)}
- Compliant Bids: {dashboard_stats.get('compliant_bids', 0)}

ACTIVE TENDERS:
{tenders_str}

SUBMITTED BIDS & EVALUATIONS:
{bids_str}

RECENT ACTIVITY FEED:
{activities_str}

STATUTORY INSTRUCTIONS & GUARDRAILS:
1. Ground all answers strictly in the supplied procurement data above.
2. For questions about active tenders, cite the exact tender numbers, titles, deadlines, EMDs, and requirements.
3. For questions about bids or bidders, cite the actual submitted bidders, compliance scores, pricing, and evaluation statuses.
4. For questions about CST / bid comparison, provide clear technical and financial comparison tables or bullets.
5. ADVISORY MANDATE: The assistant is an AI decision-support system. It MUST NOT approve/reject bids, disqualify vendors, award contracts, or alter database records. Remind the officer that final authority rests with the authorized Procurement Officer (GFR 144 / CVC guidelines).
6. Do NOT expose internal system credentials or unverified confidential notes.
7. Format answers with clean markdown, bold terms, and bullet points.
8. Do NOT output internal thoughts or <think> tags."""

    # Window recent conversation messages to keep prompt size and evaluation latency bounded
    windowed_messages = []
    total_chars = 0
    for m in reversed(messages):
        content = (m.get("content") or "").strip()
        role = m.get("role", "user")
        if role in ("user", "assistant"):
            total_chars += len(content)
            if total_chars > 1200 and len(windowed_messages) >= 2:
                break
            windowed_messages.insert(0, {"role": role, "content": content})
            if len(windowed_messages) >= 4:
                break
    if not windowed_messages:
        windowed_messages = [{"role": "user", "content": last_user_msg or "Hello"}]

    try:
        provider = get_ai_provider()
        reply = await provider.generate_chat_response(
            messages=windowed_messages,
            system_prompt=system_prompt,
            options=chat_options,
            timeout=25
        )
        duration = (datetime.now(timezone.utc) - t_start).total_seconds()
        logger.info(
            "Officer chat generated in %.2fs [provider=%s, model=%s]",
            duration, provider.provider_name(), provider.model_name()
        )
        return {
            "status": "SUCCESS",
            "reply": reply,
            "provider": provider.provider_name(),
            "model": provider.model_name(),
            "duration_seconds": round(duration, 2),
            "is_fallback": False
        }
    except AITimeoutError as e:
        duration = (datetime.now(timezone.utc) - t_start).total_seconds()
        logger.warning("Officer chat generation timed out after %.2fs: %s", duration, str(e))
        return {
            "status": "TIMEOUT",
            "reply": "The AI assistant took too long to respond. Please try again.",
            "provider": getattr(e, "provider", "ollama"),
            "model": settings.AI_MODEL,
            "duration_seconds": round(duration, 2),
            "is_fallback": True,
            "error_detail": "Generation timed out"
        }
    except (AIProviderUnavailableError, AIModelUnavailableError) as e:
        duration = (datetime.now(timezone.utc) - t_start).total_seconds()
        logger.error("AI provider unavailable during officer chat after %.2fs: %s", duration, str(e))
        return {
            "status": "UNAVAILABLE",
            "reply": "AI response failed. Please try again.",
            "provider": getattr(e, "provider", "ollama"),
            "model": getattr(e, "model", settings.AI_MODEL),
            "duration_seconds": round(duration, 2),
            "is_fallback": True,
            "error_detail": str(e)
        }
    except Exception as e:
        duration = (datetime.now(timezone.utc) - t_start).total_seconds()
        logger.error("Unexpected error during officer chat after %.2fs: %s", duration, str(e))
        return {
            "status": "ERROR",
            "reply": "AI response failed. Please try again.",
            "duration_seconds": round(duration, 2),
            "is_fallback": True,
            "error_detail": str(e)
        }
