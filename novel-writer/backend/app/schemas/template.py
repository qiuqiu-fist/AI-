import datetime
from typing import Optional
from pydantic import BaseModel


class TemplateBase(BaseModel):
    name: str
    description: str = ""
    content: str = ""
    category: str = "general"


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(TemplateBase):
    pass


class TemplateResponse(TemplateBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True