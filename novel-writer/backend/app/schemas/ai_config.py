import datetime
from typing import Optional
from pydantic import BaseModel


class AIConfigBase(BaseModel):
    provider_name: str = "openai_compatible"
    display_name: str = ""
    enabled: bool = True
    is_default: bool = False
    api_base_url: str = ""
    api_key: str = ""
    model_name: str = ""
    max_tokens: int = 4096
    temperature: float = 0.8
    top_p: float = 0.9
    extra_params: dict = {}


class AIConfigCreate(AIConfigBase):
    provider_name: str
    display_name: str


class AIConfigUpdate(AIConfigBase):
    pass


class AIConfigResponse(AIConfigBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True