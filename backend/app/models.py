from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class OfferCache(Base):
    """Кэш офферов, чтобы автокомплит работал быстро и не дёргал Keitaro каждый раз."""
    __tablename__ = "offers_cache"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    # В Keitaro у оффера может быть много полей, сохраним всё в JSON на всякий случай
    raw_data = Column(JSON, nullable=True)


class ApiLog(Base):
    """Лог запросов к Keitaro API. Показывает историю действий."""
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String)
    path = Column(String)
    request_body = Column(JSON, nullable=True)
    response_status = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StreamDraft(Base):
    __tablename__ = "stream_drafts"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, index=True)
    stream_id = Column(Integer, index=True)
    offer_id = Column(Integer, index=True)
    share = Column(Integer, default=100)
    pinned = Column(Boolean, default=False)
    is_orphaned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())