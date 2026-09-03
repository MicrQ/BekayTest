from fastapi import APIRouter
from app.schemas import User
from app.store import users

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[User])
def list_users():
    """List all seed users for role switcher dropdown."""
    return [User(**u) for u in users.values()]
