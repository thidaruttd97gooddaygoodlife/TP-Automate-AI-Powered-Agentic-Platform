from typing import Optional

from fastapi import Header, HTTPException, Request
from jose import JWTError

from app.core.jwt_utils import decode_token
from app.core.config import get_settings


class RoleChecker:
    """Role checker that accepts JWT Bearer tokens or legacy x-user-id/x-user-role headers."""

    def __init__(self, allowed_roles: list[str]) -> None:
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        request: Request,
        x_user_id: Optional[str] = Header(None),
        x_user_role: Optional[str] = Header(None),
    ) -> dict:
        settings = get_settings()

        # 1. Try JWT Bearer token first
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = decode_token(token, settings.jwt_secret_key)
            except JWTError:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            role = payload.get("role", "")
            user_id = payload.get("sub", "unknown")
            if role not in self.allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required roles: {self.allowed_roles}",
                )
            return {"user_id": user_id, "role": role}

        # 2. Fallback: legacy x-user-id / x-user-role headers
        if x_user_id and x_user_role:
            if x_user_role not in self.allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required roles: {self.allowed_roles}",
                )
            return {"user_id": x_user_id, "role": x_user_role}

        raise HTTPException(
            status_code=401,
            detail="Missing authentication. Provide Authorization: Bearer <token> or x-user-id/x-user-role headers.",
        )


def require_role(*roles: str) -> RoleChecker:
    """Factory function to create a role checker for specific roles."""
    return RoleChecker(allowed_roles=list(roles))
