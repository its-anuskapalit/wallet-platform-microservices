from __future__ import annotations

import asyncio
import json
import os
import re
import traceback
from contextlib import asynccontextmanager
from urllib.parse import quote
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field

try:
    from .gemini_retry import GEMINI_MAX_RETRIES, call_with_retry
    from .rag_store import RagStore
except ImportError:
    from gemini_retry import GEMINI_MAX_RETRIES, call_with_retry
    from rag_store import RagStore

BASE_DIR = Path(__file__).resolve().parent
_REPO_ROOT = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(_REPO_ROOT / "chatbot_service" / ".env", override=False)

KNOWLEDGE_DIR = BASE_DIR / "knowledge"

GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY", "") or "").strip()
GEMINI_MODEL_NAME = (os.getenv("GEMINI_MODEL", "gemini-2.0-flash") or "gemini-2.0-flash").strip()
GEMINI_INTER_CALL_DELAY_SEC = float(os.getenv("GEMINI_INTER_CALL_DELAY_SEC", "0") or "0")
INVESTIGATION_FAST = (os.getenv("INVESTIGATION_FAST", "").strip().lower() in ("1", "true", "yes"))
INVESTIGATION_SKIP_RAG = (os.getenv("INVESTIGATION_SKIP_RAG", "").strip().lower() in ("1", "true", "yes"))
INVESTIGATION_SKIP_RAG_INDEX = (os.getenv("INVESTIGATION_SKIP_RAG_INDEX", "").strip().lower() in ("1", "true", "yes"))
_TOOL_JSON_MAX_CHARS = int(os.getenv("INVESTIGATION_TOOL_JSON_MAX_CHARS", "20000") or "20000")
_gemini_max_out = os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "").strip()
GEMINI_MAX_OUTPUT_TOKENS: int | None = int(_gemini_max_out) if _gemini_max_out.isdigit() else None
GATEWAY_BASE_URL = os.getenv("GATEWAY_BASE_URL", "http://localhost:5000").rstrip("/")

_t_req = os.getenv("INVESTIGATION_REQUEST_TIMEOUT_SEC", "600").strip().lower()
INVESTIGATION_REQUEST_TIMEOUT_SEC: float | None
if _t_req in ("", "0", "none", "off", "false"):
    INVESTIGATION_REQUEST_TIMEOUT_SEC = None
else:
    try:
        INVESTIGATION_REQUEST_TIMEOUT_SEC = float(_t_req)
    except ValueError:
        INVESTIGATION_REQUEST_TIMEOUT_SEC = 600.0
    if INVESTIGATION_REQUEST_TIMEOUT_SEC <= 0:
        INVESTIGATION_REQUEST_TIMEOUT_SEC = None

UUID_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# New SDK: use a Client instance instead of module-level configure().
_client: genai.Client | None = None
if GEMINI_API_KEY:
    _client = genai.Client(api_key=GEMINI_API_KEY)

_rag: RagStore | None = None
_rag_chunk_count = 0
_rag_indexing = False


async def _load_rag_background() -> None:
    """Build KB embeddings without blocking HTTP (Swagger /openapi.json, /health, etc.)."""
    global _rag, _rag_chunk_count, _rag_indexing
    if not GEMINI_API_KEY:
        print("[rag] Skipping RAG indexing — GEMINI_API_KEY not set.")
        return
    if INVESTIGATION_SKIP_RAG_INDEX:
        print("[rag] Skipping RAG indexing — INVESTIGATION_SKIP_RAG_INDEX=1.")
        _rag = None
        _rag_chunk_count = 0
        return

    print(f"[rag] Starting background indexing from: {KNOWLEDGE_DIR}")
    _rag_indexing = True
    store = RagStore(KNOWLEDGE_DIR)
    try:
        n = await asyncio.to_thread(store.load_and_embed)
        _rag = store
        _rag_chunk_count = n
        print(f"[rag] Indexing complete — {n} chunks ready.")
    except Exception as e:
        print(f"[rag] ERROR during indexing: {e}")
        traceback.print_exc()
        _rag = None
        _rag_chunk_count = 0
    finally:
        _rag_indexing = False


@asynccontextmanager
async def _lifespan(app: FastAPI):
    asyncio.create_task(_load_rag_background())
    yield


app = FastAPI(
    title="WalletPlatform Investigation Copilot",
    version="1.0.0",
    lifespan=_lifespan,
)

