/* ═══════════════════════════════════════════════════════════════════
   AI 传媒日报 — App Logic
   ═══════════════════════════════════════════════════════════════════ */

// ─── Constants ───────────────────────────────────────────────────────
const REGIONS_ORDER = ["中国", "日本", "韩国", "欧美"];

const REGION_COLORS = {
  "中国": "#EF4444",
  "日本": "#EC4899",
  "韩国": "#8B5CF6",
  "欧美": "#10B981",
  "Twitter": "#3B82F6",
};

// ─── State ────────────────────────────────────────────────────────────
let allData        = null;
let currentRegion  = "中国";
let isLoading      = false;
let twitterAutoId  = null;

// ─── Utilities ───────────────────────────────────────────────────────
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(str) {
  if (!str) return "";
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str.substring(0, 16);
    return d.toLocaleDateString("zh-CN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
  } catch { return ""; }
}

// ─── Reading Progress Bar ────────────────────────────────────────────
function updateProgress() {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "0%";
}

// ─── Back-to-Top ──────────────────────────────────────────────────────
function updateBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (btn) btn.classList.toggle("visible", window.scrollY > 400);
}

// ─── Navbar Scroll ────────────────────────────────────────────────────
function initNavbarScroll() {
  window.addEventListener("scroll", () => {
    const nav = document.getElementById("navbar");
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 10);
    updateProgress();
    updateBackToTop();
  }, { passive: true });
}

// ─── Hero Parallax ───────────────────────────────────────────────────
function initParallax() {
  const content = document.getElementById("hero-content");
  if (!content) return;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    // Content drifts up slightly slower than page scroll → depth effect
    content.style.transform = `translateY(${y * 0.28}px)`;
    content.style.opacity   = `${Math.max(0, 1 - y / (window.innerHeight * 0.65))}`;
  }, { passive: true });
}

// ─── Tab Ink Underline ───────────────────────────────────────────────
function positionInk(activeTab) {
  const ink    = document.getElementById("tab-ink");
  const inner  = document.getElementById("region-nav-inner");
  if (!ink || !activeTab || !inner) return;
  const navRect = inner.getBoundingClientRect();
  const btnRect = activeTab.getBoundingClientRect();
  ink.style.left  = `${btnRect.left - navRect.left + inner.scrollLeft}px`;
  ink.style.width = `${btnRect.width}px`;
}

// ─── Tab Switching ────────────────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll(".region-tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const region = tab.dataset.region;
      if (region === currentRegion) return;

      const prevIdx = REGIONS_ORDER.indexOf(currentRegion);
      const nextIdx = REGIONS_ORDER.indexOf(region);
      const dir     = nextIdx > prevIdx ? "right" : "left";

      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      positionInk(tab);

      currentRegion = region;
      if (allData) renderRegion(allData[region] || [], region, dir);
    });
  });

  // Initial ink position (after fonts layout)
  requestAnimationFrame(() => positionInk(document.querySelector(".region-tab.active")));
}

// ─── toggleOrigTitle (called from inline onclick) ─────────────────────
function toggleOrigTitle(btn) {
  const el     = btn.nextElementSibling;
  const isOpen = el.classList.contains("open");
  el.classList.toggle("open", !isOpen);
  btn.textContent = isOpen ? "原标题 ▼" : "原标题 ▲";
}

// ─── Render: Featured Card ────────────────────────────────────────────
function renderFeaturedCard(article, regionColor) {
  const orig    = article.title    || "无标题";
  const zh      = article.title_zh || "";
  const title   = escapeHtml(zh || orig);
  const link    = escapeHtml(article.link    || "#");
  const summary = escapeHtml(article.summary || "");
  const source  = escapeHtml(article.source  || "");
  const date    = formatDate(article.published);
  const score   = article.relevance_score ? article.relevance_score.toFixed(1) : "";

  const toggle  = (zh && zh !== orig) ? `
    <button class="card-orig-toggle" onclick="toggleOrigTitle(this)">原标题 ▼</button>
    <div class="card-orig-title">${escapeHtml(orig)}</div>` : "";

  return `
    <div class="card-featured">
      <div class="card-featured-accent" style="background:${regionColor}"></div>
      <div class="card-featured-label">今日头条</div>
      <div class="card-featured-title">
        <a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>
        ${toggle}
      </div>
      ${summary ? `<div class="card-featured-summary">${summary}</div>` : ""}
      <div class="card-featured-footer">
        ${source ? `<span class="card-source">${source}</span>` : ""}
        ${score  ? `<span class="card-featured-score">${score} 分</span>` : ""}
        ${date   ? `<span class="card-date">${date}</span>` : ""}
      </div>
    </div>`;
}

