/* =========================================================
 * 智能转化诊断：店铺转化率低卡点分析
 * ========================================================= */
(function () {
  "use strict";

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
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cleanDate = (d) => String(d || "").slice(0, 10);

  const State = { all: [], rows: [], sourceName: "示例数据" };
  let lastAnalysis = null;
  const els = {};

  function cacheEls() {
    els.banner = { ring: $("#score-ring"), title: $("#score-title"), desc: $("#score-desc"), tags: $("#score-tags") };
    els.kpis = {
      conv: $("#kpi-conv"), ctr: $("#kpi-ctr"), roas: $("#kpi-roas"),
      bad: $("#kpi-bad"), ostock: $("#kpi-ostock"), adshare: $("#kpi-adshare")
    };
    els.funnelStore = $("#funnel-store");
    els.funnelAds = $("#funnel-ads");
    els.checksGrid = $("#checks-grid");
    els.pHead = $("#p-head");
    els.pBody = $("#p-body");
    els.pCount = $("#p-count");
    els.pager = $("#pager");
    els.actions = $("#action-list");
  }

  /* ---------------- 数据 ---------------- */
  function normalizeRecord(r) {
    const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
    return {
      order_id: String(r.order_id || r.orderId || ""),
      date: cleanDate(r.date || r.data || ""),
      sku: String(r.sku || r.product_id || ""),
      title: String(r.title || r.titulo || r.nome || ""),
      category: String(r.category || r.categoria || "其他"),
      qty: num(r.qty != null ? r.qty : r.quantidade, 1),
      unit_price: num(r.unit_price != null ? r.unit_price : (r.price != null ? r.price : r.preco), 0),
      revenue: num(r.revenue != null ? r.revenue : (r.faturamento != null ? r.faturamento : r.total), 0),
      profit: num(r.profit != null ? r.profit : r.lucro, 0),
      shipping_fee: num(r.shipping_fee != null ? r.shipping_fee : r.frete, 0),
      ad_spend: num(r.ad_spend != null ? r.ad_spend : r.gasto_ads, 0),
      ad_impressions: num(r.ad_impressions != null ? r.ad_impressions : r.impressoes_ads, 0),
      ad_clicks: num(r.ad_clicks != null ? r.ad_clicks : r.cliques_ads, 0),
      channel: String(r.channel || r.canal || "Orgânico"),
      status: String(r.status || r.estado || "Concluída"),
      views: num(r.views != null ? r.views : r.visualizacoes, 0),
      stock: r.stock == null && r.estoque == null ? null : num(r.stock != null ? r.stock : r.estoque, 0)
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
    applyFilters(true);
    toast("已载入店铺示例数据（" + State.all.length + " 条）");
  }
  function setData(records, name) {
    State.all = validate(records);
    State.sourceName = name;
    applyFilters(true);
  }
  function applyFilters(silent) {
    State.rows = State.all.slice();
    renderAll();
    if (!silent) toast("已载入 " + State.all.length + " 条记录");
  }

  /* ---------------- 分析 ---------------- */
  function productStats(rows) {
    const map = {};
    rows.forEach((r) => {
      const s = r.sku || "?";
      if (!map[s]) map[s] = { sku: s, title: r.title, category: r.category, qty: 0, rev: 0, profit: 0, ad: 0, views: 0, stock: null };
      const d = map[s];
      d.qty += r.qty;
      d.rev += r.revenue;
      d.profit += r.profit || 0;
      d.ad += r.ad_spend || 0;
      d.views = Math.max(d.views, r.views || 0);
      if (r.stock != null) d.stock = r.stock;
    });
    return Object.values(map).map((d) => ({ ...d, conv: d.views ? (d.qty / d.views) * 100 : 0 }));
  }

  function analyze() {
    const rows = State.rows;
    if (!rows.length) return null;
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const qty = rows.reduce((s, r) => s + r.qty, 0);
    const profit = rows.reduce((s, r) => s + (r.profit || 0), 0);
    const adSpend = rows.reduce((s, r) => s + (r.ad_spend || 0), 0);
    const adImpressions = rows.reduce((s, r) => s + (r.ad_impressions || 0), 0);
    const adClicks = rows.reduce((s, r) => s + (r.ad_clicks || 0), 0);
    const orders = new Set(rows.map((r) => r.order_id || (r.date + "|" + r.sku + "|" + r.qty))).size;
    const doneOrders = rows.filter((r) => r.status === "Concluída" || r.status === "Enviada").length;
    const adOrders = rows.filter((r) => r.channel === "Anúncios").length;
    const adRevenue = rows.filter((r) => r.channel === "Anúncios").reduce((s, r) => s + r.revenue, 0);
    const vmap = {};
    rows.forEach((r) => { const k = r.sku + "|" + r.date; vmap[k] = Math.max(vmap[k] || 0, r.views || 0); });
    const views = Object.values(vmap).reduce((a, b) => a + b, 0);
    const bad = rows.filter((r) => r.status === "Cancelada" || r.status === "Devolvida").length;

    const prods = productStats(rows);
    const totalSkus = prods.length;
    const outOfStock = prods.filter((p) => p.stock != null && p.stock <= 0).length;
    const lowEff = prods.filter((p) => p.views > 0 && p.conv < 1).length;
    const top1Rev = prods.slice().sort((a, b) => b.rev - a.rev)[0] ? prods.slice().sort((a, b) => b.rev - a.rev)[0].rev : 0;

    const conv = views ? (qty / views) * 100 : 0;
    const ctr = adImpressions ? (adClicks / adImpressions) * 100 : 0;
    const roas = adSpend ? adRevenue / adSpend : 0;
    const badRate = rows.length ? (bad / rows.length) * 100 : 0;
    const ostockRate = totalSkus ? (outOfStock / totalSkus) * 100 : 0;
    const adShare = orders ? (adOrders / orders) * 100 : 0;
    const top1Share = revenue ? (top1Rev / revenue) * 100 : 0;
    const lowEffShare = totalSkus ? (lowEff / totalSkus) * 100 : 0;

    const checks = [
      { icon: "🎯", title: "整体转化率", value: pct1(conv), target: "目标 ≥ 2%",
        score: clamp((conv / 2) * 100, 0, 100),
        status: conv >= 2 ? "good" : conv >= 1 ? "warn" : "bad",
        advice: conv >= 2 ? "转化率处于健康水平，可继续加大曝光。"
          : conv >= 1 ? "转化率偏低：优先优化主图、标题关键词与价格竞争力，并引导评价。"
          : "转化率严重偏低：建议复盘主图、价格、运费与差评，找出流失环节。" },
      { icon: "👆", title: "广告点击率 CTR", value: pct1(ctr), target: "目标 ≥ 1.2%",
        score: clamp((ctr / 1.2) * 100, 0, 100),
        status: ctr >= 1.2 ? "good" : ctr >= 0.8 ? "warn" : "bad",
        advice: ctr >= 1.2 ? "广告创意点击表现良好。"
          : ctr >= 0.8 ? "CTR 略低：尝试更换主图、标题前缀或测试不同人群包。"
          : "CTR 过低：广告素材吸引力不足，建议 A/B 测试主图与文案。" },
      { icon: "📣", title: "广告 ROAS", value: roas ? roas.toFixed(2) + "x" : "-", target: "目标 ≥ 3x",
        score: clamp((roas / 3) * 100, 0, 100),
        status: roas >= 3 ? "good" : roas >= 1.8 ? "warn" : "bad",
        advice: roas >= 3 ? "广告投放回报健康。"
          : roas >= 1.8 ? "ROAS 一般：收缩低效关键词出价，聚焦高转化商品。"
          : "ROAS 偏低（可能亏钱）：暂停低效广告，先优化商品页再放量。" },
      { icon: "📉", title: "取消+退货率", value: pct1(badRate), target: "目标 ≤ 4%",
        score: clamp(100 - badRate * 10, 0, 100),
        status: badRate <= 4 ? "good" : badRate <= 8 ? "warn" : "bad",
        advice: badRate <= 4 ? "售后健康，退换比例正常。"
          : badRate <= 8 ? "取消/退货偏高：核查发货时效、库存与描述一致性。"
          : "取消/退货严重：优先处理差评与物流时效，避免影响店铺权重。" },
      { icon: "📦", title: "缺货率", value: pct1(ostockRate), target: "目标 ≤ 5%",
        score: clamp(100 - ostockRate * 8, 0, 100),
        status: ostockRate <= 5 ? "good" : ostockRate <= 10 ? "warn" : "bad",
        advice: ostockRate <= 5 ? "库存整体充足。"
          : ostockRate <= 10 ? "部分商品缺货：及时补货，缺货商品先下架避免差评。"
          : "缺货严重：梳理供应链，热门 SKU 建立安全库存。" },
      { icon: "🔄", title: "广告订单占比", value: pct1(adShare), target: "目标 ≤ 40%",
        score: clamp(100 - Math.max(0, adShare - 20) * 2.5, 0, 100),
        status: adShare <= 40 ? "good" : adShare <= 55 ? "warn" : "bad",
        advice: adShare <= 40 ? "流量结构健康，自然流量占主导。"
          : adShare <= 55 ? "对广告依赖偏高：提升自然搜索排名、积累评价与复购。"
          : "过度依赖广告：一旦停止投放销量会明显下滑，需建设自然流量。" },
      { icon: "🏆", title: "爆款集中度", value: pct1(top1Share), target: "目标 ≤ 30%",
        score: clamp(100 - Math.max(0, top1Share - 15) * 3.3, 0, 100),
        status: top1Share <= 30 ? "good" : top1Share <= 45 ? "warn" : "bad",
        advice: top1Share <= 30 ? "销售结构分散，抗风险能力强。"
          : top1Share <= 45 ? "依赖单一爆款：建议扩展新机型/款式分散风险。"
          : "严重依赖单一爆款：一旦断货或降价竞争，整体销售受影响。" },
      { icon: "🧹", title: "低效商品占比", value: pct1(lowEffShare), target: "目标 ≤ 30%",
        score: clamp(100 - Math.max(0, lowEffShare - 15) * 2.5, 0, 100),
        status: lowEffShare <= 30 ? "good" : lowEffShare <= 50 ? "warn" : "bad",
        advice: lowEffShare <= 30 ? "商品整体转化健康。"
          : lowEffShare <= 50 ? "部分商品有流量没转化：优化详情页、价格与评价。"
          : "大量低效商品：清理长期零转化 Listing，集中资源到潜力款。" }
    ];

    const overall = Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length);
    const badCount = checks.filter((c) => c.status === "bad").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;
    const grade = overall >= 80 ? "优秀" : overall >= 65 ? "良好" : overall >= 50 ? "需优化" : "告急";
    const worst = checks.filter((c) => c.status !== "good").sort((a, b) => a.score - b.score).slice(0, 3);

    return {
      revenue, qty, profit, adSpend, adImpressions, adClicks, orders, doneOrders, adOrders, adRevenue,
      views, conv, ctr, roas, badRate, ostockRate, adShare, top1Share, lowEffShare,
      prods, checks, overall, grade, badCount, warnCount, worst
    };
  }

  /* ---------------- 渲染 ---------------- */
  function renderBanner(a) {
    els.banner.ring.textContent = a.overall;
    els.banner.title.textContent = "总体诊断：" + a.grade + "（" + a.overall + " 分）";
    els.banner.desc.textContent = "共发现 " + a.badCount + " 个严重卡点、" + a.warnCount + " 个警示项" +
      (a.worst.length ? "，最需优先处理：" + a.worst.map((c) => c.title).join("、") + "。" : "，整体表现健康。");
    els.banner.ring.style.background = a.overall >= 80 ? "#10b981" : a.overall >= 65 ? "#f59e0b" : a.overall >= 50 ? "#f97316" : "#ef4444";
    els.banner.tags.innerHTML = a.checks.filter((c) => c.status !== "good").map((c) =>
      '<span class="tag tag-' + c.status + '">' + c.icon + " " + c.title + "</span>").join("");
  }

  function renderKpis(a) {
    const set = (el, v, s) => { el.querySelector(".kpi-value").innerHTML = v; el.querySelector(".kpi-sub").textContent = s; };
    set(els.kpis.conv, pct1(a.conv), "目标 ≥ 2%");
    set(els.kpis.ctr, pct1(a.ctr), "目标 ≥ 1.2%");
    set(els.kpis.roas, a.roas ? a.roas.toFixed(2) + "x" : "-", "目标 ≥ 3x");
    set(els.kpis.bad, pct1(a.badRate), "目标 ≤ 4%");
    set(els.kpis.ostock, pct1(a.ostockRate), "目标 ≤ 5%");
    set(els.kpis.adshare, pct1(a.adShare), "目标 ≤ 40%");
  }

  function renderFunnel(container, stages) {
    const max = Math.max.apply(null, stages.map((s) => s.value)) || 1;
    let html = "";
    stages.forEach((st, i) => {
      const w = Math.max(4, (st.value / max) * 100);
      html += '<div class="funnel-row">' +
        '<div class="funnel-bar" style="width:' + w + '%"></div>' +
        '<span class="funnel-label">' + esc(st.label) + "</span>" +
        '<span class="funnel-val">' + (st.money ? fmtBRL(st.value) : fmtInt(st.value)) + "</span>" +
        "</div>";
      if (i < stages.length - 1) {
        const prev = stages[i].value;
        const rate = prev ? (stages[i + 1].value / prev) * 100 : 0;
        html += '<div class="funnel-conv">↓ ' + pct1(rate) + "</div>";
      }
    });
    container.innerHTML = html;
  }

  function renderChecks(a) {
    els.checksGrid.innerHTML = a.checks.map((c) =>
      '<div class="check-card">' +
      '<div class="check-head"><span class="check-icon">' + c.icon + "</span>" +
      '<span class="check-title">' + esc(c.title) + "</span>" +
      '<span class="check-status ' + c.status + '">' + (c.status === "good" ? "健康" : c.status === "warn" ? "警示" : "卡点") + "</span></div>" +
      '<div class="check-value">' + c.value + ' <span class="muted">· ' + c.target + "</span></div>" +
      '<div class="check-score-bar"><div class="check-score-fill" style="width:' + c.score + '%;background:' + (c.score >= 80 ? "#10b981" : c.score >= 60 ? "#f59e0b" : "#ef4444") + '"></div></div>' +
      '<div class="check-advice">' + esc(c.advice) + "</div>" +
      "</div>"
    ).join("");
  }

  /* 商品卡点表 */
  const P_COLUMNS = [
    { key: "sku", label: "SKU", num: false },
    { key: "title", label: "商品标题", num: false },
    { key: "views", label: "浏览量", num: true },
    { key: "qty", label: "销量", num: true },
    { key: "conv", label: "转化率", num: true },
    { key: "rating", label: "评级", num: false },
    { key: "ad", label: "广告费", num: true },
    { key: "profit", label: "利润", num: true },
    { key: "potential", label: "优化潜力", num: true },
    { key: "advice", label: "优化建议", num: false }
  ];
  const PState = { page: 1, perPage: 15, sortKey: "potential", sortDir: -1 };

  function rateConv(conv) {
    if (conv >= 2) return { label: "优", cls: "r-good" };
    if (conv >= 1) return { label: "中", cls: "r-warn" };
    return { label: "低", cls: "r-bad" };
  }
  function adviceFor(p) {
    const r = rateConv(p.conv);
    if (p.views <= 0) return "流量不足：优化标题关键词与类目，提升曝光。";
    if (r.cls === "r-bad") return p.ad > 0 ? "有流量无转化且投广告：暂停广告，先优化主图/价格/评价。" : "浏览多转化低：优化主图、标题、价格与评价。";
    if (r.cls === "r-warn") return "转化一般：可 A/B 测试价格与主图，观察评价质量。";
    return p.ad > 0 ? "表现良好：可加大广告预算放量。" : "表现良好：维持自然流量，可考虑付费推广。";
  }
  function productRows(a) {
    return a.prods.map((p) => {
      const r = rateConv(p.conv);
      const potential = p.views > 0 ? p.views * clamp(2 - p.conv, 0, 2) : 0;
      return { ...p, rating: r.label, ratingCls: r.cls, potential, advice: adviceFor(p) };
    });
  }
  function renderPHead() {
    els.pHead.innerHTML = "<tr>" + P_COLUMNS.map((c) => {
      const dir = PState.sortKey === c.key ? (PState.sortDir === 1 ? " ▲" : " ▼") : "";
      return '<th data-key="' + c.key + '">' + c.label + dir + "</th>";
    }).join("") + "</tr>";
    $$("#p-head th").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.key;
        if (PState.sortKey === key) PState.sortDir *= -1;
        else { PState.sortKey = key; PState.sortDir = P_COLUMNS.find((c) => c.key === key).num ? -1 : 1; }
        PState.page = 1;
        renderP();
      });
    });
  }
  function renderP() {
    const a = lastAnalysis;
    if (!a) return;
    let list = productRows(a);
    list.sort((x, y) => {
      const av = x[PState.sortKey], bv = y[PState.sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * PState.sortDir;
      return String(av).localeCompare(String(bv)) * PState.sortDir;
    });
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / PState.perPage));
    if (PState.page > pages) PState.page = pages;
    const page = list.slice((PState.page - 1) * PState.perPage, PState.page * PState.perPage);
    els.pCount.textContent = "共 " + fmtInt(total) + " 个 SKU · 第 " + PState.page + "/" + pages + " 页";
    els.pBody.innerHTML = page.map((p) =>
      "<tr>" +
      "<td>" + esc(p.sku) + "</td>" +
      '<td class="title-cell" title="' + esc(p.title) + '">' + esc(p.title) + "</td>" +
      "<td>" + fmtInt(p.views) + "</td>" +
      "<td><b>" + fmtInt(p.qty) + "</b></td>" +
      "<td>" + (p.conv ? p.conv.toFixed(2) + "%" : "-") + "</td>" +
      '<td><span class="rate-badge ' + p.ratingCls + '">' + p.rating + "</span></td>" +
      "<td>" + (p.ad ? fmtBRL(p.ad) : "—") + "</td>" +
      "<td>" + fmtBRL(p.profit) + "</td>" +
      "<td>" + fmtInt(Math.round(p.potential)) + "</td>" +
      '<td class="muted" style="max-width:260px">' + esc(p.advice) + "</td>" +
      "</tr>"
    ).join("");
    els.pager.innerHTML =
      '<span class="muted">' + els.pCount.textContent + "</span>" +
      '<div class="pager-btns">' +
      '<button data-page="prev"' + (PState.page <= 1 ? " disabled" : "") + ">上一页</button>" +
      '<button data-page="next"' + (PState.page >= pages ? " disabled" : "") + ">下一页</button>" +
      "</div>";
    $$("#pager button").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.page === "prev" && PState.page > 1) PState.page--;
        if (b.dataset.page === "next" && PState.page < pages) PState.page++;
        renderP();
      });
    });
  }

  function renderActions(a) {
    const items = [];
    const push = (icon, text) => items.push("<li><span class='ic'>" + icon + "</span><span>" + text + "</span></li>");
    const bad = a.checks.filter((c) => c.status === "bad");
    const warn = a.checks.filter((c) => c.status === "warn");
    bad.forEach((c) => push(c.icon, "<b>【优先】" + c.title + "</b>：" + c.advice));
    warn.forEach((c) => push(c.icon, "<b>" + c.title + "</b>：" + c.advice));
    if (!bad.length && !warn.length) {
      push("✅", "当前没有明显卡点。建议：继续监测转化率、保持库存与评价，尝试小幅涨价测试利润空间。");
    }
    // 高潜力商品提醒
    const topP = productRows(a).slice().sort((x, y) => y.potential - x.potential).slice(0, 3).filter((p) => p.potential > 0);
    if (topP.length) {
      push("🚀", "最有优化潜力的商品：<b>" + esc(topP.map((p) => p.sku).join("、")) + "</b>，优先按建议优化后可显著提升销量。");
    }
    els.actions.innerHTML = items.join("");
  }

  function renderAll() {
    const a = analyze();
    if (!a) {
      $("#score-banner").style.display = "none";
      els.checksGrid.innerHTML = '<div class="center muted" style="padding:30px 0">暂无数据，请导入数据</div>';
      return;
    }
    $("#score-banner").style.display = "flex";
    renderBanner(a);
    renderKpis(a);
    renderFunnel(els.funnelStore, [
      { label: "商品浏览量", value: a.views },
      { label: "下单", value: a.orders },
      { label: "成交订单", value: a.doneOrders },
      { label: "销售额", value: a.revenue, money: true }
    ]);
    renderFunnel(els.funnelAds, [
      { label: "广告曝光", value: a.adImpressions },
      { label: "广告点击", value: a.adClicks },
      { label: "广告订单", value: a.adOrders },
      { label: "广告销售额", value: a.adRevenue, money: true }
    ]);
    lastAnalysis = a;
    renderChecks(a);
    renderPHead();
    renderP();
    renderActions(a);
  }

  /* ---------------- 导入与提示 ---------------- */
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
  function parseCSV(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("CSV 至少需要表头和一行数据");
    const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const idx = (names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
    const i = {
      date: idx(["date", "data"]), order_id: idx(["order_id", "pedido"]), sku: idx(["sku", "codigo"]),
      title: idx(["title", "titulo", "nome"]), qty: idx(["qty", "quantidade"]),
      price: idx(["unit_price", "preco_unitario", "price", "preco"]),
      revenue: idx(["revenue", "faturamento", "total"]), profit: idx(["profit", "lucro"]),
      shipping: idx(["shipping_fee", "frete"]), ad_spend: idx(["ad_spend", "gasto_ads"]),
      ad_impressions: idx(["ad_impressions", "impressoes_ads"]), ad_clicks: idx(["ad_clicks", "cliques_ads"]),
      channel: idx(["channel", "canal"]), status: idx(["status", "estado"]),
      views: idx(["views", "visualizacoes"]), stock: idx(["stock", "estoque"])
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
      get(i.date, "date"); get(i.order_id, "order_id"); get(i.sku, "sku"); get(i.title, "title");
      get(i.qty, "qty"); get(i.price, "unit_price"); get(i.revenue, "revenue"); get(i.profit, "profit");
      get(i.shipping, "shipping_fee"); get(i.ad_spend, "ad_spend"); get(i.ad_impressions, "ad_impressions");
      get(i.ad_clicks, "ad_clicks"); get(i.channel, "channel"); get(i.status, "status");
      get(i.views, "views"); get(i.stock, "stock");
      if (rec.title || rec.sku) records.push(rec);
    }
    if (!records.length) throw new Error("CSV 中没有解析到有效数据，请检查列名");
    return validate(records);
  }

  function bindEvents() {
    $("#btn-sample").addEventListener("click", loadSample);
    $("#btn-import").addEventListener("click", () => openModal("modal-import"));
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
