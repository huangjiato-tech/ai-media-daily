# 传媒人自己的 AI 日报

**线上 Demo：** [ai-media-daily-production.up.railway.app](https://ai-media-daily-production.up.railway.app)

---

## 为什么会有这个项目？

我是一名传媒行业的导演，每天要花半小时在信息海洋里打捞"AI 与传媒"的最新动态。于是我用 AI 做了这份日报——自动抓取、筛选、翻译，打开即读。我把它开源，只希望能帮同行每天省下几分钟，去喝杯咖啡，或者多想一个创意。欢迎访问[小焱文化官网](https://xiaoyanlab.netlify.app/)或联系我。

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
