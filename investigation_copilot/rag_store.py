"""In-memory RAG over local markdown using Gemini embeddings (google.genai SDK)."""

from __future__ import annotations

import os
import time
from pathlib import Path

import numpy as np
from google import genai
from google.genai import types as genai_types

try:
    from .gemini_retry import call_with_retry
except ImportError:
    from gemini_retry import call_with_retry

# New SDK uses short model names (no "models/" prefix).
EMBED_MODEL = "gemini-embedding-001"
CHUNK_SIZE = 900
CHUNK_OVERLAP = 120

# Pause every N chunks during indexing to avoid bursting free-tier RPM limit.
_EMBED_BATCH_SIZE = 5
_EMBED_BATCH_DELAY_SEC = 1.5


def _chunk_text(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks: list[str] = []
    i = 0
    while i < len(text):
        end = min(i + CHUNK_SIZE, len(text))
        chunk = text[i:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        i = end - CHUNK_OVERLAP
        if i < 0:
            i = 0
    return chunks


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


class RagStore:
    def __init__(self, knowledge_dir: Path) -> None:
        self._chunks: list[str] = []
        self._embeddings: np.ndarray | None = None
        self._knowledge_dir = knowledge_dir
        # Each RagStore gets its own client so it works both as a module
        # and when instantiated before genai.configure() is called in main.
        api_key = (os.getenv("GEMINI_API_KEY", "") or "").strip()
        self._client = genai.Client(api_key=api_key)


    def _embed(self, text: str, task_type: str) -> list[float]:
        """Embed a single string. task_type: RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY."""
        r = call_with_retry(
            lambda: self._client.models.embed_content(
                model=EMBED_MODEL,
                contents=text,
                config=genai_types.EmbedContentConfig(task_type=task_type),
            ),
            label=f"embed_{task_type.lower()}",
        )
        # New SDK: response.embeddings is a list of ContentEmbedding objects.
        if not r.embeddings:
            raise RuntimeError("embed_content returned no embeddings")
        return list(r.embeddings[0].values)

    def load_and_embed(self) -> int:
        if not self._knowledge_dir.is_dir():
            print(f"[rag_store] Knowledge dir not found: {self._knowledge_dir}")
            return 0

        all_chunks: list[str] = []
        for path in sorted(self._knowledge_dir.glob("*.md")):
            raw = path.read_text(encoding="utf-8")
            for c in _chunk_text(raw):
                all_chunks.append(f"[{path.name}] {c}")

        self._chunks = all_chunks
        if not all_chunks:
            print("[rag_store] No .md files found in knowledge dir — nothing to index.")
            self._embeddings = None
            return 0

        print(f"[rag_store] Embedding {len(all_chunks)} chunks from {self._knowledge_dir} ...")

        vectors: list[list[float]] = []
        for i, chunk in enumerate(all_chunks):
            vec = self._embed(chunk, "RETRIEVAL_DOCUMENT")
            vectors.append(vec)

            # Throttle every _EMBED_BATCH_SIZE chunks to stay within free-tier RPM.
            # Prevents background indexing from consuming all Gemini quota right
            # when the first /api/investigate request arrives.
            if (i + 1) % _EMBED_BATCH_SIZE == 0 and (i + 1) < len(all_chunks):
                print(f"[rag_store] {i + 1}/{len(all_chunks)} chunks embedded. Pausing {_EMBED_BATCH_DELAY_SEC}s ...")
                time.sleep(_EMBED_BATCH_DELAY_SEC)

        self._embeddings = np.array(vectors, dtype=np.float64)
        print(f"[rag_store] Done — {len(all_chunks)} chunks indexed.")
        return len(all_chunks)

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        if not self._chunks or self._embeddings is None:
            return []

        qv = np.array(self._embed(query, "RETRIEVAL_QUERY"), dtype=np.float64)
        scores = [_cosine(qv, self._embeddings[i]) for i in range(len(self._chunks))]
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

        return [self._chunks[idx] for idx, _ in ranked[:top_k]]


