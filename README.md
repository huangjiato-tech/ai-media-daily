# 传媒人自己的 AI 日报

聚合全球传媒行业 AI 应用最新动态，由 DeepSeek 自动筛选并生成中文摘要。

**线上 Demo：** [ai-media-daily-production.up.railway.app](https://ai-media-daily-production.up.railway.app)

---

## 功能

- 覆盖中国、日本、韩国、欧美 4 大区域
- DeepSeek AI 自动筛选相关新闻并生成中文摘要
- 非中文标题自动翻译为中文
- X（Twitter）业界观点中英对照展示
- 每小时自动更新，仅保留 48 小时内的新闻

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
4. 部署完成后即可访问

---

## 技术栈

- **后端：** Python · FastAPI · httpx · feedparser
- **AI：** DeepSeek API（兼容 OpenAI SDK）
- **前端：** 原生 HTML / CSS / JavaScript
- **部署：** Railway

---

开发制作：[小焱文化](https://xiaoyanlab.netlify.app/)
