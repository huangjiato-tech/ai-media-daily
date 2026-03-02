import json
import os
import httpx
from openai import AsyncOpenAI

SYSTEM_PROMPT = """你是一位专注于全球传媒行业的 AI 应用分析师。
你的任务是从提供的新闻列表中筛选出最有价值的内容，并生成简洁的中文摘要。

筛选标准（必须满足至少一条）：
1. AI/机器学习技术在新闻媒体、广播电视、出版行业的实际应用
2. 媒体公司使用 AI 改变内容生产、分发或商业模式的案例
3. AI 对新闻从业者工作方式的影响（包括机遇与挑战）
4. 媒体行业监管机构对 AI 的政策与规范

排除以下内容：
- 纯学术论文或技术研究（无媒体应用场景）
- 通用 AI 产品发布（与传媒无直接关联）
- 纯投融资资讯（无媒体应用描述）
- 娱乐八卦或影视评论

输出要求：
- 从输入列表中选出 5-8 篇最相关的文章
- 按相关性评分（0-10）降序排列
- 每篇生成 2-3 句中文摘要，突出传媒 AI 应用要点
- 【必填】title_zh 字段：每篇文章都必须填写，不得留空。规则：若原标题为中文则直接复制原文；若为日文、韩文、英文或其他语言，则必须将其翻译成流畅的中文填入
- 严格返回 JSON 格式，不要有任何其他文字"""

USER_PROMPT_TEMPLATE = """请从以下 {count} 篇文章中筛选出与传媒 AI 应用最相关的内容：

{articles}

请返回如下 JSON 格式（title_zh 为必填字段，示例：英文标题 "AI reshapes newsrooms" → title_zh 填 "AI重塑新闻编辑室"；日文标题 "AIが放送を変える" → title_zh 填 "AI正在改变广播业"）：
{{
  "articles": [
    {{
      "title": "原始标题（保持原样）",
      "title_zh": "中文标题（必填：中文标题直接复制；非中文标题翻译为中文）",
      "link": "原始链接",
      "summary": "2-3句中文摘要",
      "source": "来源",
      "published": "发布时间",
      "relevance_score": 8.5
    }}
  ]
}}"""


def _format_articles(articles: list[dict]) -> str:
    lines = []
    for i, a in enumerate(articles, 1):
        lines.append(f"{i}. 标题：{a.get('title', '')}")
        lines.append(f"   链接：{a.get('link', '')}")
        lines.append(f"   来源：{a.get('source', '')}")
        summary = a.get("summary", "")
        if summary:
            lines.append(f"   摘要：{summary[:200]}")
        lines.append("")
    return "\n".join(lines)


def _is_chinese(text: str) -> bool:
    return bool(text) and '\u4e00' <= text[0] <= '\u9fff'


def _needs_translation(title_zh: str) -> bool:
    """Return True if title_zh still contains Japanese kana or Korean hangul."""
    if not title_zh:
        return True
    for ch in title_zh:
        if '\u3040' <= ch <= '\u309f':  # hiragana
            return True
        if '\u30a0' <= ch <= '\u30ff':  # katakana
            return True
        if '\uac00' <= ch <= '\ud7a3':  # hangul
            return True
    return False


async def _translate_titles(client: AsyncOpenAI, titles: list[str]) -> list[str]:
    if not titles:
        return []
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
    prompt = (
        f"将以下标题翻译为中文，简洁流畅，直接返回 JSON：\n{numbered}\n"
        f'格式：{{"translations": ["译文1", "译文2", ...]}}'
    )
    try:
        resp = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=800,
        )
        data = json.loads(resp.choices[0].message.content)
        translations = data.get("translations", [])
        result = [""] * len(titles)
        for i, t in enumerate(translations[:len(titles)]):
            result[i] = t
        return result
    except Exception:
        pass
    return [""] * len(titles)


async def curate_articles(articles: list[dict], region: str) -> list[dict]:
    if not articles:
        return []

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        return _fallback(articles)

    proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
    http_client = httpx.AsyncClient(proxy=proxy, trust_env=False)
    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
        http_client=http_client,
    )

    formatted = _format_articles(articles[:40])
    user_prompt = USER_PROMPT_TEMPLATE.format(
        count=min(len(articles), 40),
        articles=formatted,
    )

    try:
        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=4000,
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        curated = data.get("articles", [])

        # Build lookup to restore published dates from raw articles
        link_to_published = {
            a["link"]: a.get("published", "")
            for a in articles
            if a.get("link")
        }

        for a in curated:
            a["region"] = region
            # Restore published date from raw feed if AI left it blank
            if not a.get("published") and a.get("link") in link_to_published:
                a["published"] = link_to_published[a["link"]]

        # Fill/fix title_zh: copy Chinese titles; translate others (incl. JP/KR left untranslated)
        to_translate = []
        translate_indices = []
        for i, a in enumerate(curated):
            title = a.get("title", "")
            title_zh = a.get("title_zh", "")
            if _needs_translation(title_zh):
                if _is_chinese(title):
                    a["title_zh"] = title
                else:
                    to_translate.append(title)
                    translate_indices.append(i)

        if to_translate:
            translations = await _translate_titles(client, to_translate)
            for i, idx in enumerate(translate_indices):
                if i < len(translations):
                    curated[idx]["title_zh"] = translations[i]

        return curated
    except (json.JSONDecodeError, KeyError):
        return _fallback(articles[:8], region)
    except Exception:
        return _fallback(articles[:8], region)


def _fallback(articles: list[dict], region: str = "") -> list[dict]:
    result = []
    for a in articles[:8]:
        item = dict(a)
        item["summary"] = item.get("summary", "") or "(AI摘要暂时不可用)"
        if len(item["summary"]) > 300:
            item["summary"] = item["summary"][:297] + "..."
        item["relevance_score"] = 5.0
        item["region"] = region
        title = item.get("title", "")
        item["title_zh"] = title if _is_chinese(title) else ""
        result.append(item)
    return result