// ─── Render: Regular Card ─────────────────────────────────────────────
function renderCard(article, regionColor, colIdx) {
  const orig    = article.title    || "无标题";
  const zh      = article.title_zh || "";
  const title   = escapeHtml(zh || orig);
  const link    = escapeHtml(article.link    || "#");
  const summary = escapeHtml(article.summary || "");
  const source  = escapeHtml(article.source  || "");
  const date    = formatDate(article.published);
  const score   = article.relevance_score ? article.relevance_score.toFixed(1) : "";

  const toggle  = (zh && zh !== orig) ? `
      <button class="card-orig-toggle" onclick="toggleOrigTitle(this)">原标题 ▼</button>
      <div class="card-orig-title">${escapeHtml(orig)}</div>` : "";

  // Stagger delay based on column position in the 3-col grid
  const delay   = `${colIdx * 80}ms`;

  return `
    <div class="card" style="transition-delay:${delay}">
      <div class="card-accent-bar" style="background:${regionColor}"></div>
      ${score ? `<span class="card-score-badge">${score}</span>` : ""}
      <div class="card-source-tag">${source}</div>
      <div class="card-title">
        <a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>
        ${toggle}
      </div>
      ${summary ? `<div class="card-summary">${summary}</div>` : ""}
      <div class="card-footer">
        <span class="card-source">${source}</span>
        ${date ? `<span class="card-date">${date}</span>` : ""}
      </div>
    </div>`;
}

// ─── Render: Region Panel ─────────────────────────────────────────────
function renderRegion(articles, region, slideDir) {
  const container = document.getElementById("news-container");
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = '<div class="empty-msg">该区域暂无新闻，请稍后刷新</div>';
    return;
  }

  const color            = REGION_COLORS[region] || "#3B82F6";
  const [featured, ...rest] = articles;
  const dirClass         = slideDir ? ` slide-in-${slideDir}` : "";

  container.innerHTML = `
    <div class="region-panel${dirClass}">
      <div class="cards-grid">
        ${renderFeaturedCard(featured, color)}
        ${rest.map((a, i) => renderCard(a, color, i % 3)).join("")}
      </div>
    </div>`;

  // Trigger reveal after paint
  requestAnimationFrame(() => requestAnimationFrame(setupRevealAnimations));
}

// ─── Render: Twitter Card (bilingual 中英对照) ────────────────────────
function renderTwitterCard(article) {
  const source   = article.source    || "Media";
  const initial  = source.charAt(0).toUpperCase();
  const titleEn  = escapeHtml(article.title     || "");
  const titleZh  = escapeHtml(article.title_zh  || "");
  const summary  = escapeHtml(article.summary   || "");
  const link     = escapeHtml(article.link      || "#");
  const date     = formatDate(article.published);
  const handle   = source.toLowerCase().replace(/\s+/g, "");

  // Chinese content: prefer title_zh, fall back to summary
  const zhContent = titleZh || summary;
  // Show English original only when we have a Chinese translation to pair with
  const showEn    = zhContent && titleEn && titleEn !== titleZh;

  return `
    <div class="twitter-card">
      <div class="twitter-card-header">
        <div class="twitter-avatar">${initial}</div>
        <div>
          <div class="twitter-username">${escapeHtml(source)}</div>
          <div class="twitter-handle">@${handle}</div>
        </div>
      </div>
      ${zhContent ? `
      <div class="twitter-content-zh">
        <a href="${link}" target="_blank" rel="noopener noreferrer">${zhContent}</a>
      </div>` : ""}
      ${showEn ? `
      <div class="twitter-bilingual-sep"></div>
      <div class="twitter-content-en">${titleEn}</div>` : ""}
      ${(!zhContent && titleEn) ? `
      <div class="twitter-content-zh">
        <a href="${link}" target="_blank" rel="noopener noreferrer">${titleEn}</a>
      </div>` : ""}
      ${date ? `<div class="twitter-card-date">${date}</div>` : ""}
    </div>`;
}

