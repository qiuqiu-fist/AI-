import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import init_db, SessionLocal
from app.routers import books, chapters, providers, schedule, templates, system
from app.services.scheduler import scheduler, setup_schedules

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        setup_schedules(db)
    finally:
        db.close()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Novel Writer API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(chapters.router)
app.include_router(providers.router)
app.include_router(schedule.router)
app.include_router(templates.router)
app.include_router(system.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")