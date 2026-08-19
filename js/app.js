/* =========================================================
 * 巴西美客多 & TikTok 手机壳数据分析面板
 * ========================================================= */
(function () {
  "use strict";

  const ML = "Mercado Livre";
  const TT = "TikTok Shop";
  const C_ML = "#ffd60a";
  const C_TT = "#ff2d78";
  const C_GRAY = "#94a3b8";
  const C_BLUE = "#00e5ff";

  /* ---------------- 格式化 ---------------- */
  const fmtBRL = (v) => "R$ " + (v == null ? "-" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const fmtInt = (v) => (v == null ? "-" : Number(v).toLocaleString("pt-BR"));
  const compact = (v) => {
    v = Number(v) || 0;
    if (v >= 100000) return (v / 100000).toFixed(1) + "万";
    if (v >= 10000) return (v / 10000).toFixed(1) + "万";
    if (v >= 1000) return (v / 1000).toFixed(1) + "k";
    return String(v);
  };
  const pct1 = (v) => (v == null ? "-" : v.toFixed(1) + "%");

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- 状态 ---------------- */
  const State = {
    all: [],
    rows: [],
    filters: { platform: "all", brand: "all", material: "all", minPrice: "", maxPrice: "", minRating: "0", keyword: "" },
    table: { page: 1, perPage: 20, sortKey: "sales", sortDir: -1, kw: "" },
    modelRankKey: "n",
    sourceName: "示例数据"
  };

  const els = {};
  function cacheEls() {
    els.filters = {
      platform: $("#f-platform"), brand: $("#f-brand"), material: $("#f-material"),
      minPrice: $("#f-min-price"), maxPrice: $("#f-max-price"), minRating: $("#f-rating"), keyword: $("#f-keyword")
    };
    els.charts = {
      platformDonut: $("#chart-platform"),
      avgPrice: $("#chart-avg-price"),
      avgSales: $("#chart-avg-sales"),
      priceHist: $("#chart-price-hist"),
      ratingHist: $("#chart-rating-hist"),
      bandSales: $("#chart-band-sales"),
      monthly: $("#chart-monthly"),
      topSales: $("#chart-top-sales"),
      topBrands: $("#chart-top-brands"),
      topModels: $("#chart-top-models"),
      topSellers: $("#chart-top-sellers"),
      scatter: $("#chart-scatter"),
      materials: $("#chart-materials"),
      keywords: $("#chart-keywords"),
      sellerType: $("#chart-seller-type"),
      stateDist: $("#chart-state-dist"),
      colorDist: $("#chart-color-dist"),
      installFree: $("#chart-install-free")
    };
    els.compareBody = $("#compare-body");
    els.insights = $("#insights");
    els.tableBody = $("#table-body");
    els.tableHead = $("#table-head");
    els.pager = $("#pager");
    els.kpis = {
      total: $("#kpi-total"), price: $("#kpi-price"), sales: $("#kpi-sales"),
      rating: $("#kpi-rating"), reviews: $("#kpi-reviews"), median: $("#kpi-median")
    };
    els.summary = $("#summary-strip");
    els.rangeInfo = $("#range-info");
    els.tableCount = $("#table-count");
    els.modelRankBody = $("#model-rank-body");
    els.modelRankSort = $("#model-rank-sort");
    els.modelRankCount = $("#model-rank-count");
  }

  /* ---------------- 数据加载与校验 ---------------- */
  function normalizeRecord(r) {
    const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    const platform = String(r.platform || "").trim();
    const plat = /tiktok/i.test(platform) ? TT : /mercado|美客多|ml/i.test(platform) ? ML : platform || "-";
    return {
      id: String(r.id || ""),
      platform: plat,
      title: String(r.title || ""),
      brand: String(r.brand || "未知品牌"),
      model: String(r.model || ""),
      material: String(r.material || "其他"),
      price_brl: num(r.price_brl != null ? r.price_brl : r.price, 0),
      original_price_brl: r.original_price_brl == null && r.original_price == null ? null : num(r.original_price_brl != null ? r.original_price_brl : r.original_price, 0),
      sales: num(r.sales, 0),
      rating: num(r.rating, 0),
      reviews: num(r.reviews, 0),
      seller: String(r.seller || ""),
      listed_date: String(r.listed_date || ""),
      shipping_free: r.shipping_free === true || r.shipping_free === "true" || r.shipping_free === 1 || r.shipping_free === "1" || r.shipping_free === "sim",
      color: String(r.color || ""),
      condition: String(r.condition || ""),
      seller_type: String(r.seller_type || "Vendedor"),
      state: String(r.state || ""),
      city: String(r.city || ""),
      installments_count: r.installments_count == null ? null : num(r.installments_count, 0),
      interest_free: r.interest_free === true || r.interest_free === "true" || r.interest_free === 1 || r.interest_free === "1",
      available_quantity: r.available_quantity == null ? null : num(r.available_quantity, 0)
    };
  }

  function validate(records) {
    if (!Array.isArray(records) || !records.length) throw new Error("未解析到任何记录");
    const ok = records.filter((r) => r && r.title && r.platform);
    if (!ok.length) throw new Error("缺少必要字段（title / platform）");
    return ok.map(normalizeRecord);
  }

  function loadSample() {
    State.all = validate((window.SAMPLE_DATA || []).slice());
    State.sourceName = "内置示例数据";
    refreshOptions();
    applyFilters(true);
    toast("已载入示例数据（" + State.all.length + " 条）");
  }

  function setData(records, name) {
    State.all = validate(records);
    State.sourceName = name;
    refreshOptions();
    applyFilters(true);
  }

  /* ---------------- 选项刷新 ---------------- */
  function refreshOptions() {
    const brands = [...new Set(State.all.map((r) => r.brand))].sort((a, b) => a.localeCompare(b));
    const mats = [...new Set(State.all.map((r) => r.material))].sort((a, b) => a.localeCompare(b));
    fillSelect(els.filters.brand, brands, "全部品牌", State.filters.brand);
    fillSelect(els.filters.material, mats, "全部材质", State.filters.material);
  }
  function fillSelect(sel, values, allLabel, keep) {
    sel.innerHTML = '<option value="all">' + allLabel + "</option>" +
      values.map((v) => '<option value="' + esc(v) + '">' + esc(v) + "</option>").join("");
    sel.value = keep && values.includes(keep) ? keep : "all";
  }

  /* ---------------- 筛选 ---------------- */
  function applyFilters(silent) {
    const f = State.filters;
    const rows = State.all.filter((r) => {
      if (f.platform !== "all" && r.platform !== f.platform) return false;
      if (f.brand !== "all" && r.brand !== f.brand) return false;
      if (f.material !== "all" && r.material !== f.material) return false;
      if (f.minPrice !== "" && r.price_brl < parseFloat(f.minPrice)) return false;
      if (f.maxPrice !== "" && r.price_brl > parseFloat(f.maxPrice)) return false;
      if (parseFloat(f.minRating) > 0 && r.rating < parseFloat(f.minRating)) return false;
      if (f.keyword) {
        const k = f.keyword.toLowerCase();
        const hay = (r.title + " " + r.brand + " " + r.model + " " + r.seller + " " + r.material).toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
    State.rows = rows;
    State.table.page = 1;
    renderAll();
    if (!silent) toast("已按条件筛选，共 " + rows.length + " 条商品");
  }

  /* ---------------- 统计 ---------------- */
  function statsFor(rows) {
    const n = rows.length;
    if (!n) return null;
    const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
    const avg = (k) => sum(k) / n;
    const prices = rows.map((r) => r.price_brl).sort((a, b) => a - b);
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
    const rated = rows.filter((r) => r.rating > 0);
    return {
      n, avgPrice: avg("price_brl"), medianPrice: median, minPrice: prices[0] || 0, maxPrice: prices[prices.length - 1] || 0,
      totalSales: sum("sales"), avgSales: avg("sales"),
      avgRating: rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0,
      highRatingShare: rated.length ? (rated.filter((r) => r.rating >= 4.5).length / rated.length) * 100 : 0,
      avgReviews: avg("reviews"), totalReviews: sum("reviews"),
      freeShipShare: (rows.filter((r) => r.shipping_free).length / n) * 100
    };
  }

  /* ---------------- 指标卡 ---------------- */
  function renderKpis() {
    const rows = State.rows;
    const total = rows.length;
    if (!total) {
      $$(".kpi-card").forEach((c) => { c.style.opacity = 0.4; });
      return;
    }
    $$(".kpi-card").forEach((c) => { c.style.opacity = 1; });
    const all = statsFor(rows);
    const ml = statsFor(rows.filter((r) => r.platform === ML));
    const tt = statsFor(rows.filter((r) => r.platform === TT));
    const set = (el, val, subHtml) => {
      el.querySelector(".kpi-value").innerHTML = val;
      el.querySelector(".kpi-sub").innerHTML = subHtml || "";
    };
    const sub2 = (a, b) =>
      '<span><span class="dot" style="background:' + C_ML + '"></span>美客多 ' + a + "</span>" +
      '<span><span class="dot" style="background:' + C_TT + '"></span>TikTok ' + b + "</span>";

    set(els.kpis.total, fmtInt(all.n), sub2(ml ? fmtInt(ml.n) : "0", tt ? fmtInt(tt.n) : "0"));
    set(els.kpis.price, fmtBRL(all.avgPrice), sub2(ml ? fmtBRL(ml.avgPrice) : "-", tt ? fmtBRL(tt.avgPrice) : "-"));
    set(els.kpis.sales, compact(all.totalSales) + ' <small>单</small>', sub2(ml ? compact(ml.totalSales) : "0", tt ? compact(tt.totalSales) : "0"));
    set(els.kpis.rating, all.avgRating ? all.avgRating.toFixed(2) + ' <small>分</small>' : "-", sub2(ml ? ml.avgRating.toFixed(2) : "-", tt ? tt.avgRating.toFixed(2) : "-"));
    set(els.kpis.reviews, fmtInt(all.totalReviews) + ' <small>条</small>', sub2(ml ? compact(ml.totalReviews) : "0", tt ? compact(tt.totalReviews) : "0"));
    set(els.kpis.median, fmtBRL(all.medianPrice), sub2(ml ? fmtBRL(ml.medianPrice) : "-", tt ? fmtBRL(tt.medianPrice) : "-"));
  }

  /* ---------------- 汇总条 ---------------- */
  function renderSummary() {
    const rows = State.rows;
    const n = rows.length;
    els.rangeInfo.textContent = State.sourceName + " · 当前筛选 " + fmtInt(n) + " 条商品";
    if (!n) { els.summary.innerHTML = '<span class="muted">没有符合条件的数据</span>'; return; }
    const s = statsFor(rows);
    const ml = statsFor(rows.filter((r) => r.platform === ML));
    const tt = statsFor(rows.filter((r) => r.platform === TT));
    const chip = (label, val) => '<span class="summary-chip">' + label + "：<b>" + val + "</b></span>";
    let html = "";
    html += chip("价格区间", fmtBRL(s.minPrice) + " ~ " + fmtBRL(s.maxPrice));
    html += chip("总销量(估算)", fmtInt(s.totalSales) + " 单");
    html += chip("平均每品销量", fmtInt(Math.round(s.avgSales)) + " 单");
    html += chip("高分商品占比(≥4.5)", pct1(s.highRatingShare));
    html += chip("免邮占比", pct1(s.freeShipShare));
    if (ml && tt) {
      const diff = ((tt.avgPrice - ml.avgPrice) / ml.avgPrice) * 100;
      html += chip("TT 相对 ML 均价", (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%");
      const ts = ((tt.totalSales || 0) / (s.totalSales || 1)) * 100;
      html += chip("TT 销量占比", pct1(ts));
    }
    els.summary.innerHTML = html;
  }

  /* ---------------- 图表 ---------------- */
  function groupByPlatform(rows) {
    return { ml: rows.filter((r) => r.platform === ML), tt: rows.filter((r) => r.platform === TT) };
  }
  const PRICE_BANDS = [
    { label: "<10", min: 0, max: 10 }, { label: "10-15", min: 10, max: 15 },
    { label: "15-20", min: 15, max: 20 }, { label: "20-25", min: 20, max: 25 },
    { label: "25-30", min: 25, max: 30 }, { label: "30-40", min: 30, max: 40 },
    { label: "40-50", min: 40, max: 50 }, { label: "50-70", min: 50, max: 70 },
    { label: "70+", min: 70, max: Infinity }
  ];
  const RATING_BANDS = [
    { label: "3.0-3.5", min: 3.0, max: 3.5 }, { label: "3.5-4.0", min: 3.5, max: 4.0 },
    { label: "4.0-4.5", min: 4.0, max: 4.5 }, { label: "4.5-5.0", min: 4.5, max: 5.0 }
  ];
  function binCounts(rows, bands, key) {
    return bands.map((b) => rows.filter((r) => r[key] >= b.min && r[key] < b.max).length);
  }
  function binAvgSales(rows, bands) {
    return bands.map((b) => {
      const sub = rows.filter((r) => r.price_brl >= b.min && r.price_brl < b.max);
      return sub.length ? sub.reduce((s, r) => s + r.sales, 0) / sub.length : 0;
    });
  }

  const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "com", "para", "capa", "celular", "capinha", "case", "protetora", "o", "a", "os", "as", "e", "em", "no", "na", "um", "uma", "por", "pro", "pra", "que", "v2", "v3", "nova", "novo", "completa", "kit", "1x", "2x"]);
  function topKeywords(rows, topN) {
    const count = {};
    rows.forEach((r) => {
      String(r.title || "").toLowerCase().split(/[^a-zà-ú0-9]+/i).forEach((w) => {
        w = w.trim();
        if (!w || w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) return;
        count[w] = (count[w] || 0) + 1;
      });
    });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, topN)
      .map(([k, v]) => ({ label: k, value: v }));
  }

  function renderCharts() {
    const rows = State.rows;
    const g = groupByPlatform(rows);
    const total = rows.length;
    if (!total) {
      Object.values(els.charts).forEach((c) => { c.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; });
      return;
    }

    /* 1. 平台商品占比 */
    Charts.donut(els.charts.platformDonut, {
      items: [
        { label: "美客多", value: g.ml.length, color: C_ML },
        { label: "TikTok", value: g.tt.length, color: C_TT }
      ],
      height: 250, centerText: fmtInt(total), centerSub: "商品总数", valueFormat: fmtInt
    });

    /* 2. 平均售价 */
    const sml = statsFor(g.ml), stt = statsFor(g.tt);
    Charts.bar(els.charts.avgPrice, {
      labels: ["美客多", "TikTok"],
      series: [{ name: "平均售价", values: [sml ? sml.avgPrice : 0, stt ? stt.avgPrice : 0], color: C_BLUE }],
      height: 240, yFormat: (v) => "R$" + Math.round(v), yLabel: "R$"
    });

    /* 3. 平均销量 & 平均评分 */
    Charts.bar(els.charts.avgSales, {
      labels: ["美客多", "TikTok"],
      series: [
        { name: "平均销量(单)", values: [sml ? sml.avgSales : 0, stt ? stt.avgSales : 0], color: "#a855f7" },
        { name: "平均评分(×10)", values: [sml ? sml.avgRating * 10 : 0, stt ? stt.avgRating * 10 : 0], color: "#34d399" }
      ],
      height: 240, compact: true, yLabel: ""
    });

    /* 4. 价格分布 */
    const bands = PRICE_BANDS.map((b) => b.label);
    Charts.bar(els.charts.priceHist, {
      labels: bands,
      series: [
        { name: "美客多", values: binCounts(g.ml, PRICE_BANDS, "price_brl"), color: C_ML },
        { name: "TikTok", values: binCounts(g.tt, PRICE_BANDS, "price_brl"), color: C_TT }
      ],
      height: 280, compact: true, xLabel: "价格区间 (R$)", yLabel: "商品数"
    });

    /* 5. 评分分布 */
    Charts.bar(els.charts.ratingHist, {
      labels: RATING_BANDS.map((b) => b.label),
      series: [
        { name: "美客多", values: binCounts(g.ml, RATING_BANDS, "rating"), color: C_ML },
        { name: "TikTok", values: binCounts(g.tt, RATING_BANDS, "rating"), color: C_TT }
      ],
      height: 280, compact: true, xLabel: "评分区间", yLabel: "商品数"
    });

    /* 6. 价格带平均销量 */
    Charts.bar(els.charts.bandSales, {
      labels: bands,
      series: [
        { name: "美客多", values: binAvgSales(g.ml, PRICE_BANDS), color: C_ML },
        { name: "TikTok", values: binAvgSales(g.tt, PRICE_BANDS), color: C_TT }
      ],
      height: 260, compact: true, xLabel: "价格区间 (R$)", yLabel: "平均销量"
    });

    /* 7. 月度上新 */
    const months = monthSeries(rows);
    Charts.bar(els.charts.monthly, {
      labels: months.labels,
      series: [
        { name: "美客多", values: months.ml, color: C_ML },
        { name: "TikTok", values: months.tt, color: C_TT }
      ],
      height: 260, compact: true, xLabel: "上架月份", yLabel: "商品数"
    });

    /* 8. Top 10 销量 */
    const top10 = rows.slice().sort((a, b) => b.sales - a.sales).slice(0, 10);
    Charts.hbar(els.charts.topSales, {
      items: top10.map((r) => ({
        label: r.title, value: r.sales,
        color: r.platform === ML ? C_ML : C_TT,
        sub: r.platform === ML ? "ML" : "TT"
      })),
      height: 330, valueFormat: compact
    });

    /* 9. 品牌 Top 10 */
    const brandMap = {};
    rows.forEach((r) => {
      brandMap[r.brand] = brandMap[r.brand] || { total: 0, ml: 0, tt: 0, sales: 0 };
      brandMap[r.brand].total++;
      brandMap[r.brand][r.platform === ML ? "ml" : "tt"]++;
      brandMap[r.brand].sales += r.sales;
    });
    const topBrands = Object.entries(brandMap).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    Charts.hbar(els.charts.topBrands, {
      items: topBrands.map(([name, d]) => ({
        label: name, value: d.total,
        color: d.ml === 0 ? C_TT : d.tt === 0 ? C_ML : C_GRAY,
        sub: "ML " + d.ml + " / TT " + d.tt + " · 销量 " + compact(d.sales)
      })),
      height: 330, valueFormat: fmtInt
    });

    /* 13. 适配机型 Top 10 */
    const modelMap = {};
    rows.forEach((r) => {
      const m = r.model || "未知机型";
      modelMap[m] = modelMap[m] || { n: 0, sales: 0, brand: r.brand };
      modelMap[m].n++; modelMap[m].sales += r.sales;
    });
    const topModels = Object.entries(modelMap).sort((a, b) => b[1].n - a[1].n).slice(0, 10);
    Charts.hbar(els.charts.topModels, {
      items: topModels.map(([name, d]) => ({
        label: name, value: d.n,
        color: C_BLUE,
        sub: d.brand + " · 销量 " + compact(d.sales)
      })),
      height: 330, valueFormat: fmtInt
    });

    /* 14. 卖家/店铺 Top 10 */
    const sellerMap = {};
    rows.forEach((r) => {
      const sel = r.seller || "未知卖家";
      sellerMap[sel] = sellerMap[sel] || { total: 0, ml: 0, tt: 0, sales: 0 };
      sellerMap[sel].total++;
      sellerMap[sel][r.platform === ML ? "ml" : "tt"]++;
      sellerMap[sel].sales += r.sales;
    });
    const topSellers = Object.entries(sellerMap).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    Charts.hbar(els.charts.topSellers, {
      items: topSellers.map(([name, d]) => ({
        label: name, value: d.total,
        color: d.ml === 0 ? C_TT : d.tt === 0 ? C_ML : C_GRAY,
        sub: "ML " + d.ml + " / TT " + d.tt + " · 销量 " + compact(d.sales)
      })),
      height: 330, valueFormat: fmtInt
    });

    /* 10. 价格-销量散点 */
    const withSales = rows.filter((r) => r.sales > 0);
    const step = Math.max(1, Math.ceil(withSales.length / 300));
    const sampled = withSales.filter((_, i) => i % step === 0).slice(0, 300);
    Charts.scatter(els.charts.scatter, {
      points: sampled.map((r) => ({
        x: r.price_brl, y: r.sales,
        color: r.platform === ML ? C_ML : C_TT, r: 4,
        tip: "<b>" + esc(Charts.truncate(r.title, 60)) + "</b><br/>" +
          (r.platform === ML ? "美客多" : "TikTok") + " · " + fmtBRL(r.price_brl) + "<br/>销量 " + fmtInt(r.sales) + " · 评分 " + (r.rating || "-")
      })),
      height: 300, xLabel: "价格 (R$)", yLabel: "销量（单）",
      xFormat: (v) => "R$" + Math.round(v), yFormat: (v) => compact(v)
    });

    /* 11. 材质分布 */
    const matMap = {};
    rows.forEach((r) => { matMap[r.material] = (matMap[r.material] || 0) + 1; });
    const PALETTE = ["#00e5ff", "#7c3aed", "#0891b2", "#ffd60a", "#ff2d78", "#34d399", "#ff4d6d", "#8b5cf6", "#14b8a6", "#fb923c", "#a855f7", "#64748b"];
    const mats = Object.entries(matMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    Charts.donut(els.charts.materials, {
      items: mats.map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] })),
      height: 300, centerText: fmtInt(total), centerSub: "商品数", valueFormat: fmtInt
    });

    /* 12. 关键词 */
    Charts.hbar(els.charts.keywords, {
      items: topKeywords(rows, 15).map((k) => ({ label: k.label, value: k.value, color: C_BLUE })),
      height: 400, valueFormat: fmtInt
    });

    /* 15. 卖家类型占比 */
    const stMap = {};
    rows.forEach((r) => { stMap[r.seller_type] = (stMap[r.seller_type] || 0) + 1; });
    const stItems = Object.entries(stMap).sort((a, b) => b[1] - a[1]);
    Charts.donut(els.charts.sellerType, {
      items: stItems.map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] })),
      height: 260, centerText: fmtInt(total), centerSub: "商品数", valueFormat: fmtInt
    });

    /* 16. 卖家州分布 */
    const stateMap = {};
    rows.forEach((r) => { if (r.state) stateMap[r.state] = (stateMap[r.state] || 0) + 1; });
    const topStates = Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    Charts.hbar(els.charts.stateDist, {
      items: topStates.map(([k, v]) => ({ label: k, value: v, color: C_BLUE })),
      height: 300, valueFormat: fmtInt
    });

    /* 17. 颜色 Top 10 */
    const colorMap = {};
    rows.forEach((r) => { if (r.color) colorMap[r.color] = (colorMap[r.color] || 0) + 1; });
    const topColors = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    Charts.hbar(els.charts.colorDist, {
      items: topColors.map(([k, v]) => ({ label: k, value: v, color: "#a855f7" })),
      height: 300, valueFormat: fmtInt
    });

    /* 18. 免息分期占比 */
    const freeShare = (platRows) => platRows.length ? (platRows.filter((r) => r.interest_free).length / platRows.length) * 100 : 0;
    Charts.bar(els.charts.installFree, {
      labels: ["美客多", "TikTok"],
      series: [{ name: "免息分期商品占比", values: [freeShare(g.ml), freeShare(g.tt)], color: C_BLUE }],
      height: 260, yFormat: (v) => Math.round(v) + "%", yLabel: "%"
    });
  }

  function monthSeries(rows) {
    const map = {};
    rows.forEach((r) => {
      const m = String(r.listed_date || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(m)) return;
      map[m] = map[m] || { ml: 0, tt: 0 };
      map[m][r.platform === ML ? "ml" : "tt"]++;
    });
    const keys = Object.keys(map).sort();
    const last = keys.slice(-12);
    return {
      labels: last.map((k) => k.slice(2).replace("-", "/")),
      ml: last.map((k) => map[k].ml),
      tt: last.map((k) => map[k].tt)
    };
  }

  /* ---------------- 对比表 ---------------- */
  function renderCompare() {
    const rows = State.rows;
    const ml = statsFor(rows.filter((r) => r.platform === ML));
    const tt = statsFor(rows.filter((r) => r.platform === TT));
    if (!rows.length) { els.compareBody.innerHTML = '<tr><td colspan="3" class="center muted">暂无数据</td></tr>'; return; }
    const rowsDef = [
      ["商品数", (s) => fmtInt(s.n)],
      ["平均售价", (s) => fmtBRL(s.avgPrice)],
      ["价格中位数", (s) => fmtBRL(s.medianPrice)],
      ["最低 / 最高价", (s) => fmtBRL(s.minPrice) + " / " + fmtBRL(s.maxPrice)],
      ["平均销量(单)", (s) => fmtInt(Math.round(s.avgSales))],
      ["总销量(估算)", (s) => fmtInt(s.totalSales)],
      ["平均评分", (s) => s.avgRating ? s.avgRating.toFixed(2) : "-"],
      ["高分占比 ≥4.5", (s) => pct1(s.highRatingShare)],
      ["平均评论数", (s) => fmtInt(Math.round(s.avgReviews))],
      ["评论总数", (s) => fmtInt(s.totalReviews)],
      ["免邮占比", (s) => pct1(s.freeShipShare)]
    ];
    const order = [
      ["n", false], ["avgPrice", false], ["medianPrice", false], [null, null],
      ["avgSales", true], ["totalSales", true], ["avgRating", true], ["highRatingShare", true],
      ["avgReviews", true], ["totalReviews", true], ["freeShipShare", true]
    ];
    const pick = (s1, s2, isHigherBetter) => {
      if (s1 == null || s2 == null) return -1;
      const a = isHigherBetter ? s1 - s2 : s2 - s1;
      return a > 0 ? 0 : a < 0 ? 1 : -1;
    };
    els.compareBody.innerHTML = rowsDef.map(([label, fn], i) => {
      const winner = order[i][0] == null ? -1 : pick(ml ? ml[order[i][0]] : 0, tt ? tt[order[i][0]] : 0, order[i][1]);
      const td = (val, side) => {
        const cls = side === "ml" ? "ml" : "tt";
        const w = winner === (side === "ml" ? 0 : 1) ? " winner" : "";
        return '<td class="' + cls + w + '">' + val + "</td>";
      };
      return "<tr><td>" + label + "</td>" + td(ml ? fn(ml) : "-", "ml") + td(tt ? fn(tt) : "-", "tt") + "</tr>";
    }).join("");
  }

  /* ---------------- 智能解读 ---------------- */
  function renderInsights() {
    const rows = State.rows;
    const ul = els.insights;
    if (!rows.length) { ul.innerHTML = '<li class="muted">暂无数据</li>'; return; }
    const s = statsFor(rows);
    const ml = statsFor(rows.filter((r) => r.platform === ML));
    const tt = statsFor(rows.filter((r) => r.platform === TT));
    const items = [];
    const li = (ic, html) => '<li><span class="ic" style="background:rgba(0,229,255,.12)">' + ic + "</span><span>" + html + "</span></li>";

    if (ml && tt) {
      const priceDiff = ((tt.avgPrice - ml.avgPrice) / ml.avgPrice) * 100;
      items.push(li("💰", "TikTok 均价 <b>" + fmtBRL(tt.avgPrice) + "</b>，比美客多 <b>" + fmtBRL(ml.avgPrice) + "</b> <span class='num'>" + (priceDiff >= 0 ? "+" : "") + priceDiff.toFixed(1) + "%</span>。" +
        (priceDiff < 0 ? "TikTok 更偏低价促销，适合走量打法。" : "TikTok 客单价反而更高，可关注差异化。")));
      const ttShare = ((tt.totalSales || 0) / (s.totalSales || 1)) * 100;
      items.push(li("📈", "虽然 TikTok 商品数仅占 <b>" + pct1((tt.n / s.n) * 100) + "</b>，但贡献了约 <span class='num'>" + pct1(ttShare) + "</span> 的总销量，" +
        (ttShare > 45 ? "爆款集中度明显更高。" : "销量分布相对均衡。")));
      const scoreDiff = tt.avgRating - ml.avgRating;
      items.push(li("⭐", "美客多平均评分 <b>" + ml.avgRating.toFixed(2) + "</b>，" + (scoreDiff < 0 ? "高于 TikTok（" + tt.avgRating.toFixed(2) + "），质量口碑更稳。" : "低于 TikTok（" + tt.avgRating.toFixed(2) + "），可参考 TikTok 爆款优化评价。")));
    }
    // 价格带机会
    const bandsWith = PRICE_BANDS.map((b, i) => ({
      band: b.label, cnt: rows.filter((r) => r.price_brl >= b.min && r.price_brl < b.max).length,
      avgSales: binAvgSales(rows, PRICE_BANDS)[i]
    })).filter((b) => b.cnt >= Math.max(3, rows.length * 0.02));
    if (bandsWith.length) {
      const best = bandsWith.slice().sort((a, b) => b.avgSales - a.avgSales)[0];
      items.push(li("🎯", "价格带 <b>R$" + best.band + "</b> 平均单品销量最高（<span class='num'>" + fmtInt(Math.round(best.avgSales)) + " 单</span>），是当前样本中的机会价格带。"));
    }
    // 材质
    const matSales = {};
    rows.forEach((r) => { matSales[r.material] = matSales[r.material] || { n: 0, sales: 0 }; matSales[r.material].n++; matSales[r.material].sales += r.sales; });
    const mats = Object.entries(matSales).map(([k, v]) => ({ k: k, n: v.n, sales: v.sales })).filter((m) => m.n >= Math.max(3, rows.length * 0.02));
    if (mats.length) {
      const hotMat = mats.slice().sort((a, b) => (b.sales / b.n) - (a.sales / a.n))[0];
      const topMat = mats.slice().sort((a, b) => b.n - a.n)[0];
      items.push(li("🧩", "最主流材质是 <b>" + topMat.k + "</b>（" + topMat.n + " 款），但平均销量最高的材质是 <b>" + hotMat.k + "</b>（" + fmtInt(Math.round(hotMat.sales / hotMat.n)) + " 单/款）。"));
    }
    // 品牌
    const brandSales = {};
    rows.forEach((r) => { brandSales[r.brand] = (brandSales[r.brand] || 0) + r.sales; });
    const topBrand = Object.entries(brandSales).sort((a, b) => b[1] - a[1])[0];
    if (topBrand) items.push(li("🏆", "销量最高的品牌是 <b>" + topBrand[0] + "</b>（约 <span class='num'>" + compact(topBrand[1]) + "</span> 单）。"));
    // 爆款集中度
    const sorted = rows.slice().sort((a, b) => b.sales - a.sales);
    const top5n = Math.max(1, Math.round(rows.length * 0.05));
    const top5Sales = sorted.slice(0, top5n).reduce((x, r) => x + r.sales, 0);
    items.push(li("🔥", "Top " + top5n + " 款爆款（前 5%）合计销量约 <span class='num'>" + compact(top5Sales) + "</span> 单，占总量 <span class='num'>" + pct1((top5Sales / (s.totalSales || 1)) * 100) + "</span>。" +
      (top5Sales / (s.totalSales || 1) > 0.4 ? "头部效应明显，选品应重点对标爆款。" : "市场相对分散，长尾机会更多。")));
    // 卖家类型
    const stMap2 = {};
    rows.forEach((r) => { stMap2[r.seller_type] = (stMap2[r.seller_type] || 0) + 1; });
    const topST = Object.entries(stMap2).sort((a, b) => b[1] - a[1])[0];
    if (topST) {
      const stCN = { "MercadoLíder": "金牌卖家", "Loja Oficial": "官方店", "Top Seller": "金牌卖家", "Vendedor": "普通卖家" };
      items.push(li("🏅", "卖家类型以 <b>" + (stCN[topST[0]] || topST[0]) + "</b> 为主（" + topST[1] + " 款，占 " + pct1((topST[1] / rows.length) * 100) + "）。"));
    }
    // 分期
    const instFree = rows.filter((r) => r.interest_free).length;
    items.push(li("💳", "支持免息分期的商品占比 <span class='num'>" + pct1((instFree / rows.length) * 100) + "</span>，可在定价中突出分期优势。"));
    ul.innerHTML = items.join("");
  }


  /* ---------------- 型号排行榜 ---------------- */
  const MODEL_RANK_OPTIONS = [{"key":"n","label":"商品数","dir":-1},{"key":"sales","label":"总销量","dir":-1},{"key":"avgSales","label":"平均销量","dir":-1},{"key":"avgRating","label":"平均评分","dir":-1},{"key":"avgPrice","label":"平均售价","dir":1}];
  function computeModelStats() {
    const map = {};
    State.rows.forEach((r) => {
      const m = r.model || "未知机型";
      if (!map[m]) map[m] = { model: m, brand: r.brand, n: 0, sales: 0, ratingSum: 0, rated: 0, priceSum: 0, ml: 0, tt: 0 };
      const d = map[m];
      d.n++;
      d.sales += r.sales;
      d.priceSum += r.price_brl;
      if (r.rating > 0) { d.ratingSum += r.rating; d.rated++; }
      if (r.platform === ML) d.ml++; else if (r.platform === TT) d.tt++;
    });
    return Object.values(map).map((d) => ({
      ...d,
      avgPrice: d.priceSum / d.n,
      avgSales: d.sales / d.n,
      avgRating: d.rated ? d.ratingSum / d.rated : 0
    }));
  }
  function renderModelRank() {
    const body = els.modelRankBody;
    if (!State.rows.length) { body.innerHTML = '<tr><td colspan="9" class="center muted">暂无数据</td></tr>'; return; }
    const opt = MODEL_RANK_OPTIONS.find((o) => o.key === State.modelRankKey) || MODEL_RANK_OPTIONS[0];
    const list = computeModelStats().sort((a, b) => (a[opt.key] - b[opt.key]) * opt.dir);
    const top = list.slice(0, 20);
    const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1);
    body.innerHTML = top.map((d, i) =>
      "<tr>" +
      '<td class="rank-cell">' + medal(i) + "</td>" +
      "<td><b>" + esc(d.model) + "</b></td>" +
      "<td>" + esc(d.brand) + "</td>" +
      "<td>" + fmtInt(d.n) + "</td>" +
      "<td>" + fmtBRL(d.avgPrice) + "</td>" +
      "<td><b>" + fmtInt(Math.round(d.sales)) + "</b></td>" +
      "<td>" + fmtInt(Math.round(d.avgSales)) + "</td>" +
      "<td>" + (d.avgRating ? d.avgRating.toFixed(2) : "-") + "</td>" +
      '<td class="muted">ML ' + d.ml + " / TT " + d.tt + "</td>" +
      "</tr>"
    ).join("");
    els.modelRankCount.textContent = "共 " + list.length + " 个机型 · 展示 Top " + top.length;
  }

  /* ---------------- 商品明细表 ---------------- */
  const COLUMNS = [
    { key: "platform", label: "平台", sortable: true },
    { key: "title", label: "商品标题", sortable: true },
    { key: "brand", label: "品牌", sortable: true },
    { key: "model", label: "适配机型", sortable: true },
    { key: "material", label: "材质", sortable: true },
    { key: "price_brl", label: "售价", sortable: true, num: true },
    { key: "sales", label: "销量(估算)", sortable: true, num: true },
    { key: "rating", label: "评分", sortable: true, num: true },
    { key: "reviews", label: "评论数", sortable: true, num: true },
    { key: "color", label: "颜色", sortable: true },
    { key: "seller_type", label: "卖家类型", sortable: true },
    { key: "state", label: "卖家州", sortable: true },
    { key: "installments_count", label: "分期", sortable: true },
    { key: "seller", label: "卖家/店铺", sortable: true },
    { key: "listed_date", label: "上架日期", sortable: true },
    { key: "shipping_free", label: "免邮", sortable: true }
  ];
  function renderTableHead() {
    els.tableHead.innerHTML = "<tr>" + COLUMNS.map((c) => {
      const dir = State.table.sortKey === c.key ? (State.table.sortDir === 1 ? " ▲" : " ▼") : "";
      return '<th data-key="' + c.key + '">' + c.label + dir + "</th>";
    }).join("") + "</tr>";
    $$("#table-head th").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (State.table.sortKey === key) State.table.sortDir *= -1;
        else { State.table.sortKey = key; State.table.sortDir = COLUMNS.find((c) => c.key === key).num ? -1 : 1; }
        State.table.page = 1;
        renderTable();
      });
    });
  }
  function sortedRows() {
    const { sortKey, sortDir } = State.table;
    const rows = State.rows.slice();
    rows.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
    return rows;
  }
  function renderTable() {
    const t = State.table;
    const rows = sortedRows();
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / t.perPage));
    if (t.page > pages) t.page = pages;
    const start = (t.page - 1) * t.perPage;
    const pageRows = rows.slice(start, start + t.perPage);
    els.tableCount.textContent = "共 " + fmtInt(total) + " 条 · 第 " + t.page + "/" + pages + " 页";

    const cellFor = (r, key) => {
      if (key === "installments_count") {
        if (r.installments_count == null) return "—";
        return r.installments_count + "x" + (r.interest_free ? " 免息" : "");
      }
      if (key === "shipping_free") return r.shipping_free ? "✅" : "—";
      if (key === "seller_type") {
        const map = { "MercadoLíder": "金牌卖家", "Loja Oficial": "官方店", "Top Seller": "金牌卖家", "Vendedor": "普通卖家" };
        return map[r.seller_type] || esc(r.seller_type);
      }
      if (key === "color" || key === "state") return r[key] ? esc(r[key]) : "—";
      if (key === "seller") return esc(r.seller);
      return esc(r[key]);
    };
    els.tableBody.innerHTML = pageRows.map((r) => {
      const platBadge = r.platform === ML
        ? '<span class="platform-badge ml">美客多</span>'
        : r.platform === TT ? '<span class="platform-badge tt">TikTok</span>' : esc(r.platform);
      const stars = r.rating ? "★".repeat(Math.round(r.rating)) : "-";
      return "<tr>" +
        "<td>" + platBadge + "</td>" +
        '<td class="title-cell" title="' + esc(r.title) + '">' + esc(r.title) + "</td>" +
        "<td>" + esc(r.brand) + "</td>" +
        "<td>" + esc(r.model) + "</td>" +
        "<td>" + esc(r.material) + "</td>" +
        "<td>" + cellFor(r, "color") + "</td>" +
        "<td>" + cellFor(r, "seller_type") + "</td>" +
        "<td>" + cellFor(r, "state") + "</td>" +
        "<td>" + cellFor(r, "installments_count") + "</td>" +
        "<td>" + fmtBRL(r.price_brl) + "</td>" +
        "<td><b>" + fmtInt(r.sales) + "</b></td>" +
        '<td><span class="rating-stars">' + (r.rating ? r.rating.toFixed(1) + " " + stars : "-") + "</span></td>" +
        "<td>" + fmtInt(r.reviews) + "</td>" +
        "<td>" + cellFor(r, "seller") + "</td>" +
        "<td>" + esc(r.listed_date) + "</td>" +
        "<td>" + cellFor(r, "shipping_free") + "</td>" +
        "</tr>";
    }).join("");

    els.pager.innerHTML =
      '<span class="muted">' + els.tableCount.textContent + "</span>" +
      '<div class="pager-btns">' +
      '<button data-page="prev"' + (t.page <= 1 ? " disabled" : "") + ">上一页</button>" +
      '<button data-page="next"' + (t.page >= pages ? " disabled" : "") + ">下一页</button>" +
      "</div>";
    $$("#pager button").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.page === "prev" && t.page > 1) t.page--;
        if (b.dataset.page === "next" && t.page < pages) t.page++;
        renderTable();
      });
    });
  }

  /* ---------------- 总渲染 ---------------- */
  let renderTimer = null;
  function renderAll() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      renderKpis();
      renderSummary();
      renderCharts();
      renderCompare();
      renderInsights();
      renderModelRank();
      renderTableHead();
      renderTable();
    }, 30);
  }

  /* ---------------- 导入导出 ---------------- */
  function parseCSV(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("CSV 至少需要表头和一行数据");
    const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const idx = (names) => {
      for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
      return -1;
    };
    const i = {
      platform: idx(["platform", "plataforma"]),
      title: idx(["title", "titulo", "nome"]),
      brand: idx(["brand", "marca"]),
      model: idx(["model", "modelo"]),
      material: idx(["material"]),
      price: idx(["price_brl", "price", "preco"]),
      original: idx(["original_price_brl", "original_price", "preco_original"]),
      sales: idx(["sales", "vendidos", "pedidos", "vendas"]),
      rating: idx(["rating", "nota", "avaliacao"]),
      reviews: idx(["reviews", "comentarios", "avaliacoes"]),
      seller: idx(["seller", "vendedor", "loja"]),
      date: idx(["listed_date", "date", "data", "data_listagem"]),
      shipping: idx(["shipping_free", "frete_gratis", "frete"])
    };
    const records = [];
    const csvLine = (line) => {
      const out = []; let cur = ""; let q = false;
      for (let k = 0; k < line.length; k++) {
        const ch = line[k];
        if (ch === '"') { if (q && line[k + 1] === '"') { cur += '"'; k++; } else q = !q; }
        else if (ch === "," && !q) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur);
      return out;
    };
    for (let n = 1; n < lines.length; n++) {
      const c = csvLine(lines[n]);
      const rec = {};
      const get = (idx, key) => { if (idx >= 0 && c[idx] !== undefined && c[idx].trim() !== "") rec[key] = c[idx].trim().replace(/^"|"$/g, ""); };
      get(i.platform, "platform"); get(i.title, "title"); get(i.brand, "brand"); get(i.model, "model");
      get(i.material, "material"); get(i.price, "price_brl"); get(i.original, "original_price_brl");
      get(i.sales, "sales"); get(i.rating, "rating"); get(i.reviews, "reviews");
      get(i.seller, "seller"); get(i.date, "listed_date");
      if (i.shipping >= 0 && c[i.shipping] !== undefined) rec.shipping_free = /^(sim|true|1|yes|y)$/i.test(c[i.shipping].trim());
      if (rec.title || rec.platform) records.push(rec);
    }
    if (!records.length) throw new Error("CSV 中没有解析到有效数据，请检查列名");
    return validate(records);
  }

  function exportCSV() {
    const rows = State.rows;
    if (!rows.length) { toast("当前没有可导出的数据", true); return; }
    const header = ["id", "platform", "title", "brand", "model", "material", "price_brl", "original_price_brl", "sales", "rating", "reviews", "seller", "listed_date", "shipping_free"];
    const csv = [header.join(",")].concat(rows.map((r) => header.map((h) => {
      const v = r[h];
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(","))).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "手机壳筛选数据_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("已导出 " + rows.length + " 条数据");
  }

  /* ---------------- 弹窗与提示 ---------------- */
  function toast(msg, isErr) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = "toast"; }, 2600);
  }
  function openModal(id) { $("#" + id).classList.add("show"); }
  function closeModal(id) { $("#" + id).classList.remove("show"); }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    const f = els.filters;
    f.platform.addEventListener("change", () => { State.filters.platform = f.platform.value; applyFilters(); });
    f.brand.addEventListener("change", () => { State.filters.brand = f.brand.value; applyFilters(); });
    f.material.addEventListener("change", () => { State.filters.material = f.material.value; applyFilters(); });
    f.minPrice.addEventListener("input", debounce(() => { State.filters.minPrice = f.minPrice.value; applyFilters(); }, 350));
    f.maxPrice.addEventListener("input", debounce(() => { State.filters.maxPrice = f.maxPrice.value; applyFilters(); }, 350));
    f.minRating.addEventListener("change", () => { State.filters.minRating = f.minRating.value; applyFilters(); });
    f.keyword.addEventListener("input", debounce(() => { State.filters.keyword = f.keyword.value.trim(); applyFilters(); }, 300));
    els.modelRankSort.addEventListener("change", () => { State.modelRankKey = els.modelRankSort.value; renderModelRank(); });

    $("#btn-reset").addEventListener("click", () => {
      State.filters = { platform: "all", brand: "all", material: "all", minPrice: "", maxPrice: "", minRating: "0", keyword: "" };
      Object.values(f).forEach((el) => { if (el.tagName === "SELECT") el.value = "all"; else el.value = ""; });
      refreshOptions();
      applyFilters();
      toast("已重置筛选");
    });

    $("#btn-import").addEventListener("click", () => openModal("modal-import"));
    $("#btn-export").addEventListener("click", exportCSV);
    $("#btn-sample").addEventListener("click", loadSample);
    $$("#modal-import [data-close]").forEach((b) => b.addEventListener("click", () => closeModal("modal-import")));
    $("#modal-import .mask-close").addEventListener("click", () => closeModal("modal-import"));
    $("#modal-import").addEventListener("click", (e) => { if (e.target.id === "modal-import") closeModal("modal-import"); });

    // 文件选择
    const fileInput = $("#import-file");
    const drop = $("#import-drop");
    drop.addEventListener("click", () => fileInput.click());
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault(); drop.classList.remove("drag");
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

    // 粘贴 JSON
    $("#btn-apply-json").addEventListener("click", () => {
      const raw = $("#import-json").value.trim();
      if (!raw) { toast("请先粘贴 JSON 数据", true); return; }
      try {
        const parsed = JSON.parse(raw);
        setData(parsed, "粘贴的数据");
        closeModal("modal-import");
        toast("已载入 " + State.all.length + " 条数据");
      } catch (err) {
        toast("JSON 解析失败：" + err.message, true);
      }
    });

    // 下载模板
    $("#btn-template").addEventListener("click", () => {
      const sample = State.all[0] || {};
      const header = Object.keys(sample).join(",");
      const blob = new Blob(["\ufeff" + header + "\r\n"], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "数据模板.csv"; a.click();
      URL.revokeObjectURL(a.href);
    });

    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderAll, 200); });
  }

  function handleFile(file) {
    const name = file.name.toLowerCase();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (name.endsWith(".json")) {
          setData(JSON.parse(reader.result), file.name);
        } else if (name.endsWith(".csv")) {
          setData(parseCSV(reader.result), file.name);
        } else {
          toast("仅支持 .csv 或 .json 文件", true);
          return;
        }
        closeModal("modal-import");
        toast("已载入 " + State.all.length + " 条数据");
      } catch (err) {
        toast("导入失败：" + err.message, true);
      }
    };
    reader.onerror = () => toast("读取文件失败", true);
    reader.readAsText(file, "utf-8");
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    cacheEls();
    bindEvents();
    loadSample();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
