from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.keitaro_client import keitaro_client
from app.schemas import CampaignPushRequest, OfferItem
from app.models import StreamDraft, OfferCache
from typing import List

router = APIRouter(prefix="/api/streams", tags=["streams"])

@router.get("/{campaign_id}")
async def get_streams(
    campaign_id: int, 
    pull: bool = False, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Получаем потоки из Keitaro (без изменений)
    keitaro_streams = await keitaro_client.get_streams(campaign_id, db=db)
    
    # 2. Получаем черновики из БД
    result = await db.execute(select(StreamDraft).where(StreamDraft.campaign_id == campaign_id))
    drafts = result.scalars().all()
    
    # 3. Если pull=True, синхронизируем БД
    if pull:
        draft_map = {(d.stream_id, d.offer_id): d for d in drafts}
        for d in drafts:
            d.is_orphaned = True
        
        for stream in keitaro_streams:
            for offer in stream.get("offers", []):
                key = (stream["id"], offer["offer_id"])
                if key in draft_map:
                    draft_map[key].is_orphaned = False
                    if not draft_map[key].pinned:
                        draft_map[key].share = offer.get("share", 100)
                else:
                    new_draft = StreamDraft(
                        campaign_id=campaign_id,
                        stream_id=stream["id"],
                        offer_id=offer["offer_id"],
                        share=offer.get("share", 100),
                        is_orphaned=False
                    )
                    db.add(new_draft)
        await db.commit()
        
        # Перечитываем
        result = await db.execute(select(StreamDraft).where(StreamDraft.campaign_id == campaign_id))
        drafts = result.scalars().all()

    # 4. Формируем ответ: Keitaro + local_drafts
    response_streams = []
    for stream in keitaro_streams:
        stream_id = stream["id"]
        
        # Собираем local_drafts для этого потока
        stream_drafts = [d for d in drafts if d.stream_id == stream_id]
        local_drafts = []
        for d in stream_drafts:
            # Подтягиваем name из кэша
            cache_res = await db.execute(select(OfferCache).where(OfferCache.id == d.offer_id))
            cached = cache_res.scalar_one_or_none()
            local_drafts.append({
                "offer_id": d.offer_id,
                "share": d.share,
                "pinned": d.pinned,
                "is_orphaned": d.is_orphaned,
                "name": cached.name if cached else "Unknown"
            })
        
        # Копируем поток из Keitaro без изменений
        response_stream = dict(stream)
        response_stream["local_drafts"] = local_drafts
        response_streams.append(response_stream)
    
    return response_streams


@router.post("/{campaign_id}/push")
async def push_streams(
    campaign_id: int, 
    payload: CampaignPushRequest, 
    db: AsyncSession = Depends(get_db)
):
    for stream_payload in payload.streams:
        stream_id = stream_payload.stream_id
        
        # Формируем payload для Keitaro
        update_payload = {}
        
        # Если есть офферы — добавляем их (только не-сироты)
        if stream_payload.offers:
            offers_to_push = [
                {"offer_id": o.offer_id, "share": o.share, "state": "active"}
                for o in stream_payload.offers if not o.is_orphaned
            ]
            update_payload["offers"] = offers_to_push
        
        # Если есть фильтры — добавляем их
        if stream_payload.filters is not None:
            update_payload["filters"] = stream_payload.filters
        
        # Отправляем PUT, если есть что обновлять
        if update_payload:
            await keitaro_client.update_stream(stream_id, update_payload, db=db)
        
        # Обновляем БД (только для потоков с офферами)
        if stream_payload.offers:
            # Удаляем все драфты для этого потока
            await db.execute(
                delete(StreamDraft).where(StreamDraft.stream_id == stream_id)
            )
            # Записываем заново
            for o in stream_payload.offers:
                db.add(StreamDraft(
                    campaign_id=campaign_id,
                    stream_id=stream_id,
                    offer_id=o.offer_id,
                    share=o.share,
                    pinned=o.pinned,
                    is_orphaned=o.is_orphaned
                ))
            
    await db.commit()
    return {"status": "ok", "message": "Streams pushed successfully"}
