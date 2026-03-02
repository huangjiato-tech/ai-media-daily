# 传媒人自己的 AI 日报

**线上 Demo：** [ai-media-daily-production.up.railway.app](https://ai-media-daily-production.up.railway.app)

---

## 为什么会有这个项目？

我是一名在传媒行业工作的导演。

每天早上，我都要在微信群、RSS 订阅、行业网站之间来回切换，花上半个小时，才能大概搞清楚"AI 最近在我们这个行业发生了什么"。这半小时，本可以用来喝一杯咖啡、和同事聊一个创意、或者多睡十五分钟。

我不想再这样了。

于是我用 AI 帮我做了这件事——每小时自动抓取全球传媒行业的 AI 动态，用 DeepSeek 筛选、摘要、翻译，整理成一份你打开就能读的日报。

现在我把它开源，希望能帮同行每天节省哪怕 5 分钟。

---

## 功能

- 覆盖中国、日本、韩国、欧美 4 大区域
- DeepSeek AI 自动筛选相关新闻并生成中文摘要
- 非中文标题自动翻译为中文
- X（Twitter）业界观点中英对照展示
- 每小时自动更新，仅保留 48 小时内的新闻

---

## 本地运行

### 1. 克隆项目

```bash
git clone https://github.com/huangjiato-tech/ai-media-daily.git
cd ai-media-daily
```

### 2. 获取 DeepSeek API Key

前往 [platform.deepseek.com](https://platform.deepseek.com) 注册并创建 API Key。

### 3. 配置环境变量

```bash
cp .env.example .env
```

用任意编辑器打开 `.env`，填入你的 Key：

```
DEEPSEEK_API_KEY=sk-你的密钥
```

### 4. 安装依赖并启动

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

DEEPSEEK_API_KEY=$(grep DEEPSEEK_API_KEY .env | cut -d= -f2) \
  venv/bin/uvicorn main:app --reload --port 8000
```

浏览器访问 [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 部署到 Railway

1. Fork 本仓库
2. 在 [Railway](https://railway.app) 新建项目，选择从 GitHub 导入
3. 在项目 **Variables** 里添加 `DEEPSEEK_API_KEY`
4. 部署完成，访问你自己的专属日报

---

## 技术栈

- **后端：** Python · FastAPI · httpx · feedparser
- **AI：** DeepSeek API（兼容 OpenAI SDK）
- **前端：** 原生 HTML / CSS / JavaScript
- **部署：** Railway

---

## 如果你也是传媒人

欢迎来找我聊聊。

我们在[小焱文化](https://xiaoyanlab.netlify.app/)持续探索 AI 与传媒创作结合的可能——不只是工具，更是一种新的工作方式。

如果这个项目帮你省下了几分钟，或者给了你一点启发，欢迎 Star、Fork，或者直接来官网留言。

> *"技术是手段，让传媒人活得更好才是目的。"*
