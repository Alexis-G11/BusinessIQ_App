from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import customers

app = FastAPI(title="BusinessIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your actual frontend URL(s) before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)


@app.get("/health")
def health():
    return {"status": "ok"}