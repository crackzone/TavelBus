"""FastAPI router endpoints for conversational AI assistant."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.assistant.schemas import ChatRequest, ChatResponse
from app.modules.assistant.service import AssistantService
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


def get_assistant_service(db: AsyncSession = Depends(get_db)) -> AssistantService:
    """Dependency supplying an initialized AssistantService."""
    return AssistantService(db=db)


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with AI assistant for policy questions, bookings, live tracking, and trips",
)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    service: AssistantService = Depends(get_assistant_service),
) -> ChatResponse:
    """Conversational endpoint backed by grounded policies and domain execution services."""
    return await service.handle_chat(req=request, user=current_user)
