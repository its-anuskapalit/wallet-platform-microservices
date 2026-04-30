"""Retry Gemini API calls on 429 / quota errors with server-suggested or exponential backoff."""

from __future__ import annotations

import os
import re
import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

# Lower this in .env during dev (e.g. 3) so 429 retries don't spin for many minutes.
# Worst case with 3: 8 + 14 + 20 = 42s total backoff (safe under 600s timeout).
GEMINI_MAX_RETRIES = max(1, int(os.getenv("GEMINI_MAX_RETRIES", "3") or "3"))


def is_ratelimit(err: BaseException) -> bool:
    """True if the exception looks like a Gemini 429 / quota / rate-limit error."""
    msg = str(err).lower()
    if "429" in msg:
        return True
    if "resource exhausted" in msg:
        return True
    if "quota" in msg and ("exceed" in msg or "exceeded" in msg):
        return True
    if "rate limit" in msg:
        return True
    if "too many requests" in msg:
        return True
    return False


def _sleep_seconds(err: BaseException, attempt: int) -> float:
    text = str(err)
    m = re.search(r"retry in ([\d.]+)\s*s", text, re.I)
    if m:
        return float(m.group(1)) + 0.85
    m2 = re.search(r"retry_delay\s*\{[^}]*seconds[:\s]+(\d+)", text, re.I)
    if m2:
        return float(m2.group(1)) + 0.85
    # Free tier often needs ~12s+ between generate_content bursts.
    # Capped at 30s so retries don't push past the request timeout.
    return min(30.0, 8.0 + attempt * 6.0)


def call_with_retry(
    fn: Callable[[], T],
    *,
    max_retries: int | None = None,
    label: str = "gemini",
) -> T:
    cap = GEMINI_MAX_RETRIES if max_retries is None else max(1, max_retries)
    last: BaseException | None = None
    for attempt in range(cap):
        try:
            return fn()
        except Exception as e:
            last = e
            if not is_ratelimit(e) or attempt == cap - 1:
                raise
            delay = _sleep_seconds(e, attempt)
            print(f"[{label}] 429/quota on attempt {attempt + 1}/{cap}. Retrying in {delay:.1f}s ...")
            time.sleep(delay)
    assert last is not None
    raise last