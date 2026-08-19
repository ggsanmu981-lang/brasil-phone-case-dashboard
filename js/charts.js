/* =========================================================
 * 轻量 SVG 图表引擎（无外部依赖）
 * 提供：柱状图(分组)、横向条形图、环形图、散点图
 * ========================================================= */
(function () {
  const NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function divEl(className, parent) {
    const d = document.createElement("div");
    d.className = className;
    parent.appendChild(d);
    return d;
  }

  /* 数值辅助 */
  function niceNum(x, round) {
    const exp = Math.floor(Math.log10(x));
    const f = x / Math.pow(10, exp);
    let nf;
    if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * Math.pow(10, exp);
  }
  function niceTicks(maxVal, count) {
    const step = niceNum(maxVal / (count || 5), true);
    const ticks = [];
    for (let v = 0; v <= maxVal + step * 0.001; v += step) ticks.push(v);
    if (ticks.length < 2) ticks.push(step);
    return { ticks, step, max: ticks[ticks.length - 1] };
  }
  function truncate(str, n) {
    if (!str) return "";
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  }

  /* 工具提示 */
  const TOOLTIP_CLS = "chart-tooltip";
  function makeTooltip(container) {
    let tip = container.querySelector("." + TOOLTIP_CLS);
    if (!tip) tip = divEl(TOOLTIP_CLS, container);
    return tip;
  }
  function bindTip(container, target, html) {
    target.addEventListener("mousemove", (e) => {
      const tip = makeTooltip(container);
      const rect = container.getBoundingClientRect();
      tip.innerHTML = html;
      tip.classList.add("show");
      let x = e.clientX - rect.left + 14;
      let y = e.clientY - rect.top + 14;
      if (x + 160 > rect.width) x = e.clientX - rect.left - 160;
      if (y + 80 > rect.height) y = e.clientY - rect.top - 60;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    });
    target.addEventListener("mouseleave", () => {
      const tip = container.querySelector("." + TOOLTIP_CLS);
      if (tip) tip.classList.remove("show");
    });
  }

  /* ---------- 通用纵轴 ---------- */
  function drawAxes(svg, pad, W, H, ticks, yFormat, xLabels, opts) {
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    // 网格 + Y 刻度
    const max = ticks.max;
    ticks.ticks.forEach((t) => {
      const y = pad.t + plotH - (t / max) * plotH;
      svgEl("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: "#eef1f7", "stroke-width": 1 }, svg);
      const txt = svgEl("text", { x: pad.l - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#8a94a6" }, svg);
      txt.textContent = yFormat ? yFormat(t) : t;
    });
    // X 轴标签
    const n = xLabels.length;
    const slot = plotW / n;
    const rotate = n > 8 || (xLabels.some((l) => l && l.length > 6) && n > 5);
    xLabels.forEach((lb, i) => {
      const cx = pad.l + slot * i + slot / 2;
      const txt = svgEl("text", {
        x: cx, y: H - (opts.xLabel ? 16 : 12),
        "text-anchor": "middle", "font-size": 11, fill: "#8a94a6"
      }, svg);
      if (rotate) {
        txt.setAttribute("transform", `rotate(-32 ${cx} ${H - 12})`);
        txt.setAttribute("text-anchor", "end");
      }
      txt.textContent = lb;
    });
    if (opts.xLabel) {
      const xl = svgEl("text", { x: W / 2, y: H - 2, "text-anchor": "middle", "font-size": 11.5, fill: "#8a94a6" }, svg);
      xl.textContent = opts.xLabel;
    }
    return { plotW, plotH, max };
  }

  /* ---------- 柱状图（支持分组） ---------- */
  function bar(container, opts) {
    container.innerHTML = "";
    const W = container.clientWidth || 640;
    const H = opts.height || 260;
    const pad = { t: 16, r: 10, b: (opts.xLabel ? 40 : 28), l: 58 };
    const svg = svgEl("svg", { width: W, height: H }, container);
    const labels = opts.labels || [];
    const series = opts.series || [];
    if (!labels.length || !series.length) {
      const t = svgEl("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 13, fill: "#a5aebf" }, svg);
      t.textContent = "暂无数据";
      return;
    }
    let maxVal = 0;
    series.forEach((s) => s.values.forEach((v) => { if (v > maxVal) maxVal = v; }));
    if (!maxVal) maxVal = 1;
    const ticks = niceTicks(maxVal, 4);
    const { plotW, plotH } = drawAxes(svg, pad, W, H, ticks, opts.yFormat, labels, opts);
    const n = labels.length;
    const m = series.length;
    const slot = plotW / n;
    const inner = slot * (m > 1 ? 0.78 : 0.5);
    const barW = inner / m;
    const rounded = Math.min(4, barW / 2);
    const showVal = barW >= 22;
    series.forEach((s, si) => {
      const color = s.color;
      s.values.forEach((v, i) => {
        const h = (v / ticks.max) * plotH;
        const x = pad.l + slot * i + (slot - inner) / 2 + si * barW + (m > 1 ? barW * 0.06 : 0);
        const y = pad.t + plotH - h;
        const bw = barW * (m > 1 ? 0.88 : 1);
        const rect = svgEl("rect", {
          x: x, y: y, width: bw, height: Math.max(0, h), rx: rounded, fill: color, opacity: 0.92
        }, svg);
        bindTip(container, rect, `<b>${labels[i]}</b><br/>${s.name}：${opts.yFormat ? opts.yFormat(v) : v}`);
        if (showVal && v > 0) {
          const t = svgEl("text", { x: x + bw / 2, y: y - 5, "text-anchor": "middle", "font-size": 10.5, fill: "#64748b", "font-weight": 600 }, svg);
          t.textContent = opts.compact ? compactNum(v) : (opts.yFormat ? opts.yFormat(v) : v);
        }
      });
    });
  }

  /* ---------- 横向条形图 ---------- */
  function hbar(container, opts) {
    container.innerHTML = "";
    const W = container.clientWidth || 640;
    const items = opts.items || [];
    const H = opts.height || Math.max(120, items.length * 30 + 40);
    const pad = { t: 8, r: 64, b: 8, l: 8 };
    const svg = svgEl("svg", { width: W, height: H }, container);
    if (!items.length) {
      const t = svgEl("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 13, fill: "#a5aebf" }, svg);
      t.textContent = "暂无数据";
      return;
    }
    let maxVal = 0;
    items.forEach((it) => { if (it.value > maxVal) maxVal = it.value; });
    if (!maxVal) maxVal = 1;
    const plotW = W - pad.l - pad.r;
    const rowH = Math.min(32, (H - pad.t - pad.b) / items.length);
    items.forEach((it, i) => {
      const y = pad.t + i * rowH + rowH * 0.14;
      const h = rowH * 0.72;
      const w = Math.max(2, (it.value / maxVal) * plotW);
      const label = svgEl("text", { x: pad.l, y: y + h / 2 + 4, "font-size": 11.5, fill: "#4b5563" }, svg);
      label.textContent = truncate(it.label, 22);
      const rect = svgEl("rect", { x: pad.l + 4, y: y, width: w, height: h, rx: Math.min(4, h / 2), fill: it.color || "#2563eb", opacity: 0.9 }, svg);
      const val = svgEl("text", { x: pad.l + 4 + w + 6, y: y + h / 2 + 4, "font-size": 11.5, fill: "#334155", "font-weight": 700 }, svg);
      val.textContent = (opts.valueFormat ? opts.valueFormat(it.value) : it.value);
      if (it.sub) {
        const sub = svgEl("text", { x: W - pad.r + 6, y: y + h / 2 + 4, "font-size": 10.5, fill: "#94a3b8", "text-anchor": "start" }, svg);
        sub.textContent = it.sub;
      }
      bindTip(container, rect, `<b>${it.label}</b><br/>${opts.valueFormat ? opts.valueFormat(it.value) : it.value}${it.sub ? "<br/>" + it.sub : ""}`);
      bindTip(container, label, `<b>${it.label}</b><br/>${opts.valueFormat ? opts.valueFormat(it.value) : it.value}`);
    });
  }

  /* ---------- 环形图 ---------- */
  function donut(container, opts) {
    container.innerHTML = "";
    const W = container.clientWidth || 320;
    const H = opts.height || 240;
    const svg = svgEl("svg", { width: W, height: H }, container);
    const items = (opts.items || []).filter((it) => it.value > 0);
    if (!items.length) {
      const t = svgEl("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 13, fill: "#a5aebf" }, svg);
      t.textContent = "暂无数据";
      return;
    }
    const total = items.reduce((s, it) => s + it.value, 0);
    const cx = W / 2, cy = H / 2;
    const rOuter = Math.min(W, H) * 0.36;
    const rInner = rOuter * 0.62;
    let angle = -90;
    const polar = (a, r) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    items.forEach((it) => {
      const frac = it.value / total;
      const sweep = frac * 360;
      const a0 = angle;
      const a1 = angle + sweep;
      const [x0, y0] = polar(a0, rOuter);
      const [x1, y1] = polar(a1, rOuter);
      const [x2, y2] = polar(a1, rInner);
      const [x3, y3] = polar(a0, rInner);
      const large = sweep > 180 ? 1 : 0;
      const d = `M${x0},${y0} A${rOuter},${rOuter} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${rInner},${rInner} 0 ${large} 0 ${x3},${y3} Z`;
      const path = svgEl("path", { d: d, fill: it.color, opacity: 0.92, stroke: "#fff", "stroke-width": 1.5 }, svg);
      bindTip(container, path, `<b>${it.label}</b><br/>${opts.valueFormat ? opts.valueFormat(it.value) : it.value}（${(frac * 100).toFixed(1)}%）`);
      angle = a1;
    });
    if (opts.centerText !== false) {
      const c1 = svgEl("text", { x: cx, y: cy - 2, "text-anchor": "middle", "font-size": 19, "font-weight": 800, fill: "#17233d" }, svg);
      c1.textContent = opts.centerText || total.toLocaleString();
      if (opts.centerSub) {
        const c2 = svgEl("text", { x: cx, y: cy + 17, "text-anchor": "middle", "font-size": 11, fill: "#8a94a6" }, svg);
        c2.textContent = opts.centerSub;
      }
    }
  }

  /* ---------- 散点图 ---------- */
  function scatter(container, opts) {
    container.innerHTML = "";
    const W = container.clientWidth || 640;
    const H = opts.height || 280;
    const pad = { t: 16, r: 16, b: 38, l: 58 };
    const svg = svgEl("svg", { width: W, height: H }, container);
    const points = opts.points || [];
    if (!points.length) {
      const t = svgEl("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 13, fill: "#a5aebf" }, svg);
      t.textContent = "暂无数据";
      return;
    }
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    const yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    const X = (v) => pad.l + ((v - xMin) / (xMax - xMin || 1)) * plotW;
    const Y = (v) => pad.t + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
    // 网格
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (plotH / 4) * i;
      svgEl("line", { x1: pad.l, y1: y, x2: W - pad.r, y2: y, stroke: "#eef1f7" }, svg);
      const t = svgEl("text", { x: pad.l - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "#8a94a6" }, svg);
      t.textContent = opts.yFormat ? opts.yFormat(yMin + ((yMax - yMin) / 4) * i) : Math.round(yMin + ((yMax - yMin) / 4) * i);
    }
    for (let i = 0; i <= 4; i++) {
      const x = pad.l + (plotW / 4) * i;
      svgEl("line", { x1: x, y1: pad.t, x2: x, y2: H - pad.b, stroke: "#eef1f7" }, svg);
      const t = svgEl("text", { x: x, y: H - pad.b + 16, "text-anchor": "middle", "font-size": 11, fill: "#8a94a6" }, svg);
      t.textContent = opts.xFormat ? opts.xFormat(xMin + ((xMax - xMin) / 4) * i) : Math.round(xMin + ((xMax - xMin) / 4) * i);
    }
    const xl = svgEl("text", { x: W / 2, y: H - 2, "text-anchor": "middle", "font-size": 11.5, fill: "#8a94a6" }, svg);
    xl.textContent = opts.xLabel || "";
    const yl = svgEl("text", { x: 14, y: pad.t + plotH / 2, "text-anchor": "middle", "font-size": 11.5, fill: "#8a94a6", transform: `rotate(-90 14 ${pad.t + plotH / 2})` }, svg);
    yl.textContent = opts.yLabel || "";
    points.forEach((p) => {
      const c = svgEl("circle", {
        cx: X(p.x), cy: Y(p.y), r: p.r || 4.5, fill: p.color, opacity: 0.65,
        stroke: "#fff", "stroke-width": 1
      }, svg);
      bindTip(container, c, p.tip || `<b>${p.label}</b>`);
    });
  }

  /* 压缩数字：12,300 -> 1.2万 */
  function compactNum(v) {
    if (v >= 100000) return (v / 100000).toFixed(1) + "万";
    if (v >= 10000) return (v / 10000).toFixed(1) + "万";
    if (v >= 1000) return (v / 1000).toFixed(1) + "k";
    return String(v);
  }

  window.Charts = { bar, hbar, donut, scatter, compactNum, truncate };
})();
