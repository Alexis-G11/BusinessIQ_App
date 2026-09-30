from fastapi import Header, HTTPException
from jose import jwt, JWTError
from app.config import settings


async def get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
    return {"user_id": payload["sub"], "email": payload.get("email")}