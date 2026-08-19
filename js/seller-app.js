/* =========================================================
 * 美客多店铺后台数据分析（全面版）
 * ========================================================= */
(function () {
  "use strict";

  const C_ML = "#f59e0b";
  const C_BLUE = "#2563eb";
  const C_GRAY = "#94a3b8";
  const STATUS_CN = { "Concluída": "已完成", "Enviada": "已发货", "Pendente": "待处理", "Cancelada": "已取消", "Devolvida": "已退货" };

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
  const cleanDate = (d) => String(d || "").slice(0, 10);

  /* ---------------- 状态 ---------------- */
  const State = {
    all: [],
    rows: [],
    filters: { dateFrom: "", dateTo: "", category: "all", status: "all", keyword: "" },
    table: { page: 1, perPage: 15, sortKey: "revenue", sortDir: -1 },
    trendDays: 60,
    sourceName: "示例数据"
  };

  const els = {};
  function cacheEls() {
    els.filters = {
      dateFrom: $("#f-date-from"), dateTo: $("#f-date-to"), category: $("#f-category"),
      status: $("#f-status"), keyword: $("#f-keyword")
    };
    els.charts = {
      trend: $("#chart-trend"), status: $("#chart-status"), category: $("#chart-category"),
      topQty: $("#chart-top-qty"), topRev: $("#chart-top-rev"), profitTop: $("#chart-top-profit"),
      region: $("#chart-region"), payment: $("#chart-payment"), channel: $("#chart-channel")
    };
    els.kpis = {
      revenue: $("#kpi-revenue"), profit: $("#kpi-profit"), margin: $("#kpi-margin"),
      orders: $("#kpi-orders"), aov: $("#kpi-aov"), roas: $("#kpi-roas"),
      products: $("#kpi-products"), conv: $("#kpi-conv")
    };
    els.summary = $("#summary-strip");
    els.rangeInfo = $("#range-info");
    els.stockWarn = $("#stock-warn");
    els.adsPanel = $("#ads-panel");
    els.perfHead = $("#perf-head");
    els.perfBody = $("#perf-body");
    els.pager = $("#pager");
    els.perfCount = $("#perf-count");
    els.insights = $("#insights");
    els.trendDays = $("#trend-days");
  }

  /* ---------------- 数据 ---------------- */
  function normalizeRecord(r) {
    const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    return {
      order_id: String(r.order_id || r.orderId || ""),
      date: cleanDate(r.date || r.data || r.listed_date || ""),
      sku: String(r.sku || r.product_id || ""),
      title: String(r.title || r.titulo || r.nome || ""),
      category: String(r.category || r.categoria || "其他"),
      color: String(r.color || ""),
      qty: num(r.qty != null ? r.qty : r.quantidade, 1),
      unit_price: num(r.unit_price != null ? r.unit_price : (r.price != null ? r.price : r.preco), 0),
      revenue: num(r.revenue != null ? r.revenue : (r.faturamento != null ? r.faturamento : r.total), 0),
      cost: num(r.cost != null ? r.cost : r.custo, 0),
      profit: num(r.profit != null ? r.profit : r.lucro, 0),
      margin: num(r.margin != null ? r.margin : r.margem, 0),
      shipping_fee: num(r.shipping_fee != null ? r.shipping_fee : r.frete, 0),
      shipping_cost: num(r.shipping_cost != null ? r.shipping_cost : r.custo_frete, 0),
      coupon_discount: num(r.coupon_discount != null ? r.coupon_discount : r.desconto, 0),
      ad_spend: num(r.ad_spend != null ? r.ad_spend : r.gasto_ads, 0),
      ad_impressions: num(r.ad_impressions != null ? r.ad_impressions : r.impressoes_ads, 0),
      ad_clicks: num(r.ad_clicks != null ? r.ad_clicks : r.cliques_ads, 0),
      channel: String(r.channel || r.canal || "Orgânico"),
      payment: String(r.payment || r.pagamento || ""),
      installments_count: r.installments_count == null ? null : num(r.installments_count, 0),
      status: String(r.status || r.estado || "Concluída"),
      views: num(r.views != null ? r.views : r.visualizacoes, 0),
      stock: r.stock == null && r.estoque == null ? null : num(r.stock != null ? r.stock : r.estoque, 0),
      state: String(r.state || r.uf || ""),
      city: String(r.city || r.cidade || "")
    };
  }
  function validate(records) {
    if (!Array.isArray(records) || !records.length) throw new Error("未解析到任何记录");
    const ok = records.filter((r) => r && (r.title || r.sku) && (r.date || r.order_id));
    if (!ok.length) throw new Error("缺少必要字段（title/sku 或 date）");
    return ok.map(normalizeRecord);
  }
  function loadSample() {
    State.all = validate((window.SELLER_SAMPLE_DATA || []).slice());
    State.sourceName = "内置店铺示例数据";
    refreshOptions();
    applyFilters(true);
    toast("已载入店铺示例数据（" + State.all.length + " 条）");
  }
  function setData(records, name) {
    State.all = validate(records);
    State.sourceName = name;
    refreshOptions();
    applyFilters(true);
  }
  function refreshOptions() {
    const cats = [...new Set(State.all.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
    const cur = els.filters.category.value;
    els.filters.category.innerHTML = '<option value="all">全部品类</option>' +
      cats.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("");
    els.filters.category.value = cats.includes(cur) ? cur : "all";
  }

  /* ---------------- 筛选 ---------------- */
  function applyFilters(silent) {
    const f = State.filters;
    const rows = State.all.filter((r) => {
      if (f.dateFrom && r.date < f.dateFrom) return false;
      if (f.dateTo && r.date > f.dateTo) return false;
      if (f.category !== "all" && r.category !== f.category) return false;
      if (f.status !== "all" && r.status !== f.status) return false;
      if (f.keyword) {
        const k = f.keyword.toLowerCase();
        if (!((r.sku + " " + r.title + " " + r.category).toLowerCase().includes(k))) return false;
      }
      return true;
    });
    State.rows = rows;
    State.table.page = 1;
    renderAll();
    if (!silent) toast("已按条件筛选，共 " + rows.length + " 条记录");
  }

  /* ---------------- 统计 ---------------- */
  function statsFor(rows) {
    const n = rows.length;
    if (!n) return null;
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const shipping = rows.reduce((s, r) => s + r.shipping_fee, 0);
    const qty = rows.reduce((s, r) => s + r.qty, 0);
    const profit = rows.reduce((s, r) => s + (r.profit || 0), 0);
    const adSpend = rows.reduce((s, r) => s + (r.ad_spend || 0), 0);
    const adOrders = rows.filter((r) => r.channel === "Anúncios").length;
    const adRevenue = rows.filter((r) => r.channel === "Anúncios").reduce((s, r) => s + r.revenue, 0);
    const adImpressions = rows.reduce((s, r) => s + (r.ad_impressions || 0), 0);
    const adClicks = rows.reduce((s, r) => s + (r.ad_clicks || 0), 0);
    const orderIds = new Set(rows.map((r) => r.order_id || (r.date + "|" + r.sku + "|" + r.qty)));
    const skus = new Set(rows.map((r) => r.sku || "?"));
    const vmap = {};
    rows.forEach((r) => { const k = r.sku + "|" + r.date; vmap[k] = Math.max(vmap[k] || 0, r.views || 0); });
    const views = Object.values(vmap).reduce((a, b) => a + b, 0);
    const orders = orderIds.size;
    const bad = rows.filter((r) => r.status === "Cancelada" || r.status === "Devolvida").length;
    return {
      n, revenue, shipping, qty, profit, margin: revenue ? (profit / revenue) * 100 : 0,
      adSpend, adOrders, adRevenue, adImpressions, adClicks,
      roas: adSpend ? adRevenue / adSpend : 0,
      ctr: adImpressions ? (adClicks / adImpressions) * 100 : 0,
      orders, skus: skus.size, views,
      aov: orders ? revenue / orders : 0,
      conv: views ? (qty / views) * 100 : 0,
      badRate: n ? (bad / n) * 100 : 0
    };
  }

  /* ---------------- 指标卡 ---------------- */
  function renderKpis() {
    const s = statsFor(State.rows);
    if (!s) {
      $$(".kpi-card").forEach((c) => { c.style.opacity = 0.4; });
      return;
    }
    $$(".kpi-card").forEach((c) => { c.style.opacity = 1; });
    const set = (el, val, sub) => {
      el.querySelector(".kpi-value").innerHTML = val;
      el.querySelector(".kpi-sub").innerHTML = sub || "";
    };
    set(els.kpis.revenue, fmtBRL(s.revenue), "含运费 " + fmtBRL(s.revenue + s.shipping));
    set(els.kpis.profit, fmtBRL(s.profit), "扣成本/运费/广告/优惠");
    set(els.kpis.margin, pct1(s.margin), "利润 ÷ 销售额");
    set(els.kpis.orders, fmtInt(s.orders), "总件数 " + fmtInt(s.qty));
    set(els.kpis.aov, fmtBRL(s.aov), "每单均价");
    set(els.kpis.roas, s.roas ? s.roas.toFixed(2) + "x" : "-", "广告销售额 ÷ 广告费");
    set(els.kpis.products, fmtInt(s.skus), "去重 SKU 数");
    set(els.kpis.conv, pct1(s.conv), "销量 ÷ 浏览量");
  }

  /* ---------------- 汇总条 ---------------- */
  function renderSummary() {
    const s = statsFor(State.rows);
    els.rangeInfo.textContent = State.sourceName + " · 当前筛选 " + fmtInt(s ? s.n : 0) + " 条记录";
    if (!s) { els.summary.innerHTML = '<span class="muted">没有符合条件的数据</span>'; return; }
    const chip = (label, val) => '<span class="summary-chip">' + label + "：<b>" + val + "</b></span>";
    let html = "";
    html += chip("日期范围", (State.rows[0] ? State.rows[0].date : "-") + " ~ " + (State.rows[State.rows.length - 1] ? State.rows[State.rows.length - 1].date : "-"));
    html += chip("平均日销售额", fmtBRL(s.revenue / daysIn(State.rows)));
    html += chip("平均利润率", pct1(s.margin));
    html += chip("总广告费", fmtBRL(s.adSpend));
    html += chip("广告订单占比", pct1(s.orders ? (s.adOrders / s.orders) * 100 : 0));
    html += chip("累计浏览量", fmtInt(s.views));
    html += chip("完成率", pct1(100 - s.badRate));
    html += chip("取消+退货率", pct1(s.badRate));
    els.summary.innerHTML = html;
  }
  function daysIn(rows) {
    if (!rows.length) return 1;
    const ds = [...new Set(rows.map((r) => r.date))].sort();
    if (ds.length < 2) return 1;
    const a = new Date(ds[0]), b = new Date(ds[ds.length - 1]);
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }

  /* ---------------- 图表 ---------------- */
  function renderTrend() {
    const rows = State.rows;
    if (!rows.length) { els.charts.trend.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    const ds = [...new Set(rows.map((r) => r.date))].sort();
    const end = ds[ds.length - 1];
    const start = new Date(new Date(end).getTime() - (State.trendDays - 1) * 86400000).toISOString().slice(0, 10);
    const map = {};
    rows.forEach((r) => { if (r.date >= start && r.date <= end) map[r.date] = (map[r.date] || 0) + r.revenue; });
    const keys = Object.keys(map).sort();
    Charts.bar(els.charts.trend, {
      labels: keys.map((k) => k.slice(5)),
      series: [{ name: "销售额", values: keys.map((k) => map[k]), color: C_ML }],
      height: 300, yFormat: (v) => "R$" + Math.round(v), compact: true, xLabel: "日期（月-日）", yLabel: "R$"
    });
  }

  function renderStatus() {
    const rows = State.rows;
    if (!rows.length) { els.charts.status.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    const map = {};
    rows.forEach((r) => { map[r.status] = (map[r.status] || 0) + 1; });
    const PALETTE = ["#10b981", "#2563eb", "#f59e0b", "#f43f5e", "#8b5cf6", "#94a3b8"];
    const items = Object.entries(map).sort((a, b) => b[1] - a[1]);
    Charts.donut(els.charts.status, {
      items: items.map(([k, v], i) => ({ label: STATUS_CN[k] || k, value: v, color: PALETTE[i % PALETTE.length] })),
      height: 300, centerText: fmtInt(rows.length), centerSub: "订单记录", valueFormat: fmtInt
    });
  }

  function renderCategory() {
    const rows = State.rows;
    if (!rows.length) { els.charts.category.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    const map = {};
    rows.forEach((r) => { map[r.category] = (map[r.category] || 0) + r.revenue; });
    const items = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    Charts.hbar(els.charts.category, {
      items: items.map(([k, v]) => ({ label: k, value: v, color: C_BLUE })),
      height: Math.max(150, items.length * 30 + 40), valueFormat: (v) => "R$" + Math.round(v)
    });
  }

  function productStats(rows) {
    const map = {};
    rows.forEach((r) => {
      const s = r.sku || "?";
      if (!map[s]) map[s] = { sku: s, title: r.title, category: r.category, color: r.color, qty: 0, rev: 0, cost: 0, profit: 0, views: 0, stock: null, price: null };
      const d = map[s];
      d.qty += r.qty;
      d.rev += r.revenue;
      d.cost += r.cost || 0;
      d.profit += r.profit || 0;
      d.views = Math.max(d.views, r.views || 0);
      if (r.stock != null) d.stock = r.stock;
      if (r.unit_price != null) d.price = r.unit_price;
      if (r.color) d.color = r.color;
    });
    return Object.values(map).map((d) => ({
      ...d,
      margin: d.rev ? (d.profit / d.rev) * 100 : 0,
      conv: d.views ? (d.qty / d.views) * 100 : 0
    }));
  }

  function renderTopQty() {
    const items = productStats(State.rows).sort((a, b) => b.qty - a.qty).slice(0, 10);
    if (!items.length) { els.charts.topQty.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    Charts.hbar(els.charts.topQty, {
      items: items.map((d) => ({ label: d.title || d.sku, value: d.qty, color: C_ML, sub: d.sku })),
      height: 330, valueFormat: fmtInt
    });
  }

  function renderTopRev() {
    const items = productStats(State.rows).sort((a, b) => b.rev - a.rev).slice(0, 10);
    if (!items.length) { els.charts.topRev.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    Charts.hbar(els.charts.topRev, {
      items: items.map((d) => ({ label: d.title || d.sku, value: d.rev, color: C_BLUE, sub: d.sku })),
      height: 330, valueFormat: (v) => "R$" + Math.round(v)
    });
  }

  function renderProfitTop() {
    const items = productStats(State.rows).sort((a, b) => b.profit - a.profit).slice(0, 10);
    if (!items.length) { els.charts.profitTop.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    Charts.hbar(els.charts.profitTop, {
      items: items.map((d) => ({ label: d.title || d.sku, value: d.profit, color: "#10b981", sub: d.sku + " · 利润率 " + (d.margin ? d.margin.toFixed(0) : 0) + "%" })),
      height: 330, valueFormat: (v) => "R$" + Math.round(v)
    });
  }

  function renderRegion() {
    const rows = State.rows;
    if (!rows.length) { els.charts.region.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    const map = {};
    rows.forEach((r) => { if (r.state) map[r.state] = (map[r.state] || 0) + 1; });
    const items = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
    Charts.hbar(els.charts.region, {
      items: items.map(([k, v]) => ({ label: k, value: v, color: C_ML })),
      height: 300, valueFormat: fmtInt
    });
  }

  function renderPayment() {
    const rows = State.rows;
    if (!rows.length) { els.charts.payment.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    const map = {};
    rows.forEach((r) => { if (r.payment) map[r.payment] = (map[r.payment] || 0) + 1; });
    const PALETTE = ["#10b981", "#2563eb", "#f59e0b", "#ec4899", "#8b5cf6", "#94a3b8"];
    const items = Object.entries(map).sort((a, b) => b[1] - a[1]);
    Charts.donut(els.charts.payment, {
      items: items.map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] })),
      height: 300, centerText: fmtInt(rows.length), centerSub: "订单记录", valueFormat: fmtInt
    });
  }

  function renderChannel() {
    const rows = State.rows;
    if (!rows.length) { els.charts.channel.innerHTML = '<div class="center muted" style="padding:40px 0">暂无数据</div>'; return; }
    const orgRev = rows.filter((r) => r.channel !== "Anúncios").reduce((s, r) => s + r.revenue, 0);
    const adsRev = rows.filter((r) => r.channel === "Anúncios").reduce((s, r) => s + r.revenue, 0);
    Charts.bar(els.charts.channel, {
      labels: ["自然流量", "广告投放"],
      series: [{ name: "销售额", values: [orgRev, adsRev], color: C_BLUE }],
      height: 260, yFormat: (v) => "R$" + Math.round(v), compact: true, yLabel: "R$"
    });
  }

  function renderAds() {
    const s = statsFor(State.rows);
    if (!s) { els.adsPanel.innerHTML = '<div class="center muted" style="padding:30px 0">暂无数据</div>'; return; }
    const item = (v, l) => '<div class="ads-item"><div class="v">' + v + '</div><div class="l">' + l + "</div></div>";
    els.adsPanel.innerHTML =
      item(fmtBRL(s.adSpend), "广告花费") +
      item(fmtInt(s.adImpressions), "广告曝光") +
      item(fmtInt(s.adClicks), "广告点击") +
      item(pct1(s.ctr), "点击率 CTR") +
      item(fmtInt(s.adOrders), "广告订单") +
      item(s.roas ? s.roas.toFixed(2) + "x" : "-", "ROAS（回报率）");
  }

  function renderStockWarn() {
    const ul = els.stockWarn;
    const list = productStats(State.rows).filter((d) => d.stock != null && d.stock <= 10).sort((a, b) => a.stock - b.stock);
    if (!list.length) {
      ul.innerHTML = '<li><span class="ic" style="background:#eef2ff">✅</span><span>库存充足，暂无预警商品</span></li>';
      return;
    }
    ul.innerHTML = list.slice(0, 12).map((d) => {
      const badge = d.stock <= 0
        ? '<span class="platform-badge tt">缺货</span>'
        : '<span class="platform-badge ml">低库存 ' + d.stock + "</span>";
      return '<li><span class="ic" style="background:#fef3c7">⚠️</span><span><b>' + esc(d.title || d.sku) + "</b> · " + esc(d.sku) + " " + badge + "</span></li>";
    }).join("");
  }

  /* ---------------- 商品表现表 ---------------- */
  const PERF_COLUMNS = [
    { key: "sku", label: "SKU", num: false },
    { key: "title", label: "商品标题", num: false },
    { key: "category", label: "品类", num: false },
    { key: "color", label: "颜色", num: false },
    { key: "price", label: "售价", num: true },
    { key: "stock", label: "库存", num: true },
    { key: "qty", label: "销量", num: true },
    { key: "rev", label: "销售额", num: true },
    { key: "profit", label: "利润", num: true },
    { key: "margin", label: "利润率", num: true },
    { key: "views", label: "浏览量", num: true },
    { key: "conv", label: "转化率", num: true }
  ];
  function renderPerfHead() {
    els.perfHead.innerHTML = "<tr>" + PERF_COLUMNS.map((c) => {
      const dir = State.table.sortKey === c.key ? (State.table.sortDir === 1 ? " ▲" : " ▼") : "";
      return '<th data-key="' + c.key + '">' + c.label + dir + "</th>";
    }).join("") + "</tr>";
    $$("#perf-head th").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (State.table.sortKey === key) State.table.sortDir *= -1;
        else { State.table.sortKey = key; State.table.sortDir = PERF_COLUMNS.find((c) => c.key === key).num ? -1 : 1; }
        State.table.page = 1;
        renderPerf();
      });
    });
  }
  function renderPerf() {
    const t = State.table;
    let list = productStats(State.rows);
    list.sort((a, b) => {
      const av = a[t.sortKey], bv = b[t.sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * t.sortDir;
      return String(av).localeCompare(String(bv)) * t.sortDir;
    });
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / t.perPage));
    if (t.page > pages) t.page = pages;
    const start = (t.page - 1) * t.perPage;
    const page = list.slice(start, start + t.perPage);
    els.perfCount.textContent = "共 " + fmtInt(total) + " 个 SKU · 第 " + t.page + "/" + pages + " 页";
    els.perfBody.innerHTML = page.map((d) => {
      const stockTxt = d.stock == null ? "-" : (d.stock <= 0 ? '<span class="platform-badge tt">缺货</span>' : fmtInt(d.stock));
      const marginTxt = d.margin == null || isNaN(d.margin) ? "-" : d.margin.toFixed(1) + "%";
      return "<tr>" +
        "<td>" + esc(d.sku) + "</td>" +
        '<td class="title-cell" title="' + esc(d.title) + '">' + esc(d.title) + "</td>" +
        "<td>" + esc(d.category) + "</td>" +
        "<td>" + (d.color ? esc(d.color) : "-") + "</td>" +
        "<td>" + (d.price != null ? fmtBRL(d.price) : "-") + "</td>" +
        "<td>" + stockTxt + "</td>" +
        "<td><b>" + fmtInt(d.qty) + "</b></td>" +
        "<td>" + fmtBRL(d.rev) + "</td>" +
        "<td>" + fmtBRL(d.profit) + "</td>" +
        "<td>" + marginTxt + "</td>" +
        "<td>" + fmtInt(d.views) + "</td>" +
        "<td>" + (d.conv ? d.conv.toFixed(2) + "%" : "-") + "</td>" +
        "</tr>";
    }).join("");
    els.pager.innerHTML =
      '<span class="muted">' + els.perfCount.textContent + "</span>" +
      '<div class="pager-btns">' +
      '<button data-page="prev"' + (t.page <= 1 ? " disabled" : "") + ">上一页</button>" +
      '<button data-page="next"' + (t.page >= pages ? " disabled" : "") + ">下一页</button>" +
      "</div>";
    $$("#pager button").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.page === "prev" && t.page > 1) t.page--;
        if (b.dataset.page === "next" && t.page < pages) t.page++;
        renderPerf();
      });
    });
  }

  /* ---------------- 智能解读 ---------------- */
  function renderInsights() {
    const ul = els.insights;
    const rows = State.rows;
    if (!rows.length) { ul.innerHTML = '<li class="muted">暂无数据</li>'; return; }
    const s = statsFor(rows);
    const prods = productStats(rows);
    const items = [];
    const li = (ic, html) => '<li><span class="ic" style="background:#eef2ff">' + ic + "</span><span>" + html + "</span></li>";
    const d = daysIn(rows);
    items.push(li("📅", "统计区间共 <b>" + d + " 天</b>，平均日销售额 <span class='num'>" + fmtBRL(s.revenue / d) + "</span>，平均每日订单 <span class='num'>" + (s.orders / d).toFixed(1) + "</span> 单。"));
    const dayMap = {};
    rows.forEach((r) => { dayMap[r.date] = (dayMap[r.date] || 0) + r.revenue; });
    const bestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) items.push(li("🔥", "销售额最高的一天是 <b>" + bestDay[0] + "</b>（" + fmtBRL(bestDay[1]) + "），可复盘当天活动/流量来源。"));
    const topProd = prods.slice().sort((a, b) => b.rev - a.rev)[0];
    if (topProd) items.push(li("🏆", "销售额第一的商品是 <b>" + esc(topProd.title || topProd.sku) + "</b>（" + fmtBRL(topProd.rev) + "，售出 " + fmtInt(topProd.qty) + " 件）。"));
    const catMap = {};
    rows.forEach((r) => { catMap[r.category] = (catMap[r.category] || 0) + r.revenue; });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    if (topCat) items.push(li("🧩", "销售额最高的品类是 <b>" + topCat[0] + "</b>（" + fmtBRL(topCat[1]) + "，占 " + pct1((topCat[1] / s.revenue) * 100) + "）。"));
    items.push(li("💎", "整体利润率 <span class='num'>" + pct1(s.margin) + "</span>（" + fmtBRL(s.profit) + " / " + fmtBRL(s.revenue) + "）。"));
    items.push(li("🎯", "整体浏览-购买转化率 <span class='num'>" + pct1(s.conv) + "</span>" + (s.conv < 1.5 ? "，偏低，建议优化主图与标题关键词。" : "，表现良好，可继续加大曝光。")));
    if (s.adSpend > 0) {
      items.push(li("📣", "广告花费 <span class='num'>" + fmtBRL(s.adSpend) + "</span>，带来 <b>" + fmtBRL(s.adRevenue) + "</b> 销售额，ROAS <span class='num'>" + s.roas.toFixed(2) + "x</span>，CTR " + pct1(s.ctr) + "。"));
    }
    const regMap = {};
    rows.forEach((r) => { if (r.state) regMap[r.state] = (regMap[r.state] || 0) + 1; });
    const topReg = Object.entries(regMap).sort((a, b) => b[1] - a[1])[0];
    if (topReg) items.push(li("📍", "订单最多的州是 <b>" + topReg[0] + "</b>（" + topReg[1] + " 单）。"));
    const payMap = {};
    rows.forEach((r) => { if (r.payment) payMap[r.payment] = (payMap[r.payment] || 0) + 1; });
    const topPay = Object.entries(payMap).sort((a, b) => b[1] - a[1])[0];
    if (topPay) items.push(li("💳", "最常用支付方式是 <b>" + topPay[0] + "</b>（" + pct1((topPay[1] / rows.length) * 100) + "）。"));
    items.push(li("📉", "取消 + 退货订单占比 <span class='num'>" + pct1(s.badRate) + "</span>" + (s.badRate > 5 ? "，偏高，建议核查发货时效与商品描述一致性。" : "，处于健康范围。")));
    const low = prods.filter((p) => p.stock != null && p.stock <= 10);
    items.push(li("⚠️", "有 <span class='num'>" + low.length + "</span> 个 SKU 库存不足 10 件" + (low.length ? "，建议尽快补货或下架。" : "，库存整体健康。")));
    ul.innerHTML = items.join("");
  }

  /* ---------------- 总渲染 ---------------- */
  let renderTimer = null;
  function renderAll() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      renderKpis();
      renderSummary();
      renderTrend();
      renderStatus();
      renderCategory();
      renderTopQty();
      renderTopRev();
      renderProfitTop();
      renderRegion();
      renderPayment();
      renderChannel();
      renderAds();
      renderStockWarn();
      renderPerfHead();
      renderPerf();
      renderInsights();
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
      order_id: idx(["order_id", "orderid", "pedido", "id"]),
      date: idx(["date", "data"]),
      sku: idx(["sku", "codigo", "product_id", "produto_id"]),
      title: idx(["title", "titulo", "nome", "produto"]),
      category: idx(["category", "categoria"]),
      color: idx(["color", "cor"]),
      qty: idx(["qty", "quantidade", "quantidade_vendida", "unidades", "units"]),
      price: idx(["unit_price", "preco_unitario", "price", "preco"]),
      revenue: idx(["revenue", "faturamento", "total", "valor"]),
      cost: idx(["cost", "custo"]),
      profit: idx(["profit", "lucro"]),
      margin: idx(["margin", "margem"]),
      shipping: idx(["shipping_fee", "frete"]),
      shipping_cost: idx(["shipping_cost", "custo_frete"]),
      coupon: idx(["coupon_discount", "desconto"]),
      ad_spend: idx(["ad_spend", "gasto_ads"]),
      ad_impressions: idx(["ad_impressions", "impressoes_ads"]),
      ad_clicks: idx(["ad_clicks", "cliques_ads"]),
      channel: idx(["channel", "canal"]),
      payment: idx(["payment", "pagamento"]),
      inst: idx(["installments_count", "parcelas"]),
      status: idx(["status", "estado"]),
      views: idx(["views", "visualizacoes", "cliques"]),
      stock: idx(["stock", "estoque"]),
      state: idx(["state", "uf"]),
      city: idx(["city", "cidade"])
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
      const get = (ix, key) => { if (ix >= 0 && c[ix] !== undefined && c[ix].trim() !== "") rec[key] = c[ix].trim().replace(/^"|"$/g, ""); };
      get(i.order_id, "order_id"); get(i.date, "date"); get(i.sku, "sku"); get(i.title, "title");
      get(i.category, "category"); get(i.color, "color"); get(i.qty, "qty"); get(i.price, "unit_price");
      get(i.revenue, "revenue"); get(i.cost, "cost"); get(i.profit, "profit"); get(i.margin, "margin");
      get(i.shipping, "shipping_fee"); get(i.shipping_cost, "shipping_cost"); get(i.coupon, "coupon_discount");
      get(i.ad_spend, "ad_spend"); get(i.ad_impressions, "ad_impressions"); get(i.ad_clicks, "ad_clicks");
      get(i.channel, "channel"); get(i.payment, "payment"); get(i.inst, "installments_count");
      get(i.status, "status"); get(i.views, "views"); get(i.stock, "stock"); get(i.state, "state"); get(i.city, "city");
      if (rec.title || rec.sku) records.push(rec);
    }
    if (!records.length) throw new Error("CSV 中没有解析到有效数据，请检查列名");
    return validate(records);
  }

  function exportCSV() {
    const rows = State.rows;
    if (!rows.length) { toast("当前没有可导出的数据", true); return; }
    const header = Object.keys(State.all[0] || {});
    const csv = [header.join(",")].concat(rows.map((r) => header.map((h) => {
      const v = r[h];
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(","))).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "店铺数据筛选_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("已导出 " + rows.length + " 条记录");
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

  function handleFile(file) {
    const name = file.name.toLowerCase();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (name.endsWith(".json")) setData(JSON.parse(reader.result), file.name);
        else if (name.endsWith(".csv")) setData(parseCSV(reader.result), file.name);
        else { toast("仅支持 .csv 或 .json 文件", true); return; }
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

  function bindEvents() {
    const f = els.filters;
    f.dateFrom.addEventListener("change", () => { State.filters.dateFrom = f.dateFrom.value; applyFilters(); });
    f.dateTo.addEventListener("change", () => { State.filters.dateTo = f.dateTo.value; applyFilters(); });
    f.category.addEventListener("change", () => { State.filters.category = f.category.value; applyFilters(); });
    f.status.addEventListener("change", () => { State.filters.status = f.status.value; applyFilters(); });
    f.keyword.addEventListener("input", debounce(() => { State.filters.keyword = f.keyword.value.trim(); applyFilters(); }, 300));
    els.trendDays.addEventListener("change", () => { State.trendDays = parseInt(els.trendDays.value, 10); renderTrend(); });

    $("#btn-reset").addEventListener("click", () => {
      State.filters = { dateFrom: "", dateTo: "", category: "all", status: "all", keyword: "" };
      Object.values(f).forEach((el) => { if (el.tagName === "SELECT") el.value = "all"; else el.value = ""; });
      refreshOptions();
      applyFilters();
      toast("已重置筛选");
    });
    $("#btn-import").addEventListener("click", () => openModal("modal-import"));
    $("#btn-export").addEventListener("click", exportCSV);
    $("#btn-sample").addEventListener("click", loadSample);
    $$("#modal-import [data-close]").forEach((b) => b.addEventListener("click", () => closeModal("modal-import")));
    $("#modal-import").addEventListener("click", (e) => { if (e.target.id === "modal-import") closeModal("modal-import"); });

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

    $("#btn-template").addEventListener("click", () => {
      const sample = State.all[0] || {};
      const header = Object.keys(sample).join(",");
      const blob = new Blob(["\ufeff" + header + "\r\n"], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "店铺数据模板.csv"; a.click();
      URL.revokeObjectURL(a.href);
    });

    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderAll, 200); });
  }

  function init() {
    cacheEls();
    bindEvents();
    loadSample();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
