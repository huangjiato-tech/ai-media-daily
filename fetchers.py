import asyncio
import os
import re
from datetime import datetime, timezone, timedelta
import feedparser
import httpx

_ARTICLE_MAX_AGE_DAYS = 30

_GOOGLE_NEWS_RE = re.compile(r'^"[^"]+" - (Google.+)$')


def _clean_source(title: str) -> str:
    """Simplify noisy RSS feed titles for display."""
    m = _GOOGLE_NEWS_RE.match(title)
    if m:
        return m.group(1)
    if " / @" in title:
        return title.split(" / @")[0].strip()
    return title

TIMEOUT = 15
MAX_ITEMS_PER_FEED = 15

NITTER_INSTANCES = [
    "https://nitter.net",
    "https://nitter.privacydev.net",
    "https://nitter.poast.org",
    "https://nitter.1d4.us",
]

FEEDS = {
    "中国": [
        "https://news.google.com/rss/search?q=传媒+AI&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
        "https://news.google.com/rss/search?q=媒体+人工智能&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
        "https://news.google.com/rss/search?q=新媒体+人工智能&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
        "https://news.google.com/rss/search?q=广播电视+人工智能&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
        "https://news.google.com/rss/search?q=传媒+大模型&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
        "https://36kr.com/feed",
        "https://www.huxiu.com/rss/0.xml",
        "https://www.qbitai.com/feed",
        "https://www.jiqizhixin.com/rss",
        "https://www.tmtpost.com/feed",
        "https://www.ithome.com/rss/",
    ],
    "日本": [
        "https://news.google.com/rss/search?q=メディア+AI+放送&hl=ja&gl=JP&ceid=JP:ja",
        "https://news.google.com/rss/search?q=メディア+人工知能&hl=ja&gl=JP&ceid=JP:ja",
    ],
    "韩国": [
        "https://news.google.com/rss/search?q=미디어+AI+방송&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=언론+인공지능&hl=ko&gl=KR&ceid=KR:ko",
    ],
    "欧美": [
        "https://news.google.com/rss/search?q=media+AI+broadcasting&hl=en-US&gl=US&ceid=US:en",
        "https://news.google.com/rss/search?q=journalism+artificial+intelligence&hl=en-US&gl=US&ceid=US:en",
        "https://digiday.com/feed/",
        "https://www.niemanlab.org/feed/",
        "https://www.axios.com/feeds/feed.rss",
    ],
}

TWITTER_ACCOUNTS = ["NiemanLab", "Digiday", "axios", "Reuters", "BBCBreaking"]


def _make_client() -> httpx.AsyncClient:
    """创建 httpx 客户端，跳过损坏的环境代理变量，手动读取 https_proxy。"""
    proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
    return httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0 (compatible; AIMediaDaily/1.0)"},
        proxy=proxy,
        trust_env=False,
        timeout=TIMEOUT,
    )


def _is_recent(pub_str: str) -> bool:
    """Return True if article date is within _ARTICLE_MAX_AGE_DAYS, or date is unknown."""
    if not pub_str:
        return True
    try:
        from email.utils import parsedate_to_datetime
        d = parsedate_to_datetime(pub_str)
        cutoff = datetime.now(timezone.utc) - timedelta(days=_ARTICLE_MAX_AGE_DAYS)
        return d >= cutoff
    except Exception:
        return True


def _parse_feed_text(text: str, url: str, limit: int = MAX_ITEMS_PER_FEED) -> list[dict]:
    feed = feedparser.parse(text)
    items = []
    for entry in feed.entries[:limit * 2]:  # scan more to compensate for filtered-out old items
        pub = entry.get("published", entry.get("updated", ""))
        if not _is_recent(pub):
            continue
        items.append({
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "summary": entry.get("summary", entry.get("description", "")),
            "published": pub,
            "source": _clean_source(feed.feed.get("title", url)),
        })
        if len(items) >= limit:
            break
    return items


async def _fetch_feed(client: httpx.AsyncClient, url: str) -> list[dict]:
    try:
        resp = await client.get(url, timeout=TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        return _parse_feed_text(resp.text, url)
    except Exception:
        return []


async def _fetch_nitter_account(client: httpx.AsyncClient, account: str) -> list[dict]:
    for instance in NITTER_INSTANCES:
        url = f"{instance}/{account}/rss"
        try:
            resp = await client.get(url, timeout=TIMEOUT, follow_redirects=True)
            if resp.status_code == 200:
                items = _parse_feed_text(resp.text, url)
                if items:
                    return items
        except Exception:
            continue
    return []


async def fetch_region(region: str) -> list[dict]:
    urls = FEEDS.get(region, [])
    async with _make_client() as client:
        tasks = [_fetch_feed(client, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    items = []
    for r in results:
        if isinstance(r, list):
            items.extend(r)

    seen_links = set()
    unique = []
    for item in items:
        if item["link"] and item["link"] not in seen_links:
            seen_links.add(item["link"])
            unique.append(item)

    return unique


async def fetch_twitter() -> list[dict]:
    async with _make_client() as client:
        tasks = [_fetch_nitter_account(client, acct) for acct in TWITTER_ACCOUNTS]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    items = []
    for r in results:
        if isinstance(r, list):
            items.extend(r)
    return items


async def fetch_all() -> dict[str, list[dict]]:
    regions = list(FEEDS.keys())
    tasks = [fetch_region(r) for r in regions]
    tasks.append(fetch_twitter())

    results = await asyncio.gather(*tasks, return_exceptions=True)

    data: dict[str, list[dict]] = {}
    for i, region in enumerate(regions):
        r = results[i]
        data[region] = r if isinstance(r, list) else []

    twitter_result = results[-1]
    data["Twitter"] = twitter_result if isinstance(twitter_result, list) else []

    return data
