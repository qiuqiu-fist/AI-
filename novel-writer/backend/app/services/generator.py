import datetime
import json
import os
from sqlalchemy.orm import Session
from app.models.book import Book
from app.models.chapter import Chapter
from app.models.ai_config import AIConfig
from app.models.generation_log import GenerationLog
from app.services.ai_providers import AIController
from app.services.prompt_builder import build_generation_prompt
from app.services.exporter import export_chapter


async def generate_chapter(book_id: int, db: Session) -> Chapter:
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise ValueError("书籍不存在")

    ai_config = db.query(AIConfig).filter(AIConfig.is_default == True, AIConfig.enabled == True).first()
    if not ai_config:
        ai_config = db.query(AIConfig).filter(AIConfig.enabled == True).first()
    if not ai_config:
        raise ValueError("没有可用的 AI 配置，请先添加 AI 来源")

    existing_chapters = db.query(Chapter).filter(Chapter.book_id == book_id).order_by(Chapter.chapter_number).all()
    previous_summary = ""
    if existing_chapters:
        last = existing_chapters[-1]
        if last.content and len(last.content) > 0:
            summary = last.content[:150].replace('\n', ' ').strip()
            previous_summary = f"上一章《{last.title}》概要：{summary}..."
        else:
            previous_summary = f"上一章《{last.title}》（内容为空）"

    prompt = build_generation_prompt(book, previous_summary)

    folder_config = {}
    config_path = os.path.join(book.output_folder or "", "novel-config.json")
    if book.output_folder and os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                folder_config = json.load(f)
            if folder_config.get("outline"):
                book.theme_config["outline"] = folder_config["outline"]
        except (json.JSONDecodeError, IOError) as e:
            pass

    log = GenerationLog(
        book_id=book_id,
        ai_provider=ai_config.provider_name,
        model_name=ai_config.model_name,
        status="running",
        started_at=datetime.datetime.utcnow(),
    )
    db.add(log)
    db.commit()

    try:
        controller = AIController()
        provider_config = {
            "api_base_url": ai_config.api_base_url,
            "api_key": ai_config.api_key,
            "model_name": ai_config.model_name,
            "max_tokens": ai_config.max_tokens,
            "temperature": ai_config.temperature,
            "top_p": ai_config.top_p,
            "template_content": "",
        }
        content = await controller.generate(ai_config.provider_name, prompt, provider_config)

        chapter_number = len(existing_chapters) + 1
        chapter = Chapter(
            book_id=book_id,
            title=f"第{chapter_number}章",
            content=content,
            chapter_number=chapter_number,
            status="generated",
            word_count=len(content),
            ai_provider=ai_config.provider_name,
            model_name=ai_config.model_name,
            prompt_used=prompt,
            generated_date=datetime.date.today(),
        )
        db.add(chapter)
        db.commit()

        file_path = export_chapter(book, chapter, db)
        chapter.file_path = file_path
        chapter.status = "exported"
        db.commit()

        log.status = "success"
        log.chapter_id = chapter.id
        log.completed_at = datetime.datetime.utcnow()
        db.commit()

        return chapter

    except Exception as e:
        log.status = "failed"
        log.error_message = str(e)
        log.completed_at = datetime.datetime.utcnow()
        db.commit()
        raise


async def regenerate_chapter(chapter_id: int, db: Session) -> Chapter:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise ValueError("章节不存在")
    return await generate_chapter(chapter.book_id, db)