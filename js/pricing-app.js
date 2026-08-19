/* =========================================================
 * 利润核价表（巴西美客多）· 按「巴西美客多」表逻辑计算
 * ========================================================= */
(function () {
  "use strict";

  const LS_KEY = "ml_pricing_v2";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const fmtBRL = (v) => (v == null || isNaN(v) ? "-" : "R$ " + Number(v).toFixed(2));
  const fmtPct = (v) => (v == null || isNaN(v) ? "-" : Number(v).toFixed(1) + "%");

  // 巴西美客多平台费用明细（可编辑）
  const DEFAULT_FEES = [
    { name: "类目扣点", value: 0.18 },
    { name: "交易费", value: 0.03 },
    { name: "分期付款费", value: 0.03 },
    { name: "公司记账报税", value: 0.01 }
  ];
  // 巴西美客多核价表主表数据（材质 / 成本¥ / 售价R$ / 操作费固定 / 广告费 / 签收率 / 预期ROI）
  const DEFAULT_ROWS = [
    { name: "CYK", costCny: 13, price: 29.9, coupon: 0, orderFee: 7.49, adFee: 0, delivery: 0.9, roi: 6 },
    { name: "PFFH", costCny: 9.5, price: 49.9, coupon: 0, orderFee: 7.49, adFee: 0, delivery: 0.9, roi: 5 },
    { name: "太空壳", costCny: 10.8, price: 39.9, coupon: 0, orderFee: 7.49, adFee: 0, delivery: 0.9, roi: 6 },
    { name: "四角", costCny: 6.3, price: 33, coupon: 0, orderFee: 6.5, adFee: 0, delivery: 0.9, roi: 6 },
    { name: "3D玻璃防窥膜", costCny: 8.2, price: 29.9, coupon: 0, orderFee: 6.5, adFee: 0, delivery: 0.9, roi: 8 },
    { name: "无尘仓防窥膜", costCny: 14, price: 42.9, coupon: 0, orderFee: 6.5, adFee: 0, delivery: 0.9, roi: 8 },
    { name: "无尘仓高清膜", costCny: 12.5, price: 39.9, coupon: 0, orderFee: 6.5, adFee: 0, delivery: 0.9, roi: 8 },
    { name: "磁吸壳", costCny: 10.5, price: 49.9, coupon: 0, orderFee: 7.49, adFee: 0, delivery: 0.9, roi: 6 }
  ];

  let State = load();

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.rows)) {
          s.params = Object.assign({ rate: 0.77, orderFee: 6.5, other: 0.92, bid: 0.9, delivery: 0.9, roi: 6, target: 50 }, s.params || {});
          s.fees = Array.isArray(s.fees) && s.fees.length ? s.fees : DEFAULT_FEES.slice();
          return s;
        }
      }
    } catch (e) { /* ignore */ }
    return { params: { rate: 0.77, orderFee: 6.5, other: 0.92, bid: 0.9, delivery: 0.9, roi: 6, target: 50 }, fees: DEFAULT_FEES.slice(), rows: DEFAULT_ROWS.slice() };
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(State)); } catch (e) { /* ignore */ }
  }
  function feeTotal() {
    return State.fees.reduce((s, f) => s + (num(f.value, 0)), 0);
  }

  // 与「巴西美客多」表一致：
  // 成本(纯成本)=成本¥×汇率；平台费用=售价×费用汇总；退货费用=(成本-优惠券)×(1-签收率)
  // 所有费用=成本+操作费+平台费用+退货费用+广告费；保本CPA=(售价-所有费用)×0.92；保本ROI=售价÷保本CPA
  function calcRow(r) {
    const p = State.params;
    const rate = num(p.rate, 0.77);
    const other = num(p.other, 0.92);
    const bid = num(p.bid, 0.9);
    const delivery = r.delivery == null || r.delivery === "" ? num(p.delivery, 0.9) : num(r.delivery, 0.9);
    const roi = r.roi == null || r.roi === "" ? num(p.roi, 6) : num(r.roi, 6);
    const price = num(r.price, 0);
    const coupon = num(r.coupon, 0);
    const costCny = num(r.costCny, 0);
    const orderFee = r.orderFee == null || r.orderFee === "" ? num(p.orderFee, 6.5) : num(r.orderFee, 0);
    const adFee = num(r.adFee, 0);
    const ft = feeTotal();
    const costBRL = costCny * rate;
    const platformFee = price * ft;
    const returnFee = (costBRL - coupon) * (1 - delivery);
    const allCost = costBRL + orderFee + platformFee + returnFee + adFee;
    const gross = price ? ((price - allCost) / price) * 100 : 0;
    const cpa = (price - allCost) * other;
    const beRoi = cpa > 0 ? price / cpa : 0;
    const expectedProfit = cpa - (roi > 0 ? price / roi : 0);
    const margin = price ? (expectedProfit / price) * 100 : 0;
    const bidRoi = bid > 0 ? roi / bid : 0;
    const targetPct = num(p.target, 50) / 100;
    let suggest = null;
    const denom = 1 - ft - targetPct;
    if (denom > 0) {
      suggest = (costBRL + orderFee + (costBRL - coupon) * (1 - delivery) + adFee) / denom;
    }
    return { costBRL, platformFee, returnFee, allCost, gross, cpa, beRoi, expectedProfit, margin, bidRoi, suggest, delivery, roi, adFee };
  }

  /* ---------------- 渲染 ---------------- */
  function renderParams() {
    $("#p-rate").value = State.params.rate;
    $("#p-orderfee").value = State.params.orderFee;
    $("#p-other").value = State.params.other;
    $("#p-bid").value = State.params.bid;
    $("#p-delivery").value = State.params.delivery;
    $("#p-roi").value = State.params.roi;
    $("#p-target").value = State.params.target;
    renderFees();
  }
  function renderFees() {
    $("#fee-list").innerHTML = State.fees.map((f, i) =>
      '<div class="fee-row">' +
      '<input class="fee-name" data-i="' + i + '" value="' + esc(f.name) + '" placeholder="费用名称">' +
      '<input class="fee-val" type="number" step="0.001" data-i="' + i + '" value="' + f.value + '">' +
      '<button class="fee-del" data-i="' + i + '">✕</button>' +
      "</div>"
    ).join("");
    $("#fee-total").textContent = (feeTotal() * 100).toFixed(1) + "%";
    $$(".fee-name").forEach((el) => el.addEventListener("input", (e) => { State.fees[+e.target.dataset.i].name = e.target.value; save(); }));
    $$(".fee-val").forEach((el) => el.addEventListener("input", (e) => { State.fees[+e.target.dataset.i].value = num(e.target.value, 0); save(); renderFees(); }));
    $$(".fee-del").forEach((el) => el.addEventListener("click", (e) => { State.fees.splice(+e.target.dataset.i, 1); save(); renderFees(); renderAll(); }));
  }

  const EDIT_FIELDS = [
    { key: "name", label: "材质/款名", w: 110 },
    { key: "costCny", label: "成本(¥)", w: 80 },
    { key: "price", label: "券后售价(R$)", w: 90 },
    { key: "coupon", label: "优惠券(R$)", w: 80 },
    { key: "orderFee", label: "操作费固定(R$)", w: 90 },
    { key: "adFee", label: "广告费(R$)", w: 80 },
    { key: "delivery", label: "签收率", w: 70 },
    { key: "roi", label: "预期ROI", w: 70 }
  ];
  const CALC_FIELDS = [
    { key: "costBRL", label: "成本(R$)", fmt: fmtBRL },
    { key: "platformFee", label: "平台费用", fmt: fmtBRL },
    { key: "returnFee", label: "退货费用", fmt: fmtBRL },
    { key: "allCost", label: "所有费用", fmt: fmtBRL },
    { key: "gross", label: "毛利率", fmt: fmtPct },
    { key: "beRoi", label: "保本ROI", fmt: (v) => (v == null || isNaN(v) ? "-" : v.toFixed(2) + "x") },
    { key: "cpa", label: "保本CPA", fmt: fmtBRL },
    { key: "expectedProfit", label: "预期毛利", fmt: fmtBRL },
    { key: "margin", label: "毛利率", fmt: fmtPct },
    { key: "bidRoi", label: "出价ROI", fmt: (v) => (v == null || isNaN(v) ? "-" : v.toFixed(2) + "x") },
    { key: "suggest", label: "建议售价", fmt: (v) => (v == null || v <= 0 ? "—" : fmtBRL(v)) }
  ];

  function renderHead() {
    let html = "<tr>";
    EDIT_FIELDS.forEach((c) => { html += '<th style="min-width:' + c.w + 'px">' + c.label + "</th>"; });
    CALC_FIELDS.forEach((c) => { html += "<th>" + c.label + "</th>"; });
    html += "<th></th></tr>";
    $("#calc-head").innerHTML = html;
  }
  function renderBody() {
    const body = $("#calc-body");
    body.innerHTML = State.rows.map((r, i) => {
      const c = calcRow(r);
      let html = "<tr data-i='" + i + "'>";
      EDIT_FIELDS.forEach((f) => {
        const isNum = f.key !== "name";
        html += '<td><input class="calc-input' + (isNum ? " num" : "") + '" data-field="' + f.key + '" ' +
          (isNum ? 'type="number" step="any"' : 'type="text"') +
          ' value="' + esc(r[f.key] == null ? "" : r[f.key]) + '"></td>';
      });
      CALC_FIELDS.forEach((f) => {
        const v = c[f.key];
        const warn = (f.key === "gross" && v < 0) || (f.key === "margin" && v < 0);
        html += '<td class="calc-cell' + (warn ? " neg" : "") + '" data-calc="' + f.key + '">' + f.fmt(v) + "</td>";
      });
      html += '<td><button class="row-del" data-i="' + i + '">✕</button></td>';
      html += "</tr>";
      return html;
    }).join("");
    $$("#calc-body .calc-input").forEach((el) => el.addEventListener("input", (e) => {
      const i = +el.closest("tr").dataset.i;
      const key = e.target.dataset.field;
      State.rows[i][key] = e.target.value;
      save();
      updateRow(i);
    }));
    $$("#calc-body .row-del").forEach((el) => el.addEventListener("click", (e) => {
      State.rows.splice(+e.target.dataset.i, 1);
      save();
      renderBody();
      renderSummary();
    }));
  }
  function updateRow(i) {
    const tr = document.querySelector('#calc-body tr[data-i="' + i + '"]');
    if (!tr || !State.rows[i]) return;
    const c = calcRow(State.rows[i]);
    CALC_FIELDS.forEach((f) => {
      const cell = tr.querySelector('td[data-calc="' + f.key + '"]');
      if (cell) {
        const v = c[f.key];
        cell.textContent = f.fmt(v);
        cell.classList.toggle("neg", (f.key === "gross" && v < 0) || (f.key === "margin" && v < 0));
      }
    });
    renderSummary();
  }

  function renderSummary() {
    const rows = State.rows;
    const valid = rows.filter((r) => num(r.price, 0) > 0);
    const set = (id, v, sub) => { $(id).querySelector(".kpi-value").textContent = v; if (sub) $(id).querySelector(".kpi-sub").textContent = sub; };
    set("#s-rows", rows.length, "当前表格行数");
    if (!valid.length) {
      set("#s-gross", "-"); set("#s-margin", "-"); set("#s-roi", "-"); set("#s-suggest", "-");
      return;
    }
    const calcs = valid.map(calcRow);
    const avg = (k) => calcs.reduce((s, c) => s + (c[k] || 0), 0) / calcs.length;
    set("#s-gross", fmtPct(avg("gross")), "（售价-所有费用）÷ 售价");
    set("#s-margin", fmtPct(avg("margin")), "按预期 ROI 计算");
    set("#s-roi", avg("beRoi").toFixed(2) + "x", "低于此值会亏");
    const sug = calcs.filter((c) => c.suggest != null && c.suggest > 0);
    set("#s-suggest", sug.length ? fmtBRL(sug.reduce((s, c) => s + c.suggest, 0) / sug.length) : "—", "目标毛利率 " + State.params.target + "% 所需售价（均值）");
  }

  function renderAll() {
    renderParams();
    renderHead();
    renderBody();
    renderSummary();
    save();
  }

  /* ---------------- 导出 ---------------- */
  function exportCSV() {
    if (!State.rows.length) { toast("当前没有数据"); return; }
    const header = ["材质/款名", "成本(¥)", "券后售价(R$)", "优惠券(R$)", "操作费固定(R$)", "广告费(R$)", "签收率", "预期ROI", "成本(R$)", "平台费用", "退货费用", "所有费用", "毛利率%", "保本ROI", "保本CPA", "预期毛利", "毛利率%", "建议售价(R$)"];
    const lines = State.rows.map((r) => {
      const c = calcRow(r);
      const d = r.delivery == null || r.delivery === "" ? State.params.delivery : r.delivery;
      const roi = r.roi == null || r.roi === "" ? State.params.roi : r.roi;
      return [r.name, r.costCny, r.price, r.coupon, r.orderFee == null || r.orderFee === "" ? State.params.orderFee : r.orderFee, r.adFee || 0, d, roi, c.costBRL, c.platformFee, c.returnFee, c.allCost, c.gross.toFixed(2), c.beRoi.toFixed(2), c.cpa, c.expectedProfit, c.margin.toFixed(2), c.suggest ? c.suggest.toFixed(2) : ""];
    });
    const esc2 = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [header.map(esc2).join(",")].concat(lines2.map((l) => l.map(esc2).join(","))).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "巴西美客多利润核价表.csv"; a.click();
    URL.revokeObjectURL(a.href);
    toast("已导出 " + State.rows.length + " 行");
  }

  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "toast show";
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = "toast"; }, 2200);
  }

  function bindEvents() {
    const bindParam = (id, key) => {
      $(id).addEventListener("input", () => {
        State.params[key] = $(id).value;
        save();
        renderBody();
        renderSummary();
      });
    };
    bindParam("#p-rate", "rate");
    bindParam("#p-orderfee", "orderFee");
    bindParam("#p-other", "other");
    bindParam("#p-bid", "bid");
    bindParam("#p-delivery", "delivery");
    bindParam("#p-roi", "roi");
    bindParam("#p-target", "target");

    $("#fee-add").addEventListener("click", () => { State.fees.push({ name: "其他费用", value: 0.01 }); save(); renderFees(); renderBody(); renderSummary(); });
    $("#btn-add").addEventListener("click", () => { State.rows.push({ name: "新款式", costCny: 0, price: 0, coupon: 0, orderFee: "", adFee: 0, delivery: "", roi: "" }); save(); renderBody(); renderSummary(); });
    $("#btn-clear").addEventListener("click", () => { State.rows = []; save(); renderBody(); renderSummary(); });
    $("#btn-sample").addEventListener("click", () => { State.rows = DEFAULT_ROWS.slice(); save(); renderBody(); renderSummary(); });
    $("#btn-export").addEventListener("click", exportCSV);
  }

  function init() {
    bindEvents();
    renderAll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
