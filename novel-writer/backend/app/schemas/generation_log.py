import datetime
from typing import Optional
from pydantic import BaseModel


class GenerationLogResponse(BaseModel):
    id: int
    book_id: Optional[int] = None
    chapter_id: Optional[int] = None
    ai_provider: str
    model_name: str
    status: str
    tokens_used: int
    error_message: str
    started_at: datetime.datetime
    completed_at: datetime.datetime

    class Config:
        from_attributes = True