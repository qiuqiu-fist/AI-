from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.generation_log import GenerationLog
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterResponse
from app.services.generator import generate_chapter, regenerate_chapter
from app.services.exporter import export_chapter, export_all_chapters

router = APIRouter(prefix="/api", tags=["chapters"])


@router.get("/books/{book_id}/chapters", response_model=List[ChapterResponse])
def list_chapters(book_id: int, db: Session = Depends(get_db)):
    return db.query(Chapter).filter(Chapter.book_id == book_id).order_by(Chapter.chapter_number).all()


@router.post("/books/{book_id}/chapters", response_model=ChapterResponse, status_code=201)
def create_chapter(book_id: int, data: ChapterCreate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    count = db.query(Chapter).filter(Chapter.book_id == book_id).count()
    chapter = Chapter(book_id=book_id, chapter_number=count + 1, **data.model_dump())
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(404, "章节不存在")
    return chapter


@router.put("/chapters/{chapter_id}", response_model=ChapterResponse)
def update_chapter(chapter_id: int, data: ChapterUpdate, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(404, "章节不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(chapter, key, val)
    chapter.word_count = len(chapter.content or "")
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: int, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(404, "章节不存在")
    db.delete(chapter)
    db.commit()
    return {"message": "删除成功"}


@router.post("/books/{book_id}/generate")
async def trigger_generate(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    try:
        chapter = await generate_chapter(book_id, db)
        return {"message": "生成成功", "chapter_id": chapter.id}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/chapters/{chapter_id}/regenerate")
async def trigger_regenerate(chapter_id: int, db: Session = Depends(get_db)):
    try:
        chapter = await regenerate_chapter(chapter_id, db)
        return {"message": "重新生成成功", "chapter_id": chapter.id}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/books/{book_id}/export/{chapter_id}")
def export_single_chapter(book_id: int, chapter_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not book or not chapter:
        raise HTTPException(404, "书籍或章节不存在")
    path = export_chapter(book, chapter, db)
    return {"message": "导出成功", "file_path": path}


@router.post("/books/{book_id}/export-all")
def export_all(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    path = export_all_chapters(book, db)
    return {"message": "全书导出成功", "file_path": path}


@router.get("/books/{book_id}/generation-status")
def get_generation_status(book_id: int, db: Session = Depends(get_db)):
    recent_log = db.query(GenerationLog).filter(
        GenerationLog.book_id == book_id
    ).order_by(GenerationLog.started_at.desc()).first()
    
    if not recent_log:
        return {"status": "idle", "message": "暂无生成任务"}
    
    if recent_log.status == "running":
        time_running = datetime.utcnow() - recent_log.started_at
        return {
            "status": "running",
            "message": f"正在生成中（已运行 {int(time_running.total_seconds())} 秒）",
            "started_at": recent_log.started_at.isoformat()
        }
    
    if recent_log.status == "success":
        return {
            "status": "success",
            "message": "生成成功",
            "chapter_id": recent_log.chapter_id,
            "completed_at": recent_log.completed_at.isoformat() if recent_log.completed_at else None
        }
    
    if recent_log.status == "failed":
        return {
            "status": "failed",
            "message": f"生成失败: {recent_log.error_message}",
            "error_message": recent_log.error_message,
            "completed_at": recent_log.completed_at.isoformat() if recent_log.completed_at else None
        }
    
    return {"status": "unknown", "message": "未知状态"}