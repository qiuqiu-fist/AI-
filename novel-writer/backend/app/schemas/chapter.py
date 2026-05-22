import datetime
from typing import Optional
from pydantic import BaseModel


class ChapterBase(BaseModel):
    title: str = ""
    content: str = ""
    status: str = "draft"


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(ChapterBase):
    pass


class ChapterResponse(ChapterBase):
    id: int
    book_id: int
    chapter_number: int
    word_count: int
    ai_provider: str
    model_name: str
    prompt_used: str
    generated_date: datetime.date
    file_path: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    count: int = 1