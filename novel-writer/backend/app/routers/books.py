from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.book import Book
from app.schemas.book import BookCreate, BookUpdate, BookResponse
from app.services.scheduler import add_book_schedule, remove_book_schedule

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=List[BookResponse])
def list_books(db: Session = Depends(get_db)):
    return db.query(Book).order_by(Book.updated_at.desc()).all()


@router.post("", response_model=BookResponse, status_code=201)
def create_book(data: BookCreate, db: Session = Depends(get_db)):
    book = Book(**data.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    if book.schedule_enabled and book.status == "active":
        add_book_schedule(book)
    return book


@router.get("/{book_id}", response_model=BookResponse)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    return book


@router.put("/{book_id}", response_model=BookResponse)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(book, key, val)
    db.commit()
    db.refresh(book)
    if book.schedule_enabled and book.status == "active":
        add_book_schedule(book)
    else:
        remove_book_schedule(book_id)
    return book


@router.delete("/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(404, "书籍不存在")
    remove_book_schedule(book_id)
    db.delete(book)
    db.commit()
    return {"message": "删除成功"}