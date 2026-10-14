"""
Chat endpoint — supports both regular and SSE streaming responses.
"""
from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sse_starlette.sse import EventSourceResponse

from ..models.schemas import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
)
from ..utils.auth import verify_token_optional
from ..utils.config import settings
from ..utils.prompts import (
    TAMIL_ASSISTANT_PROMPT,
    build_literature_context_prompt,
)

logger = logging.getLogger("tamizhi.ai.chat")
router = APIRouter()

# ── Anthropic client (module-level, lazy init) ────────────────────────────────

_anthropic_client: anthropic.AsyncAnthropic | None = None


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    global _anthropic_client
    if _anthropic_client is None:
        if not settings.anthropic_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Anthropic API key not configured",
            )
        _anthropic_client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key
        )
    return _anthropic_client


# ── Helpers ───────────────────────────────────────────────────────────────────

async def fetch_literature_context(query: str) -> list[dict]:
    """Fetch relevant Tamil works from the backend API for RAG."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.backend_url}/api/literature/search",
                params={"q": query, "limit": settings.literature_context_max_works},
            )
            if resp.status_code == 200:
                return resp.json().get("works", [])
    except Exception as exc:
        logger.warning(f"Failed to fetch literature context: {exc}")
    return []


def build_messages_for_api(
    request: ChatRequest,
    system_prompt: str,
) -> list[dict]:
    """Convert ChatRequest history + new message into Anthropic messages format."""
    messages = []
    for msg in (request.conversation_history or []):
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})
    return messages


# ── POST /chat/message ────────────────────────────────────────────────────────

@router.post("/message", response_model=ChatResponse)
async def chat_message(
    request: ChatRequest,
    wallet_address: str | None = Depends(verify_token_optional),
) -> ChatResponse:
    """
    Send a message to Tamizhi AI and receive a complete response.

    - Optionally uses Tamil literature context (RAG) when `use_literature_context=true`.
    - Responds in Tamil when the user writes in Tamil, English otherwise.
    """
    client = get_anthropic_client()

    system_prompt = TAMIL_ASSISTANT_PROMPT

    # RAG: fetch literature context if requested
    literature_works: list[dict] = []
    if request.use_literature_context:
        literature_works = await fetch_literature_context(request.message)
        if literature_works:
            system_prompt = build_literature_context_prompt(
                TAMIL_ASSISTANT_PROMPT, literature_works
            )

    messages = build_messages_for_api(request, system_prompt)

    try:
        response = await client.messages.create(
            model=request.model or settings.default_model,
            max_tokens=request.max_tokens or settings.max_tokens,
            temperature=request.temperature if request.temperature is not None else settings.default_temperature,
            system=system_prompt,
            messages=messages,
        )

        content = response.content[0].text if response.content else ""

        return ChatResponse(
            message=content,
            model=response.model,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
            literature_context_used=bool(literature_works),
            literature_works_count=len(literature_works),
        )

    except anthropic.RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI rate limit exceeded. Please try again later.",
        )
    except anthropic.APIStatusError as exc:
        logger.error(f"Anthropic API error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider error: {exc.message}",
        )
    except Exception as exc:
        logger.exception(f"Unexpected error in chat_message: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


# ── POST /chat/stream ─────────────────────────────────────────────────────────

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    wallet_address: str | None = Depends(verify_token_optional),
) -> EventSourceResponse:
    """
    Send a message to Tamizhi AI and receive a **streaming SSE** response.

    Each SSE event contains a `delta` field with the next token chunk.
    A final `[DONE]` event signals the end of the stream.
    """
    client = get_anthropic_client()

    system_prompt = TAMIL_ASSISTANT_PROMPT

    literature_works: list[dict] = []
    if request.use_literature_context:
        literature_works = await fetch_literature_context(request.message)
        if literature_works:
            system_prompt = build_literature_context_prompt(
                TAMIL_ASSISTANT_PROMPT, literature_works
            )

    messages = build_messages_for_api(request, system_prompt)

    async def event_generator() -> AsyncIterator[dict]:
        try:
            # Send metadata event first
            yield {
                "event": "metadata",
                "data": json.dumps({
                    "model": request.model or settings.default_model,
                    "literature_context": bool(literature_works),
                }),
            }

            async with client.messages.stream(
                model=request.model or settings.default_model,
                max_tokens=request.max_tokens or settings.max_tokens,
                temperature=request.temperature if request.temperature is not None else settings.default_temperature,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text_chunk in stream.text_stream:
                    yield {
                        "event": "delta",
                        "data": json.dumps({"delta": text_chunk}),
                    }

                # Final message with usage stats
                final_message = await stream.get_final_message()
                yield {
                    "event": "done",
                    "data": json.dumps({
                        "usage": {
                            "input_tokens": final_message.usage.input_tokens,
                            "output_tokens": final_message.usage.output_tokens,
                        }
                    }),
                }

        except anthropic.RateLimitError:
            yield {
                "event": "error",
                "data": json.dumps({"error": "Rate limit exceeded"}),
            }
        except Exception as exc:
            logger.exception(f"Stream error: {exc}")
            yield {
                "event": "error",
                "data": json.dumps({"error": "Stream failed"}),
            }

    return EventSourceResponse(event_generator())


# ── GET /chat/models ──────────────────────────────────────────────────────────

@router.get("/models")
async def list_models() -> dict:
    """List available AI models."""
    return {
        "models": [
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "provider": "anthropic",
                "description": "Best for Tamil literature and culture queries",
                "max_tokens": 8192,
            },
            {
                "id": "claude-3-opus-20240229",
                "name": "Claude 3 Opus",
                "provider": "anthropic",
                "description": "Most powerful, best for complex reasoning",
                "max_tokens": 4096,
            },
            {
                "id": "claude-3-haiku-20240307",
                "name": "Claude 3 Haiku",
                "provider": "anthropic",
                "description": "Fast and lightweight",
                "max_tokens": 4096,
            },
        ],
        "default": settings.default_model,
    }
