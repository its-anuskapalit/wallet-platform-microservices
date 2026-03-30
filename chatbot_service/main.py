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
    message: str

# Response model
class ChatResponse(BaseModel):
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
    return {"status": "ok"}

