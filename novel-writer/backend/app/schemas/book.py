import datetime
from typing import Optional
from pydantic import BaseModel


class BookBase(BaseModel):
    title: str = ""
    description: str = ""
    author: str = ""
    status: str = "active"
    output_folder: str = ""
    output_format: str = "md"
    schedule_enabled: bool = False
    schedule_time: str = "09:00"
    theme_config: dict = {}


class BookCreate(BookBase):
    title: str


class BookUpdate(BookBase):
    pass


class BookResponse(BookBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True