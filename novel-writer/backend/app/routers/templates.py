from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.template import Template
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    return db.query(Template).order_by(Template.updated_at.desc()).all()


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "模板不存在")
    return t


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    t = Template(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(template_id: int, data: TemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "模板不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(t, key, val)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "模板不存在")
    db.delete(t)
    db.commit()
    return {"message": "删除成功"}