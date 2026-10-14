"""
Pydantic models / schemas for the Tamizhi AI Service.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


# ── Chat Schemas ──────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    """A single message in a conversation history."""

    role: Literal["user", "assistant"] = Field(
        ..., description="Who sent this message"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=32_000,
        description="Message text content",
    )

    @field_validator("content")
    @classmethod
    def strip_content(cls, v: str) -> str:
        return v.strip()


class ChatRequest(BaseModel):
    """Request body for POST /chat/message and POST /chat/stream."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=32_000,
        description="The user's message to the AI",
        examples=["What is the significance of Thirukkural?"],
    )
    language: Literal["ta", "en", "auto"] = Field(
        default="auto",
        description=(
            "Response language: 'ta' forces Tamil, 'en' forces English, "
            "'auto' detects from input"
        ),
    )
    conversation_history: list[ChatMessage] | None = Field(
        default=None,
        max_length=50,
        description="Previous messages in the conversation (max 50)",
    )
    use_literature_context: bool = Field(
        default=False,
        description="Fetch Tamil literary works from the database for RAG context",
    )
    model: str | None = Field(
        default=None,
        description="AI model to use. Defaults to the service's DEFAULT_MODEL.",
        examples=["claude-3-5-sonnet-20241022"],
    )
    max_tokens: int | None = Field(
        default=None,
        ge=1,
        le=8192,
        description="Maximum tokens in the response",
    )
    temperature: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Sampling temperature (0=precise, 1=creative)",
    )
    system_prompt: str | None = Field(
        default=None,
        max_length=4000,
        description="Optional custom system prompt override",
    )


class ChatResponse(BaseModel):
    """Response body for POST /chat/message."""

    message: str = Field(..., description="The AI's response text")
    model: str = Field(..., description="Model that generated the response")
    usage: dict[str, int] = Field(
        default_factory=dict,
        description="Token usage: {input_tokens, output_tokens}",
    )
    literature_context_used: bool = Field(
        default=False,
        description="Whether Tamil literature context was used",
    )
    literature_works_count: int = Field(
        default=0,
        description="Number of literary works used as context",
    )


# ── Literature Q&A Schemas ────────────────────────────────────────────────────


class Citation(BaseModel):
    """A citation referencing a specific Tamil literary work."""

    work_id: str = Field(..., description="Unique identifier of the work")
    title: str = Field(..., description="Title of the work")
    author: str = Field(..., description="Author of the work")
    passage: str = Field(..., description="The relevant passage from the work")
    source_index: int = Field(
        ...,
        ge=1,
        description="The [Source N] index used in the answer",
    )


class LiteratureQARequest(BaseModel):
    """Request body for POST /literature/ask."""

    question: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="The question about Tamil literature",
        examples=["What does Thirukkural say about friendship?"],
    )
    language: Literal["ta", "en", "auto"] = Field(
        default="auto",
        description="Response language preference",
    )
    max_sources: int | None = Field(
        default=None,
        ge=1,
        le=10,
        description="Maximum number of literary works to use as context",
    )
    work_filter: list[str] | None = Field(
        default=None,
        description="Optional: restrict search to specific work IDs",
    )
    period_filter: str | None = Field(
        default=None,
        description="Optional: restrict to a literary period (e.g. 'Sangam')",
    )


class LiteratureQAResponse(BaseModel):
    """Response body for POST /literature/ask."""

    question: str = Field(..., description="The original question")
    answer: str = Field(
        ..., description="AI-generated answer grounded in Tamil literature"
    )
    citations: list[Citation] = Field(
        default_factory=list,
        description="Structured citations referenced in the answer",
    )
    sources_consulted: list[dict[str, Any]] = Field(
        default_factory=list,
        description="All works used as context (whether cited or not)",
    )
    model: str = Field(..., description="Model that generated the answer")
    usage: dict[str, int] = Field(
        default_factory=dict,
        description="Token usage stats",
    )


# ── Auth Schemas ──────────────────────────────────────────────────────────────


class TokenPayload(BaseModel):
    """Decoded JWT payload."""

    sub: str = Field(..., description="Wallet address (subject)")
    exp: int = Field(..., description="Expiration timestamp")
    iat: int = Field(..., description="Issued at timestamp")
    type: str = Field(default="auth")


# ── Health Schema ─────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    service: str
    version: str
    default_model: str
    redis: str
