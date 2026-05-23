import datetime
import logging
import asyncio
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


async def _gen_single_chapter(book_id: int):
    db = SessionLocal()
    try:
        await generate_chapter(book_id, db)
    except Exception as e:
        logger.error(f"书籍 {book_id} 章节生成失败: {e}")
    finally:
        db.close()


async def scheduled_generation(book_id: int, retry_count: int = 0):
    db = SessionLocal()
    try:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            logger.warning(f"书籍 {book_id} 不存在")
            return
        
        today = datetime.date.today()
        
        existing_count = db.query(Chapter).filter(
            Chapter.book_id == book_id,
            Chapter.generated_date == today,
        ).count()
        
        daily_chapters = max(1, book.daily_chapters)
        chapters_to_generate = daily_chapters - existing_count
        
        if chapters_to_generate <= 0:
            logger.info(f"书籍 {book_id} 今天已生成 {existing_count}/{daily_chapters} 章，跳过")
            return
        
        logger.info(f"开始为书籍 {book_id} 并发生成 {chapters_to_generate} 章（重试次数：{retry_count}）")
        
        tasks = [_gen_single_chapter(book_id) for _ in range(chapters_to_generate)]
        await asyncio.gather(*tasks)
        
        logger.info(f"书籍 {book_id} 定时生成完成，共并发生成 {chapters_to_generate} 章")
    except Exception as e:
        logger.error(f"书籍 {book_id} 定时生成失败: {e}")
        if retry_count < MAX_RETRIES:
            logger.info(f"将在30秒后重试（第 {retry_count + 1}/{MAX_RETRIES} 次）")
            await asyncio.sleep(30)
            await scheduled_generation(book_id, retry_count + 1)
        else:
            log = GenerationLog(
                book_id=book_id,
                ai_provider="system",
                model_name="system",
                status="failed",
                error_message=f"定时生成失败，已重试{MAX_RETRIES}次: {str(e)[:200]}",
            )
            db.add(log)
            db.commit()
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