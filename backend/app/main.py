from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import campaigns, streams

app = FastAPI(title="Keitaro Wrapper")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для теста; в проде сузить
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns.router)
app.include_router(streams.router)

@app.on_event("startup")
async def startup():
    await init_db()

@app.get("/")
async def root():
    return {"message": "Keitaro Wrapper API is running"}