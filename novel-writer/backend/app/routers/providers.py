from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.ai_config import AIConfig
from app.schemas.ai_config import AIConfigCreate, AIConfigUpdate, AIConfigResponse
from app.services.ai_providers import AIController

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("/types")
def list_provider_types():
    controller = AIController()
    return controller.list_providers()


@router.get("", response_model=List[AIConfigResponse])
def list_provider_configs(db: Session = Depends(get_db)):
    return db.query(AIConfig).order_by(AIConfig.created_at.desc()).all()


@router.post("", response_model=AIConfigResponse, status_code=201)
def create_provider_config(data: AIConfigCreate, db: Session = Depends(get_db)):
    if data.is_default:
        db.query(AIConfig).filter(AIConfig.is_default == True).update({"is_default": False})
    config = AIConfig(**data.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.put("/{config_id}", response_model=AIConfigResponse)
def update_provider_config(config_id: int, data: AIConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "配置不存在")
    if data.is_default:
        db.query(AIConfig).filter(AIConfig.is_default == True).update({"is_default": False})
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(config, key, val)
    db.commit()
    db.refresh(config)
    return config


@router.delete("/{config_id}")
def delete_provider_config(config_id: int, db: Session = Depends(get_db)):
    config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "配置不存在")
    db.delete(config)
    db.commit()
    return {"message": "删除成功"}


@router.post("/{config_id}/test")
async def test_provider(config_id: int, db: Session = Depends(get_db)):
    config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "配置不存在")
    controller = AIController()
    provider = controller.get_provider(config.provider_name)
    if not provider:
        raise HTTPException(400, "不支持的 AI 来源类型")
    ok, msg = await provider.test_connection({
        "api_base_url": config.api_base_url,
        "api_key": config.api_key,
    })
    return {"success": ok, "message": msg}


@router.patch("/{config_id}/default")
def set_default_provider(config_id: int, db: Session = Depends(get_db)):
    config = db.query(AIConfig).filter(AIConfig.id == config_id).first()
    if not config:
        raise HTTPException(404, "配置不存在")
    db.query(AIConfig).filter(AIConfig.is_default == True).update({"is_default": False})
    config.is_default = True
    db.commit()
    return {"message": "已设为默认"}