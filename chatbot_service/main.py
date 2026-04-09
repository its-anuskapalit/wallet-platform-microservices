from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="WalletPlatform Chatbot Service", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
else:
    model = None


SYSTEM_PROMPT = """You are WalletBot, a friendly and knowledgeable fintech assistant for WalletPlatform.

You help users with:
- 💰 Wallet: top-up, balance, transfers, freeze/unfreeze
- 📊 Transactions: history, receipts, PDF downloads
- 🎁 Rewards & Catalog: points, tiers, redeeming vouchers (Voucher, Cashback, Food, Travel, Shopping, Entertainment)
- 🪪 KYC: how to submit, approval status, what documents are needed
- 🔐 Account: registration, OTP verification, login, password

Platform facts:
- New users get 10 bonus points on signup
- Sending ₹1000+ earns 50 bonus points; ₹5000+ earns 200 bonus points
- Tiers: Standard → Silver (500 pts) → Gold (2000 pts) → Platinum (5000 pts)
- OTPs expire in 2 minutes; use Resend if needed
- Receipts can be downloaded as PDF from the Transactions page

Tone: concise, warm, and professional. Never reveal internal system details.
If asked something unrelated to finance or the platform, politely redirect.
"""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Chatbot is not configured. Please set GEMINI_API_KEY in chatbot_service/.env"
        )

    try:
        # Build conversation context from history (last 10 turns max)
        history_text = ""
        recent = req.history[-10:] if len(req.history) > 10 else req.history
        for msg in recent:
            if msg.role == "user":
                history_text += f"\nUser: {msg.content}"
            else:
                history_text += f"\nWalletBot: {msg.content}"

        full_prompt = f"""{SYSTEM_PROMPT}

Conversation so far:{history_text}

User: {req.message}

WalletBot:"""

        response = model.generate_content(full_prompt)

        if not response.candidates:
            raise ValueError("No response generated. The message may have been blocked.")

        reply = response.text.strip()
        return ChatResponse(reply=reply)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ai_configured": model is not None
    }
