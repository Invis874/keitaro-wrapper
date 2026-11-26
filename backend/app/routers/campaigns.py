from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.keitaro_client import keitaro_client
from app.schemas import CampaignCreateRequest
from app.config import settings
from app.models import OfferCache
from sqlalchemy import select, delete

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.post("/")
async def create_campaign(req: CampaignCreateRequest, db: AsyncSession = Depends(get_db)):
    # 1. Создаём кампанию
    campaign = await keitaro_client.create_campaign(
        name=req.name,
        domain_id=settings.default_domain_id,
        group_id=settings.default_group_id,
        source_id=settings.default_source_id,
        db=db
    )
    campaign_id = campaign["id"]

    # 2. Поток Google (GEO)
    geo_stream_payload = {
        "type": "regular",
        "schema": "redirect",
        "action_type": "http",
        "action_payload": "https://google.com",
        "filters": [{"name": "country", "mode": "accept", "payload": req.geo}],
    }
    await keitaro_client.create_stream(campaign_id, "Geo Google", geo_stream_payload, db=db)

    # 3. Поток с оффером
    offer_stream_payload = {
        "type": "default",
        "schema": "landings",
        "offers": [{"offer_id": req.offer_id, "share": 100, "state": "active"}],
    }
    await keitaro_client.create_stream(campaign_id, "Offer Stream", offer_stream_payload, db=db)

    return {"status": "ok", "campaign_id": campaign_id}


@router.get("/")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    campaigns = await keitaro_client.get_campaigns(db=db)
    return campaigns

# --- Синхронизация офферов (для автокомплита) ---

@router.post("/sync-offers")
async def sync_offers(db: AsyncSession = Depends(get_db)):
    offers = await keitaro_client.get_offers(db=db)
    # Очищаем старый кэш (в реальном проекте лучше делать upsert)
    await db.execute(delete(OfferCache))
    for offer in offers:
        db.add(OfferCache(id=offer["id"], name=offer.get("name", ""), raw_data=offer))
    await db.commit()
    return {"status": "ok", "count": len(offers)}

@router.get("/offers")
async def search_offers(q: str = "", db: AsyncSession = Depends(get_db)):
    query = select(OfferCache)
    if q:
        query = query.where(OfferCache.name.ilike(f"%{q}%"))
    result = await db.execute(query)
    return result.scalars().all()