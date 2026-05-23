import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey
from app.database import Base


class GenerationLog(Base):
    __tablename__ = "generation_logs"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)
    ai_provider = Column(String(50), default="")
    model_name = Column(String(100), default="")
    status = Column(String(20), default="success")
    progress = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    error_message = Column(Text, default="")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
    log_metadata = Column("metadata", JSON, default=dict)