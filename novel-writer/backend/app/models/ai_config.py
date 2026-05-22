import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, JSON
from app.database import Base


class AIConfig(Base):
    __tablename__ = "ai_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String(50), nullable=False)
    display_name = Column(String(100), default="")
    enabled = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    api_base_url = Column(String(500), default="")
    api_key = Column(String(500), default="")
    model_name = Column(String(100), default="")
    max_tokens = Column(Integer, default=4096)
    temperature = Column(Float, default=0.8)
    top_p = Column(Float, default=0.9)
    extra_params = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)