_cors_allow_all = os.getenv("INVESTIGATION_CORS_ALLOW_ALL", "").strip().lower() in ("1", "true", "yes")
if _cors_allow_all:
    _cors_kw: dict[str, Any] = {
        "allow_origins": ["*"],
        "allow_credentials": False,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
else:
    _cors_kw = {
        "allow_origins": ["http://localhost:4200", "http://127.0.0.1:4200"],
        "allow_origin_regex": r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?",
        "allow_credentials": False,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
app.add_middleware(CORSMiddleware, **_cors_kw)


class ChatMessage(BaseModel):
    role: str
    content: str


class InvestigateRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class InvestigateResponse(BaseModel):
    reply: str
    rag_chunks_used: int = 0
    tools_used: list[str] = Field(default_factory=list)


PLAN_SYSTEM = """You are a routing planner for a fraud investigation assistant.
Choose which read-only tools are needed to answer the user's question.

Tools:
- get_admin_dashboard — aggregate fraud flag counts on the dashboard.
- list_fraud_flags — full list of fraud flags (transaction IDs, reasons, resolved state).
- get_transaction — details for one ledger transaction by GUID (amount, wallets, status).
- lookup_profile_by_email — look up a user profile by email (returns userId, KYC status).
- get_wallet_by_user_id — get wallet details for a userId (balance, status, freeze reason).
- get_rewards_by_user_id — get rewards account summary for a userId (points/tier).
- get_receipt_by_transaction — get receipt for a transactionId (if present).
- auth_me — returns identity claims for the provided JWT (debug / verification).

Output ONLY valid JSON (no markdown fences) with this exact shape:
{
  "tools": ["get_admin_dashboard", "list_fraud_flags", "get_transaction"],
  "transaction_ids": ["optional-guid"],
  "emails": ["optional-email"]
}

Rules:
- Put UUIDs from the user message in transaction_ids (max 5). You may suggest get_transaction for those.
- Put emails from the user message in emails (max 3). You may suggest lookup_profile_by_email.
- For overview questions ("how many unresolved flags", "what's on the dashboard"), include get_admin_dashboard and usually list_fraud_flags.
- For "what do we know about transaction X" include get_transaction for that id.
- If the user asks about a person by email, include lookup_profile_by_email, then usually get_wallet_by_user_id and/or get_rewards_by_user_id.
- If the user asks about a receipt for transaction X, include get_receipt_by_transaction.
- If the question can be answered purely from internal playbook text with no live data, use "tools": [] and "transaction_ids": [].
"""


SYNTH_SYSTEM = """You are an investigation analyst assistant for WalletPlatform (fintech wallet + ledger).

You are given:
1) Retrieved excerpts from an internal knowledge base (markdown).
2) Optional live JSON from read-only APIs (Admin dashboard, fraud flags, ledger transaction). Treat this as authoritative for numbers and IDs.

Rules:
- Never invent transaction IDs, amounts, or user data. If live data is missing or says unauthorized, say so clearly.
- Cite playbook context as [KB] when you use it. Cite API data as [Live].
- Be concise and professional. Do not give legal advice.
- If the user did not supply a valid Admin token, explain that live data could not be loaded and what they should do (sign in as Admin and retry, ensure gateway is running).

Preferred output format:
- If the user is investigating a specific entity, produce:
  - Facts (bullet list)
  - Risk signals (bullet list, clearly labeled as hypotheses if not in live data)
  - Next checks (bullet list, from [KB])
- If the user asks for an overview, produce:
  - Current workload (counts)
  - Top themes in flags
  - Suggested prioritization (explain criteria)
"""


async def _call_gateway(
    method: str,
    path: str,
    authorization: str | None,
) -> tuple[int, Any]:
    url = f"{GATEWAY_BASE_URL}{path}"
    headers: dict[str, str] = {}
    if authorization:
        headers["Authorization"] = authorization
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.request(method, url, headers=headers)
    try:
        body = r.json()
    except Exception:
        body = r.text
    return r.status_code, body


_ALLOWED_TOOLS = frozenset(
    {
        "get_admin_dashboard",
        "list_fraud_flags",
        "get_transaction",
        "lookup_profile_by_email",
        "get_wallet_by_user_id",
        "get_rewards_by_user_id",
        "get_receipt_by_transaction",
        "auth_me",
    }
)


def _keyword_hints(msg: str) -> dict[str, bool]:
    m = msg.lower()
    return {
        "wants_wallet": any(k in m for k in ["wallet", "balance", "freeze", "unfreeze", "frozen", "status"]),
        "wants_rewards": any(k in m for k in ["rewards", "points", "tier"]),
        "wants_receipt": any(k in m for k in ["receipt", "pdf", "invoice"]),
        "wants_dashboard": any(
            k in m for k in ["dashboard", "unresolved", "backlog", "overview", "summary", "fraud flag", "fraud"]
        ),
    }


def _normalize_plan(plan: dict[str, Any], original_message: str) -> dict[str, Any]:
    raw_tools = plan.get("tools") or []
    tools = [t for t in raw_tools if t in _ALLOWED_TOOLS]
    tx_ids: list[str] = []
    for x in plan.get("transaction_ids") or []:
        s = str(x).strip()
        if s and s not in tx_ids:
            tx_ids.append(s)
    for u in UUID_RE.findall(original_message):
        if u not in tx_ids:
            tx_ids.append(u)
    tx_ids = tx_ids[:5]
    if tx_ids and "get_transaction" not in tools:
        tools.append("get_transaction")

    emails: list[str] = []
    for x in plan.get("emails") or []:
        s = str(x).strip()
        if s and s not in emails:
            emails.append(s)
    for e in EMAIL_RE.findall(original_message):
        if e not in emails:
            emails.append(e)
    emails = emails[:3]

    hints = _keyword_hints(original_message)

    if emails and "lookup_profile_by_email" not in tools:
        tools.append("lookup_profile_by_email")
    if emails and hints["wants_wallet"] and "get_wallet_by_user_id" not in tools:
        tools.append("get_wallet_by_user_id")
    if emails and hints["wants_rewards"] and "get_rewards_by_user_id" not in tools:
        tools.append("get_rewards_by_user_id")
    if hints["wants_receipt"] and tx_ids and "get_receipt_by_transaction" not in tools:
        tools.append("get_receipt_by_transaction")
    if hints["wants_dashboard"]:
        if "get_admin_dashboard" not in tools:
            tools.append("get_admin_dashboard")
        if "list_fraud_flags" not in tools:
            tools.append("list_fraud_flags")

    return {"tools": tools, "transaction_ids": tx_ids, "emails": emails}


def _plan_tools(user_message: str) -> dict[str, Any]:
    if not _client:
        raise RuntimeError("Gemini client not configured")

    def _do() -> Any:
        return _client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=f"{PLAN_SYSTEM}\n\nUser question:\n{user_message}\n",
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

    resp = call_with_retry(_do, label="planner")
    if not resp.candidates:
        raise ValueError("Planner produced no candidates")
    text = resp.text.strip()
    return json.loads(text)


async def _run_tools(
    plan: dict[str, Any],
    authorization: str | None,
) -> tuple[dict[str, Any], list[str]]:
    used: list[str] = []
    out: dict[str, Any] = {}

    tools = plan.get("tools") or []
    tx_ids = plan.get("transaction_ids") or []
    emails = plan.get("emails") or []
    if isinstance(tx_ids, list):
        tx_ids = [str(x) for x in tx_ids][:5]
    else:
        tx_ids = []
    if isinstance(emails, list):
        emails = [str(x) for x in emails][:3]
    else:
        emails = []

    # Wave 1: independent admin/auth calls in parallel
    wave1: list[tuple[str, str, Any]] = []
    if "auth_me" in tools:
        wave1.append(("auth_me", "auth_me", _call_gateway("GET", "/gateway/auth/me", authorization)))
    if "get_admin_dashboard" in tools:
        wave1.append(("get_admin_dashboard", "admin_dashboard", _call_gateway("GET", "/gateway/admin/dashboard", authorization)))
    if "list_fraud_flags" in tools:
        wave1.append(("list_fraud_flags", "fraud_flags", _call_gateway("GET", "/gateway/admin/transactions/fraud-flags", authorization)))
    if wave1:
        w1_res = await asyncio.gather(*(w[2] for w in wave1))
        for (u_lab, o_key, _), (code, data) in zip(wave1, w1_res):
            used.append(u_lab)
            out[o_key] = {"status_code": code, "body": data}

    profiles: list[dict[str, Any]] = []
    if "lookup_profile_by_email" in tools and emails:
        out["profiles_by_email"] = []
        eco = [_call_gateway("GET", f"/gateway/profile/lookup?email={quote(e)}", authorization) for e in emails]
        eres = await asyncio.gather(*eco)
        for email, (code, data) in zip(emails, eres):
            used.append(f"lookup_profile_by_email:{email}")
            rec = {"email": email, "status_code": code, "body": data}
            out["profiles_by_email"].append(rec)
            if code == 200 and isinstance(data, dict) and data.get("userId"):
                profiles.append(data)

    if "get_transaction" in tools and tx_ids:
        out["transactions"] = []
        tcor = [_call_gateway("GET", f"/gateway/transactions/{tid}", authorization) for tid in tx_ids]
        tres = await asyncio.gather(*tcor)
        for tid, (code, data) in zip(tx_ids, tres):
            used.append(f"get_transaction:{tid}")
            out["transactions"].append({"transaction_id": tid, "status_code": code, "body": data})

    if "get_receipt_by_transaction" in tools and tx_ids:
        out["receipts"] = []
        rcor = [_call_gateway("GET", f"/gateway/receipts/transaction/{tid}", authorization) for tid in tx_ids]
        rres = await asyncio.gather(*rcor)
        for tid, (code, data) in zip(tx_ids, rres):
            used.append(f"get_receipt_by_transaction:{tid}")
            out["receipts"].append({"transaction_id": tid, "status_code": code, "body": data})

    user_ids: list[str] = []
    for p in profiles:
        uid = str(p.get("userId", "")).strip()
        if uid and uid not in user_ids:
            user_ids.append(uid)

    uids = user_ids[:3]
    if "get_wallet_by_user_id" in tools and uids:
        out["wallets"] = []
        wcor = [_call_gateway("GET", f"/gateway/wallet/lookup/{uid}", authorization) for uid in uids]
        wres = await asyncio.gather(*wcor)
        for uid, (code, data) in zip(uids, wres):
            used.append(f"get_wallet_by_user_id:{uid}")
            out["wallets"].append({"user_id": uid, "status_code": code, "body": data})

    if "get_rewards_by_user_id" in tools and uids:
        out["rewards"] = []
        rcor = [_call_gateway("GET", f"/gateway/rewards/account/{uid}", authorization) for uid in uids]
        rres = await asyncio.gather(*rcor)
        for uid, (code, data) in zip(uids, rres):
            used.append(f"get_rewards_by_user_id:{uid}")
            out["rewards"].append({"user_id": uid, "status_code": code, "body": data})

    return out, used


def _live_json_for_prompt(tool_payload: dict[str, Any]) -> str:
    if not tool_payload:
        return "{}"
    raw = json.dumps(tool_payload, indent=2, default=str)
    if len(raw) <= _TOOL_JSON_MAX_CHARS:
        return raw
    return raw[: _TOOL_JSON_MAX_CHARS] + "\n\n... [truncated — set INVESTIGATION_TOOL_JSON_MAX_CHARS to increase]\n"


def _synthesize(
    user_message: str,
    history: list[ChatMessage],
    rag_chunks: list[str],
    tool_payload: dict[str, Any],
) -> str:
    if not _client:
        raise RuntimeError("Gemini client not configured")

    hist = ""
    for msg in history[-6:]:
        hist += f"\n{msg.role.upper()}: {msg.content}"

    kb = "\n---\n".join(rag_chunks) if rag_chunks else "(no knowledge base matches)"
    live = _live_json_for_prompt(tool_payload)

    prompt = f"""{SYNTH_SYSTEM}

Knowledge base excerpts:
{kb}

Live API data (read-only):
{live}

Prior conversation:{hist}

User question:
{user_message}

Analyst answer:"""

    cfg: dict[str, Any] = {}
    if GEMINI_MAX_OUTPUT_TOKENS is not None:
        cfg["max_output_tokens"] = GEMINI_MAX_OUTPUT_TOKENS

    def _do() -> Any:
        return _client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=prompt,
            config=genai_types.GenerateContentConfig(**cfg) if cfg else None,
        )

    resp = call_with_retry(_do, label="synthesis")
    if not resp.candidates:
        raise ValueError("Synthesis produced no candidates")
    return resp.text.strip()


@app.post("/api/investigate", response_model=InvestigateResponse)
async def investigate(
    req: InvestigateRequest,
    authorization: str | None = Header(None, alias="Authorization"),
):
    if not _client:
        raise HTTPException(
            status_code=503,
            detail="Investigation Copilot is not configured. Set GEMINI_API_KEY in investigation_copilot/.env",
        )

    async def _run() -> InvestigateResponse:
        found_uuids = UUID_RE.findall(req.message)
        augmented = req.message
        if found_uuids:
            augmented += "\n\n(Detected GUIDs in message: " + ", ".join(found_uuids[:5]) + ")"

        if INVESTIGATION_FAST:
            plan: dict[str, Any] = {"tools": [], "transaction_ids": [], "emails": []}
        else:
            try:
                plan = await asyncio.to_thread(_plan_tools, augmented)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Planner error: {e}") from e

        if GEMINI_INTER_CALL_DELAY_SEC > 0:
            await asyncio.sleep(GEMINI_INTER_CALL_DELAY_SEC)

        plan = _normalize_plan(plan, req.message)

        # ── RAG retrieval + gateway tool calls run in parallel ──────────────
        async def _safe_retrieve() -> list[str]:
            if INVESTIGATION_SKIP_RAG or not _rag or not _rag_chunk_count:
                return []
            try:
                return await asyncio.to_thread(lambda: _rag.retrieve(req.message, top_k=5))
            except Exception as e:
                print(f"[rag] Retrieval error (non-fatal): {e}")
                return []

        async def _safe_run_tools() -> tuple[dict[str, Any], list[str]]:
            if not plan.get("tools"):
                return {}, []
            try:
                return await _run_tools(plan, authorization)
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Gateway unreachable ({GATEWAY_BASE_URL}). Start API Gateway and services. Error: {e}",
                ) from e

        rag_result, tools_result = await asyncio.gather(
            _safe_retrieve(),
            _safe_run_tools(),
        )

        rag_chunks: list[str] = rag_result
        tool_payload: dict[str, Any] = tools_result[0]
        tools_used: list[str] = tools_result[1]
        # ────────────────────────────────────────────────────────────────────

        try:
            reply = await asyncio.to_thread(
                _synthesize, req.message, req.history, rag_chunks, tool_payload
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Synthesis error: {e}") from e

        return InvestigateResponse(
            reply=reply,
            rag_chunks_used=len(rag_chunks),
            tools_used=tools_used,
        )

    if INVESTIGATION_REQUEST_TIMEOUT_SEC is not None:
        try:
            return await asyncio.wait_for(_run(), timeout=INVESTIGATION_REQUEST_TIMEOUT_SEC)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail=(
                    "Investigation timed out (Gemini or gateway too slow). "
                    "Add INVESTIGATION_FAST=1 for one fewer Gemini call, or set "
                    "INVESTIGATION_REQUEST_TIMEOUT_SEC=900 (or 0 for no limit). "
                    "Optional: GEMINI_MAX_OUTPUT_TOKENS=1024, GEMINI_MAX_RETRIES=3."
                ),
            ) from None

    return await _run()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ai_configured": _client is not None,
        "gemini_model": GEMINI_MODEL_NAME if _client else None,
        "gemini_max_output_tokens": GEMINI_MAX_OUTPUT_TOKENS,
        "inter_call_delay_sec": GEMINI_INTER_CALL_DELAY_SEC,
        "investigation_fast": INVESTIGATION_FAST,
        "investigation_skip_rag": INVESTIGATION_SKIP_RAG,
        "investigation_skip_rag_index": INVESTIGATION_SKIP_RAG_INDEX,
        "tool_json_max_chars": _TOOL_JSON_MAX_CHARS,
        "gateway_base_url": GATEWAY_BASE_URL,
        "rag_chunks_indexed": _rag_chunk_count,
        "rag_indexing_in_progress": _rag_indexing,
        "request_timeout_sec": INVESTIGATION_REQUEST_TIMEOUT_SEC,
        "gemini_max_retries": GEMINI_MAX_RETRIES,
    }


def _custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Optional. Admin access token from WalletPlatform login (for live gateway tools).",
    }
    post = openapi_schema.get("paths", {}).get("/api/investigate", {}).get("post")
    if isinstance(post, dict):
        post["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return openapi_schema


app.openapi = _custom_openapi


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)

