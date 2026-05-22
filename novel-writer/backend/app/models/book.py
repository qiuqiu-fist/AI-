import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from app.database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    author = Column(String(100), default="")
    status = Column(String(20), default="active")
    output_folder = Column(String(500), default="")
    output_format = Column(String(20), default="md")
    schedule_enabled = Column(Boolean, default=False)
    schedule_time = Column(String(10), default="09:00")
    theme_config = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)