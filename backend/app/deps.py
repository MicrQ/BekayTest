from typing import Optional
from fastapi import Depends, Header, HTTPException, status

from app.schemas import User
from app.store import users


def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
) -> User:
    """Validate X-User-ID header against store and return User."""
    if not x_user_id or x_user_id not in users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-User-ID header",
        )
    return User(**users[x_user_id])


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    """Ensure acting user has manager role."""
    if current_user.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires manager role",
        )
    return current_user
