import datetime
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.generation_log import GenerationLog
from app.services.generator import generate_chapter

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()
MAX_RETRIES = 2


async def scheduled_generation(book_id: int, retry_count: int = 0):
    db = SessionLocal()
    try:
        today = datetime.date.today()
        existing = db.query(Chapter).filter(
            Chapter.book_id == book_id,
            Chapter.generated_date == today,
        ).first()
        if existing:
            logger.info(f"书籍 {book_id} 今天已生成，跳过")
            return
        
        logger.info(f"开始为书籍 {book_id} 生成章节（重试次数：{retry_count}）")
        await generate_chapter(book_id, db)
        logger.info(f"书籍 {book_id} 定时生成完成")
    except Exception as e:
        logger.error(f"书籍 {book_id} 定时生成失败: {e}")
        if retry_count < MAX_RETRIES:
            logger.info(f"将在30秒后重试（第 {retry_count + 1}/{MAX_RETRIES} 次）")
            import asyncio
            await asyncio.sleep(30)
            await scheduled_generation(book_id, retry_count + 1)
        else:
            log = GenerationLog(
                book_id=book_id,
                ai_provider="system",
                model_name="system",
                status="failed",
                error_message=f"定时任务失败，已重试{MAX_RETRIES}次: {str(e)}",
                started_at=datetime.datetime.utcnow(),
                completed_at=datetime.datetime.utcnow(),
            )
            db.add(log)
            db.commit()
            logger.error(f"书籍 {book_id} 定时任务重试失败，已记录错误")
    finally:
        db.close()


def setup_schedules(db: Session):
    books = db.query(Book).filter(Book.status == "active", Book.schedule_enabled == True).all()
    for book in books:
        add_book_schedule(book)


def add_book_schedule(book: Book):
    try:
        hour, minute = book.schedule_time.split(":")
        trigger = CronTrigger(hour=int(hour), minute=int(minute))
        job_id = f"book_{book.id}"
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        scheduler.add_job(scheduled_generation, trigger, args=[book.id], id=job_id, replace_existing=True)
    except Exception as e:
        logger.error(f"添加定时任务失败 (book_id={book.id}): {e}")


def remove_book_schedule(book_id: int):
    job_id = f"book_{book_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


def get_schedule_status() -> list[dict]:
    jobs = scheduler.get_jobs()
    return [
        {"job_id": job.id, "next_run": str(job.next_run_time) if job.next_run_time else None}
        for job in jobs
    ]