import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from app.database import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), default="")
    content = Column(Text, default="")
    chapter_number = Column(Integer, default=0)
    status = Column(String(20), default="draft")
    word_count = Column(Integer, default=0)
    ai_provider = Column(String(50), default="")
    model_name = Column(String(100), default="")
    prompt_used = Column(Text, default="")
    generated_date = Column(Date, default=datetime.date.today)
    file_path = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)