// ─── Render: Twitter Section ──────────────────────────────────────────
function renderTwitterSection(articles) {
  const section = document.getElementById("twitter-section");
  const track   = document.getElementById("twitter-track");
  if (!section || !track) return;

  if (!articles || articles.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  track.innerHTML = articles.map(renderTwitterCard).join("");
  initTwitterScroll();
}

// ─── Twitter Drag + Auto-scroll ───────────────────────────────────────
function initTwitterScroll() {
  const area = document.getElementById("twitter-scroll-area");
  if (!area) return;

  // Clear any previous auto-scroll
  if (twitterAutoId) clearInterval(twitterAutoId);

  let isDown   = false;
  let startX   = 0;
  let scrollLeft = 0;

  function startAuto() {
    if (twitterAutoId) clearInterval(twitterAutoId);
    twitterAutoId = setInterval(() => {
      if (isDown) return;
      area.scrollLeft += 1;
      if (area.scrollLeft + area.offsetWidth >= area.scrollWidth - 2) {
        area.scrollLeft = 0;
      }
    }, 28);
  }

  function stopAuto() {
    if (twitterAutoId) { clearInterval(twitterAutoId); twitterAutoId = null; }
  }

  // Pause on hover
  area.addEventListener("mouseenter", stopAuto);
  area.addEventListener("mouseleave", () => { if (!isDown) startAuto(); });

  // Drag to scroll
  area.addEventListener("mousedown", e => {
    isDown     = true;
    startX     = e.pageX - area.offsetLeft;
    scrollLeft = area.scrollLeft;
    stopAuto();
  });

  area.addEventListener("mousemove", e => {
    if (!isDown) return;
    e.preventDefault();
    const x   = e.pageX - area.offsetLeft;
    area.scrollLeft = scrollLeft - (x - startX) * 1.4;
  });

  const endDrag = () => { isDown = false; startAuto(); };
  area.addEventListener("mouseup",    endDrag);
  area.addEventListener("mouseleave", endDrag);

  // Touch
  area.addEventListener("touchstart", e => {
    startX     = e.touches[0].pageX;
    scrollLeft = area.scrollLeft;
    stopAuto();
  }, { passive: true });

  area.addEventListener("touchmove", e => {
    area.scrollLeft = scrollLeft - (e.touches[0].pageX - startX);
  }, { passive: true });

  area.addEventListener("touchend", () => startAuto(), { passive: true });

  startAuto();
}

// ─── Skeleton Screens ─────────────────────────────────────────────────
function renderSkeletons(container) {
  container.innerHTML = `
    <div class="skeleton-grid">
      <div class="skeleton-card skeleton-featured">
        <div class="skeleton sk-tag"></div>
        <div class="skeleton sk-title"></div>
        <div class="skeleton sk-title2"></div>
        <div class="sk-spacer"></div>
        <div class="skeleton sk-short"></div>
      </div>
      ${Array(5).fill(`
        <div class="skeleton-card">
          <div class="skeleton sk-tag"></div>
          <div class="skeleton sk-title"></div>
          <div class="skeleton sk-title2"></div>
          <div class="skeleton sk-line"></div>
          <div class="skeleton sk-line2"></div>
          <div class="skeleton sk-short"></div>
        </div>`).join("")}
    </div>`;
}

// ─── IntersectionObserver Reveal ──────────────────────────────────────
function setupRevealAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.07 });

  document.querySelectorAll(".card:not(.revealed), .card-featured:not(.revealed)")
    .forEach(el => observer.observe(el));
}

// ─── Render All News ──────────────────────────────────────────────────
function renderNews(data) {
  // Group articles by region
  allData = {};
  for (const article of data.articles || []) {
    const r = article.region || "其他";
    if (!allData[r]) allData[r] = [];
    allData[r].push(article);
  }

  // Update hero tagline with today's top headline
  const topList = allData[currentRegion] || allData["中国"] || [];
  if (topList.length > 0) {
    const taglineEl = document.getElementById("hero-tagline");
    if (taglineEl) {
      const headline = topList[0].title_zh || topList[0].title || "";
      if (headline) {
        taglineEl.textContent =
          `今日焦点：${headline.length > 42 ? headline.substring(0, 42) + "…" : headline}`;
      }
    }
  }

  renderRegion(allData[currentRegion] || [], currentRegion);
  renderTwitterSection(allData["Twitter"] || []);
}

// ─── Update Time Display ─────────────────────────────────────────────
function setUpdateTime(isoStr, cacheHit) {
  const el = document.getElementById("update-time");
  if (!el) return;
  if (!isoStr) { el.textContent = ""; return; }
  const d = new Date(isoStr);
  el.textContent = `${cacheHit ? "上次更新" : "刚刚更新"} ${d.toLocaleString("zh-CN", {
    month:"short", day:"numeric", hour:"2-digit", minute:"2-digit",
  })}`;
}

// ─── Fetch News from API ──────────────────────────────────────────────
async function fetchNews(forceRefresh = false) {
  if (isLoading) return;
  isLoading = true;

  const btn       = document.getElementById("refresh-btn");
  const container = document.getElementById("news-container");
  const errorEl   = document.getElementById("error-msg");

  if (btn)     btn.classList.add("loading");
  if (errorEl) errorEl.style.display = "none";
  if (!forceRefresh) renderSkeletons(container);

  try {
    const url  = `/api/news${forceRefresh ? "?force_refresh=true" : ""}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderNews(data);
    setUpdateTime(data.updated_at, data.cache_hit);
  } catch (err) {
    console.error("Fetch failed:", err);
    if (errorEl) {
      errorEl.textContent = `加载失败：${err.message}。请稍后重试。`;
      errorEl.style.display = "block";
    }
    if (!container.querySelector(".card, .card-featured")) {
      container.innerHTML = '<div class="empty-msg">数据加载失败，请点击刷新重试</div>';
    }
  } finally {
    isLoading = false;
    if (btn) btn.classList.remove("loading");
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Today's date in hero
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("zh-CN", {
      year:"numeric", month:"long", day:"numeric", weekday:"long",
    }).toUpperCase();
  }

  // Back-to-top click
  const backBtn = document.getElementById("back-to-top");
  if (backBtn) backBtn.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));

  // Refresh button
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", () => fetchNews(true));

  initNavbarScroll();
  initParallax();
  initTabs();
  fetchNews(false);
});
