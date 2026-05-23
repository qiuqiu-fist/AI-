import asyncio
import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, SessionLocal
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.generation_log import GenerationLog
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterResponse
from app.services.generator import generate_chapter, regenerate_chapter
from app.services.exporter import export_chapter, export_all_chapters
from app.services.event_bus import EventBus

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


async def _run_generation(book_id: int):
    db = SessionLocal()
    event_bus = EventBus()
    try:
        await generate_chapter(book_id, db)
        await event_bus.publish(book_id, "done", {"status": "success", "message": "生成成功"})
    except Exception:
        try:
            log = db.query(GenerationLog).filter(
                GenerationLog.book_id == book_id,
                GenerationLog.status == "running"
            ).order_by(GenerationLog.started_at.desc()).first()
            if log:
                log.status = "failed"
                log.error_message = "后台生成失败"
                log.completed_at = datetime.datetime.utcnow()
                db.commit()
        except Exception:
            pass
        await event_bus.publish(book_id, "done", {"status": "failed", "message": "后台生成失败"})
    finally:
        db.close()


@router.post("/books/{book_id}/generate")
async def trigger_generate(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    asyncio.create_task(_run_generation(book_id))
    return {"message": "生成任务已启动"}


@router.post("/books/{book_id}/generate-batch")
async def trigger_generate_batch(book_id: int, count: int = 3, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    count = max(1, min(count, 10))
    for _ in range(count):
        asyncio.create_task(_run_generation(book_id))
    return {"message": f"批量生成任务已启动，共 {count} 章", "count": count}


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
        time_running = datetime.datetime.utcnow() - recent_log.started_at
        return {
            "status": "running",
            "message": f"正在生成中（已运行 {int(time_running.total_seconds())} 秒）",
            "started_at": recent_log.started_at.isoformat(),
            "progress": recent_log.progress or 0
        }

    if recent_log.status == "success":
        return {
            "status": "success",
            "message": "生成成功",
            "chapter_id": recent_log.chapter_id,
            "completed_at": recent_log.completed_at.isoformat() if recent_log.completed_at else None,
            "progress": 100
        }

    if recent_log.status == "failed":
        return {
            "status": "failed",
            "message": f"生成失败: {recent_log.error_message}",
            "error_message": recent_log.error_message,
            "completed_at": recent_log.completed_at.isoformat() if recent_log.completed_at else None,
            "progress": 0
        }
    
    return {"status": "unknown", "message": "未知状态"}

@router.get("/books/{book_id}/generation-events")
async def generation_events(book_id: int):
    event_bus = EventBus()

    async def event_stream():
        queue = event_bus.subscribe(book_id)
        try:
            while True:
                event, data = await queue.get()
                yield f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                if event == "done":
                    break
        finally:
            event_bus.unsubscribe(book_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/books/{book_id}/generation-history")
def get_generation_history(book_id: int, limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(GenerationLog).filter(
        GenerationLog.book_id == book_id
    ).order_by(GenerationLog.started_at.desc()).limit(limit).all()

    items = []
    for log in logs:
        duration = None
        if log.started_at and log.completed_at:
            duration = int((log.completed_at - log.started_at).total_seconds())
        items.append({
            "id": log.id,
            "status": log.status,
            "progress": log.progress or 0,
            "ai_provider": log.ai_provider,
            "model_name": log.model_name,
            "chapter_id": log.chapter_id,
            "error_message": log.error_message,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
            "duration_seconds": duration,
        })

    total = len(logs)
    success_count = sum(1 for l in logs if l.status == "success")
    failed_count = sum(1 for l in logs if l.status == "failed")
    durations = [i["duration_seconds"] for i in items if i["duration_seconds"]]

    stats = {
        "total": total,
        "success": success_count,
        "failed": failed_count,
        "success_rate": round((success_count / total * 100) if total > 0 else 0, 1),
        "avg_duration_seconds": round(sum(durations) / len(durations), 1) if durations else 0,
    }

    return {"items": items, "stats": stats}


# Keep the sync version for backward compatibility
@router.post("/books/{book_id}/generate-sync")
async def trigger_generate_sync(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    try:
        chapter = await generate_chapter(book_id, db)
        return {"message": "生成成功", "chapter_id": chapter.id}
    except ValueError as e:
        raise HTTPException(400, str(e))