import logging
import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Reads the "Authorization: Bearer <token>" header. auto_error=False lets us
# return our own clean 401 message instead of FastAPI's default one.
bearer_scheme = HTTPBearer(auto_error=False)

# What a valid Supabase token must say about itself.
ISSUER = f"{settings.supabase_url.rstrip('/')}/auth/v1"
AUDIENCE = "authenticated"

# Supabase publishes its public signing keys at this address. PyJWKClient
# downloads and caches them, and re-fetches when Supabase rotates a key.
_jwks_client = jwt.PyJWKClient(
    f"{ISSUER}/.well-known/jwks.json",
    headers={"apikey": settings.supabase_anon_key},
    lifespan=3600,
)

# Only these signing algorithms are accepted. Never trust "any algorithm".
ASYMMETRIC_ALGS = {"ES256", "RS256"}  # newer Supabase projects (public keys)
SYMMETRIC_ALG = "HS256"               # legacy projects (shared secret)


@dataclass(frozen=True)
class AuthPayload:
    """Who the token says you are. Nothing here has touched our own database yet."""
    user_id: uuid.UUID
    email: str | None


def _unauthorized(detail: str = "Invalid or expired token") -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode_token(token: str) -> dict:
    """Check the token's signature and claims. Blocking, so it runs in a thread."""
    try:
        alg = jwt.get_unverified_header(token).get("alg")

        if alg in ASYMMETRIC_ALGS:
            key = _jwks_client.get_signing_key_from_jwt(token).key
        elif alg == SYMMETRIC_ALG and settings.supabase_jwt_secret:
            key = settings.supabase_jwt_secret
        else:
            raise jwt.InvalidAlgorithmError(f"Unsupported algorithm: {alg}")

        return jwt.decode(
            token,
            key,
            algorithms=[alg],  # exactly the one algorithm the header named, and only if allowed above
            audience=AUDIENCE,
            issuer=ISSUER,
            leeway=60,
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:
        # Log the real reason for us; tell the caller nothing useful.
        logger.warning("JWT rejected: %s", exc)
        raise _unauthorized() from exc


async def get_auth_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthPayload:
    """Dependency: the token is valid. Use this on sign-up, before a users row exists."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Missing bearer token")

    claims = await run_in_threadpool(_decode_token, credentials.credentials)

    try:
        user_id = uuid.UUID(claims["sub"])
    except ValueError as exc:
        raise _unauthorized() from exc

    return AuthPayload(user_id=user_id, email=claims.get("email"))


async def get_current_user(
    payload: AuthPayload = Depends(get_auth_payload),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: the token is valid AND this person has an account in our database."""
    result = await db.execute(select(User).where(User.id == payload.user_id))
    user = result.scalar_one_or_none()
    if user is None:
        # Logged in with Supabase, but business sign-up was never completed.
        raise HTTPException(status_code=403, detail="Account setup is not complete")
    return user