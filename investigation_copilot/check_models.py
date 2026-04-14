"""Run this inside investigation_copilot/ to list available embedding models."""
import os, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
api_key = os.getenv("GEMINI_API_KEY", "").strip()

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env")
    sys.exit(1)

from google import genai
client = genai.Client(api_key=api_key)

print("=== All models that support embedContent ===")
for m in client.models.list():
    methods = getattr(m, "supported_actions", None) or getattr(m, "supported_generation_methods", [])
    name = getattr(m, "name", str(m))
    if "embedContent" in str(methods) or "embed" in name.lower():
        print(f"  {name}  |  methods: {methods}")

print("\n=== All available models (full list) ===")
for m in client.models.list():
    name = getattr(m, "name", str(m))
    methods = getattr(m, "supported_actions", None) or getattr(m, "supported_generation_methods", [])
    print(f"  {name}  |  {methods}")
