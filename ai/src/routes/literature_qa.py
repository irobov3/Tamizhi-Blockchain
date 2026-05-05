"""
Literature Q&A endpoint — RAG-powered answers using Tamil literary corpus.
"""
from __future__ import annotations

import logging
import re
from typing import Any

import anthropic
import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from ..models.schemas import (
    Citation,
    LiteratureQARequest,
    LiteratureQAResponse,
)
from ..utils.auth import verify_token_optional
from ..utils.config import settings
from ..utils.prompts import LITERATURE_QA_PROMPT

logger = logging.getLogger("tamizhi.ai.literature_qa")
router = APIRouter()

# ── Anthropic client ──────────────────────────────────────────────────────────

_anthropic_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
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


# ── Fetch works from backend ──────────────────────────────────────────────────

async def fetch_relevant_works(question: str, limit: int) -> list[dict[str, Any]]:
    """Fetch relevant Tamil literary works from the backend API."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{settings.backend_url}/api/literature/search",
                params={"q": question, "limit": limit, "include_content": True},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("works", [])
            logger.warning(
                f"Backend returned {resp.status_code} for literature search"
            )
    except httpx.TimeoutException:
        logger.warning("Timeout fetching literature works")
    except Exception as exc:
        logger.warning(f"Failed to fetch literature works: {exc}")

    # Fallback: return curated static works for demo
    return get_fallback_works(question)


def get_fallback_works(question: str) -> list[dict[str, Any]]:
    """Return curated static Tamil works as fallback when backend is unavailable."""
    works = [
        {
            "id": "thirukkural",
            "title": "Thirukkural",
            "author": "Thiruvalluvar",
            "period": "Post-Sangam (300–600 CE)",
            "genre": "Philosophy",
            "excerpt": (
                "அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு — "
                "A, as its first of letters, every speech maintains; "
                "The 'Primal Deity' is first through all the world's domains.\n\n"
                "கற்க கசடற கற்பவை கற்றபின் நிற்க அதற்குத் தக — "
                "Learn thoroughly what should be learnt; then live accordingly."
            ),
            "full_text_available": True,
        },
        {
            "id": "purananuru",
            "title": "Purananuru",
            "author": "Various Sangam Poets",
            "period": "Sangam (300 BCE–300 CE)",
            "genre": "Poetry",
            "excerpt": (
                "யாதும் ஊரே யாவரும் கேளிர் — "
                "Every place is our town; everyone is our kin.\n\n"
                "தீதும் நன்றும் பிறர்தர வாரா — "
                "Neither evil nor good comes to us from others."
            ),
            "full_text_available": True,
        },
        {
            "id": "tolkappiyam",
            "title": "Tolkappiyam",
            "author": "Tolkappiyar",
            "period": "Sangam (300 BCE–300 CE)",
            "genre": "Grammar",
            "excerpt": (
                "எழுத்தெனப் படுவ அகர முதல னகர இறுவாய் முப்பஃ தென்ப — "
                "Letters, said to begin with 'a' and end with 'n', are thirty in number."
            ),
            "full_text_available": True,
        },
        {
            "id": "silappathikaram",
            "title": "Silappathikaram",
            "author": "Ilango Adigal",
            "period": "Post-Sangam (300–600 CE)",
            "genre": "Epic",
            "excerpt": (
                "ஊழ்வினை உருத்துவந்து ஊட்டும் — "
                "Fate, gathering force, will certainly deliver its due.\n\n"
                "அரசியல் பிழைத்தோர்க்கு அறம் கூற்றாகும் — "
                "Justice becomes death for those who err in governance."
            ),
            "full_text_available": True,
        },
    ]

    # Simple keyword matching for relevance
    q_lower = question.lower()
    scored = []
    for work in works:
        score = 0
        text = (work["title"] + " " + work["excerpt"] + " " + work["genre"]).lower()
        for word in q_lower.split():
            if word in text and len(word) > 3:
                score += 1
        scored.append((score, work))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [w for _, w in scored[: settings.literature_context_max_works]]


# ── Build RAG prompt ──────────────────────────────────────────────────────────

def build_rag_prompt(question: str, works: list[dict[str, Any]]) -> str:
    """Build the full RAG prompt with literature passages."""
    passages = []
    for i, work in enumerate(works, 1):
        excerpt = work.get("excerpt", "")
        if len(excerpt) > settings.literature_context_max_passage_len:
            excerpt = excerpt[: settings.literature_context_max_passage_len] + "…"

        passages.append(
            f"[Source {i}] {work['title']} by {work['author']} ({work['period']}, {work['genre']})\n"
            f"{excerpt}"
        )

    context_block = "\n\n".join(passages)
    return LITERATURE_QA_PROMPT.format(
        context=context_block,
        question=question,
    )


# ── Extract citations from response ──────────────────────────────────────────

def extract_citations(response_text: str, works: list[dict[str, Any]]) -> list[Citation]:
    """
    Parse [Source N] references from the model response and build Citation objects.
    """
    citations: list[Citation] = []
    seen_ids: set[str] = set()

    # Find all [Source N] references in the response
    source_refs = re.findall(r"\[Source (\d+)\]", response_text)
    referenced_indices = {int(n) - 1 for n in source_refs}

    for idx in sorted(referenced_indices):
        if 0 <= idx < len(works):
            work = works[idx]
            work_id = work.get("id", f"work-{idx}")
            if work_id in seen_ids:
                continue
            seen_ids.add(work_id)

            # Extract the passage snippet referenced
            excerpt = work.get("excerpt", "")
            passage_snippet = excerpt[:200] + "…" if len(excerpt) > 200 else excerpt

            citations.append(
                Citation(
                    work_id=work_id,
                    title=work.get("title", "Unknown"),
                    author=work.get("author", "Unknown"),
                    passage=passage_snippet,
                    source_index=idx + 1,
                )
            )

    return citations


# ── POST /literature/ask ──────────────────────────────────────────────────────

@router.post("/ask", response_model=LiteratureQAResponse)
async def literature_ask(
    request: LiteratureQARequest,
    wallet_address: str | None = Depends(verify_token_optional),
) -> LiteratureQAResponse:
    """
    Answer a question using Tamil literature as context (RAG).

    1. Fetches relevant Tamil works from the backend based on the question.
    2. Constructs a RAG prompt with the relevant passages.
    3. Calls Claude to generate an answer with source citations.
    4. Returns the answer along with structured citation objects.
    """
    client = get_client()

    # Fetch relevant works
    works = await fetch_relevant_works(
        request.question,
        limit=request.max_sources or settings.literature_context_max_works,
    )

    if not works:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relevant Tamil literary works found for this question",
        )

    # Build RAG prompt
    user_prompt = build_rag_prompt(request.question, works)

    # System prompt for literature QA
    system = (
        "You are Tamizhi AI, an expert in Tamil literature with deep knowledge of "
        "Sangam poetry, classical epics, philosophical texts, and medieval Tamil literature. "
        "Answer questions by citing the provided source passages using [Source N] notation. "
        "Always ground your answers in the provided texts. "
        "Respond in Tamil if the question is in Tamil, otherwise respond in English. "
        "Be precise, scholarly, and respectful of Tamil literary heritage."
    )

    try:
        response = await client.messages.create(
            model=settings.default_model,
            max_tokens=settings.max_tokens,
            temperature=0.3,  # Lower temperature for factual literature QA
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )

        answer_text = response.content[0].text if response.content else ""
        citations = extract_citations(answer_text, works)

        # Build sources list (all works used as context)
        sources = [
            {
                "id": w.get("id"),
                "title": w.get("title"),
                "author": w.get("author"),
                "period": w.get("period"),
                "genre": w.get("genre"),
            }
            for w in works
        ]

        return LiteratureQAResponse(
            question=request.question,
            answer=answer_text,
            citations=citations,
            sources_consulted=sources,
            model=response.model,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
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
        logger.exception(f"Unexpected error in literature_ask: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


# ── GET /literature/works ─────────────────────────────────────────────────────

@router.get("/works")
async def list_available_works() -> dict:
    """List the Tamil literary works available for Q&A context."""
    fallback = get_fallback_works("")
    return {
        "works": [
            {
                "id": w["id"],
                "title": w["title"],
                "author": w["author"],
                "period": w["period"],
                "genre": w["genre"],
            }
            for w in fallback
        ],
        "total": len(fallback),
        "note": "Additional works available when backend is connected",
    }
