from pydantic import BaseModel, field_validator
from typing import List, Optional

class CampaignCreateRequest(BaseModel):
    name: str
    geo: List[str]
    offer_id: int

    @field_validator('geo')
    def check_geo(cls, v):
        if not v:
            raise ValueError('geo must not be empty')
        for code in v:
            if not (len(code) == 2 and code.isalpha() and code.isupper()):
                raise ValueError(f'Invalid country code: {code}')
        return v

class OfferActionRequest(BaseModel):
    offer_id: int

# --- Схемы для Push ---

class OfferItem(BaseModel):
    offer_id: int
    share: int
    pinned: bool = False
    is_orphaned: bool = False

    @field_validator('share')
    def check_share(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Share must be between 0 and 100')
        return v

class StreamPushRequest(BaseModel):
    stream_id: int
    offers: List[OfferItem] = []
    filters: Optional[List[dict]] = None 

    @field_validator('offers')
    def check_total_share(cls, v):
        # Проверяем, что сумма share не больше 100 (игнорируем orphaned)
        total = sum(o.share for o in v if not o.is_orphaned)
        if total > 100:
            raise ValueError(f'Total share for stream exceeds 100%: {total}')
        return v

class CampaignPushRequest(BaseModel):
    streams: List[StreamPushRequest]