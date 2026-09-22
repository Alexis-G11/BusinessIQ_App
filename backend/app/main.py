from fastapi import FastAPI

app = FastAPI(title="BusinessIQ API")

@app.get("/health")
def health():
    return {"status": "ok"}
