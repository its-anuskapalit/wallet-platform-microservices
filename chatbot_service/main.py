from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="WalletPlatform Chatbot Service", version="3.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini setup
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

# Request model (ONLY MESSAGE)
class ChatRequest(BaseModel):
    """Payload for a single chat turn containing the user's message."""
    message: str

# Response model
class ChatResponse(BaseModel):
    """Response payload containing the AI-generated reply."""
    reply: str

# System prompt
SYSTEM_PROMPT = """
You are WalletBot, a fintech assistant.

Help with:
- Rewards
- Wallet
- Transactions
- KYC

Be concise, clear, and professional.
"""

# Chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Accepts a user message, prepends the system prompt, and returns the Gemini-generated reply.

    Args:
        req: The chat request containing the user's message.

    Returns:
        A ``ChatResponse`` with the AI-generated reply text.

    Raises:
        HTTPException: 502 if the Gemini API call fails.
    """
    try:
        full_prompt = f"""
{SYSTEM_PROMPT}

User: {req.message}

Answer:
"""

        response = model.generate_content(full_prompt)
        reply = response.text.strip()

        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")

# Health
@app.get("/health")
async def health():
    """
    Returns a simple health-check payload confirming the service is running.

    Returns:
        A dict with ``{"status": "ok"}``.
    """
    return {"status": "ok"}

