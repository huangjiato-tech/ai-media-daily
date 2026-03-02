import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from cache import cache
from curator import curate_articles
from fetchers import fetch_all

REGIONS_DISPLAY = {
    "中国": "🇨🇳 中国",
    "日本": "🇯🇵 日本",
    "韩国": "🇰🇷 韩国",
    "欧美": "🌍 欧美",
    "Twitter": "🐦 Twitter",
}

CACHE_KEY = "news_data"


async def build_news_data() -> dict:
    raw = await fetch_all()

    tasks = []
    regions = []
    for region, articles in raw.items():
        if articles:
            tasks.append(curate_articles(articles, region))
            regions.append(region)

    results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for i, region in enumerate(regions):
        r = results[i]
        if isinstance(r, list):
            for article in r:
                article["region"] = region
                article["region_display"] = REGIONS_DISPLAY.get(region, region)
            output.extend(r)

    output.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

    return {
        "articles": output,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(output),
    }


async def warmup():
    try:
        data = await build_news_data()
        cache.set(CACHE_KEY, data)
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(warmup())
    yield


app = FastAPI(title="AI传媒日报", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/624f42be81b12a53c4414ce77289839d.txt")
async def wechat_verify():
    return PlainTextResponse("675fdae05e7c8b887d4fb822f6df55b21a17e02d")


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.get("/api/news")
async def get_news(force_refresh: bool = Query(False)):
    if not force_refresh:
        cached = cache.get(CACHE_KEY)
        if cached:
            return {**cached, "cache_hit": True}

    data = await build_news_data()
    cache.set(CACHE_KEY, data)
    return {**data, "cache_hit": False}


@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
