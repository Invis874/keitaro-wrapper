import httpx
from typing import Any, Optional
from app.config import settings
from app.models import ApiLog
from sqlalchemy.ext.asyncio import AsyncSession

class KeitaroClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Api-Key": api_key, "Content-Type": "application/json"}
        self.client = httpx.AsyncClient(headers=self.headers, base_url=self.base_url, timeout=30.0)

    async def _log_request(self, db: Optional[AsyncSession], method: str, path: str, body: dict, status: int):
        if db:
            log = ApiLog(method=method, path=path, request_body=body, response_status=status)
            db.add(log)
            await db.commit()

    async def _request(self, method: str, path: str, db: Optional[AsyncSession] = None, **kwargs) -> Any:
        body = kwargs.get("json")
        resp = await self.client.request(method, path, **kwargs)
        await self._log_request(db, method, path, body, resp.status_code)
        resp.raise_for_status()
        return resp.json()

    async def get_campaigns(self, db: Optional[AsyncSession] = None) -> list[dict]:
        return await self._request("GET", "/campaigns", db=db)

    async def create_campaign(self, name: str, domain_id: int, group_id: int, source_id: int, db: Optional[AsyncSession] = None) -> dict:
        payload = {
            "name": name,
            "domain_id": domain_id,
            "group_id": group_id,
            "traffic_source_id": source_id,
        }
        return await self._request("POST", "/campaigns", db=db, json=payload)

    async def create_stream(self, campaign_id: int, name: str, payload: dict, db: Optional[AsyncSession] = None) -> dict:
        full_payload = {"campaign_id": campaign_id, "name": name, **payload}
        return await self._request("POST", "/streams", db=db, json=full_payload)

    async def get_streams(self, campaign_id: int, db: Optional[AsyncSession] = None) -> list[dict]:
        return await self._request("GET", f"/campaigns/{campaign_id}/streams", db=db)

    async def get_stream(self, stream_id: int, db: Optional[AsyncSession] = None) -> dict:
        return await self._request("GET", f"/streams/{stream_id}", db=db)

    async def update_stream(self, stream_id: int, payload: dict, db: Optional[AsyncSession] = None) -> dict:
        return await self._request("PUT", f"/streams/{stream_id}", db=db, json=payload)

    async def get_offers(self, db: Optional[AsyncSession] = None) -> list[dict]:
        return await self._request("GET", "/offers", db=db)

# Глобальный экземпляр (или можно создавать в зависимости от контекста)
keitaro_client = KeitaroClient(settings.keitaro_url, settings.keitaro_api_key)