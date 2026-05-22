import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db, DB_PATH
from app.models.book import Book
from app.models.chapter import Chapter
from app.schemas.system import SystemStatus, SystemSettings
from app.services.scheduler import get_schedule_status

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/status", response_model=SystemStatus)
def get_status(db: Session = Depends(get_db)):
    db_size = "0 B"
    if os.path.exists(DB_PATH):
        size = os.path.getsize(DB_PATH)
        db_size = f"{size / 1024:.1f} KB" if size < 1024 * 1024 else f"{size / 1024 / 1024:.1f} MB"
    return SystemStatus(
        db_size=db_size,
        books_count=db.query(Book).count(),
        chapters_count=db.query(Chapter).count(),
        active_schedules=len(get_schedule_status()),
    )


@router.get("/settings", response_model=SystemSettings)
def get_settings():
    return SystemSettings()


@router.put("/settings", response_model=SystemSettings)
def update_settings(data: SystemSettings):
    return data