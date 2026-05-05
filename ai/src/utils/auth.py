"""
JWT authentication middleware and helpers for the Tamizhi AI Service.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from .config import settings

logger = logging.getLogger("tamizhi.ai.auth")

# HTTPBearer scheme — extracts the Bearer token from the Authorization header
_bearer_scheme = HTTPBearer(auto_error=False)


# ── Core verify function ──────────────────────────────────────────────────────

def verify_token(token: str) -> str:
    """
    Verify a JWT token and return the wallet address (subject claim).

    Raises HTTPException 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as exc:
        logger.warning(f"JWT decode error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    wallet_address: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")

    if not wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    if token_type and token_type != "auth":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    # Validate Tamizhi address format (bech32 with 'tamizhi1' prefix)
    if not wallet_address.startswith("tamizhi1") or len(wallet_address) < 20:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is not a valid Tamizhi address",
        )

    return wallet_address


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> str:
    """
    FastAPI dependency that requires a valid JWT.
    Use with Depends(get_current_user) to protect endpoints.
    Returns the wallet address.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return verify_token(credentials.credentials)


async def verify_token_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> Optional[str]:
    """
    FastAPI dependency that OPTIONALLY verifies a JWT.
    Use with Depends(verify_token_optional) for endpoints accessible by
    both authenticated and anonymous users.
    Returns the wallet address if a valid token is provided, else None.
    """
    if not credentials:
        return None

    try:
        return verify_token(credentials.credentials)
    except HTTPException:
        # Invalid token — treat as anonymous (don't block the request)
        logger.debug("Optional auth: invalid token provided, treating as anonymous")
        return None


async def get_optional_wallet(request: Request) -> Optional[str]:
    """
    Extract wallet address from request state (set by middleware).
    Returns None if not authenticated.
    """
    return getattr(request.state, "wallet_address", None)


# ── JWT creation (for testing / auth endpoint) ────────────────────────────────

def create_access_token(wallet_address: str, expires_delta_seconds: int = 604800) -> str:
    """
    Create a JWT access token for a given wallet address.
    Default expiry: 7 days (604800 seconds).
    """
    import time
    now = int(time.time())
    payload = {
        "sub": wallet_address,
        "type": "auth",
        "iat": now,
        "exp": now + expires_delta_seconds,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
