from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.book import Book
from app.services.scheduler import add_book_schedule, remove_book_schedule, get_schedule_status
from app.services.generator import generate_chapter

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


@router.get("")
def get_schedules():
    return get_schedule_status()


@router.put("/{book_id}")
def update_schedule(book_id: int, schedule_enabled: bool, schedule_time: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    book.schedule_enabled = schedule_enabled
    book.schedule_time = schedule_time
    db.commit()
    if schedule_enabled:
        add_book_schedule(book)
    else:
        remove_book_schedule(book_id)
    return {"message": "定时设置已更新"}


@router.post("/{book_id}/trigger")
async def trigger_schedule(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    try:
        chapter = await generate_chapter(book_id, db)
        return {"message": "生成成功", "chapter_id": chapter.id}
    except ValueError as e:
        raise HTTPException(400, str(e))