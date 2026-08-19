/* =========================================================
 * 利润核价表（巴西美客多）· 与「巴西美客多」主表列顺序完全一致
 * ========================================================= */
(function () {
  "use strict";

  const LS_KEY = "ml_pricing_v4";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const fmtBRL = (v) => (v == null || isNaN(v) ? "-" : "R$ " + Number(v).toFixed(2));
  const fmtPct = (v) => (v == null || isNaN(v) ? "-" : Number(v).toFixed(1) + "%");
  const fmtRoi = (v) => (v == null || isNaN(v) ? "-" : v.toFixed(2) + "x");

  const DEFAULT_FEES = [
    { name: "类目扣点(平台佣金)", value: 0.18 },
    { name: "分期付款费", value: 0.03 },
    { name: "订单支付交易费", value: 0.03 },
    { name: "公司记账报税", value: 0.01 }
  ];
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
          s.params = Object.assign({ rate: 0.77, orderFee: 6.5, other: 0.92, bid: 0.9, delivery: 0.9, roi: 6 }, s.params || {});
          s.fees = Array.isArray(s.fees) && s.fees.length ? s.fees : DEFAULT_FEES.slice();
          return s;
        }
      }
    } catch (e) { /* ignore */ }
    return { params: { rate: 0.77, orderFee: 6.5, other: 0.92, bid: 0.9, delivery: 0.9, roi: 6 }, fees: DEFAULT_FEES.slice(), rows: DEFAULT_ROWS.slice() };
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(State)); } catch (e) { /* ignore */ }
  }
  function fee(name, def) {
    const f = State.fees.find((x) => x.name && x.name.indexOf(name) >= 0);
    return f ? num(f.value, def) : def;
  }

  // 与「巴西美客多」主表一致
  function calcRow(r) {
    const p = State.params;
    const rate = num(p.rate, 0.77);
    const other = num(p.other, 0.92);
    const delivery = r.delivery == null || r.delivery === "" ? num(p.delivery, 0.9) : num(r.delivery, 0.9);
    const roi = r.roi == null || r.roi === "" ? num(p.roi, 6) : num(r.roi, 6);
    const price = num(r.price, 0);
    const coupon = num(r.coupon, 0);
    const costCny = num(r.costCny, 0);
    const orderFee = r.orderFee == null || r.orderFee === "" ? num(p.orderFee, 6.5) : num(r.orderFee, 0);
    const adFee = num(r.adFee, 0);
    const costBRL = costCny * rate;
    const commission = price * fee("类目扣点", 0.18);
    const installment = price * fee("分期付款", 0.03);
    const payFee = price * fee("交易费", 0.03);
    const taxFee = price * fee("记账报税", 0.01);
    const returnFee = (costBRL - coupon) * (1 - delivery);
    const allCost = costBRL + orderFee + commission + installment + payFee + adFee + taxFee + returnFee;
    const gross = price ? ((price - allCost) / price) * 100 : 0;
    const cpa = (price - allCost) * other;
    const beRoi = cpa > 0 ? price / cpa : 0;
    const expectedProfit = cpa - (roi > 0 ? price / roi : 0);
    const margin = price ? (expectedProfit / price) * 100 : 0;
    return { costBRL, commission, installment, payFee, taxFee, returnFee, allCost, gross, beRoi, cpa, expectedProfit, margin, delivery, roi };
  }

  /* ---------------- 列定义（与你给的顺序一致） ---------------- */
  const COLS = [
    { key: "name", label: "材质", input: true, num: false, w: 110 },
    { key: "costCny", label: "成本(¥)", input: true, num: true, w: 80, note: "输入" },
    { key: "price", label: "券后售价", input: true, num: true, w: 90 },
    { key: "costBRL", label: "成本（纯成本）", fmt: fmtBRL },
    { key: "orderFee", label: "操作费订单（固定）", input: true, num: true, w: 100 },
    { key: "commission", label: "平台佣金18%", fmt: fmtBRL },
    { key: "installment", label: "分期付款3%", fmt: fmtBRL },
    { key: "payFee", label: "订单支付交易费3%", fmt: fmtBRL },
    { key: "adFee", label: "广告费", input: true, num: true, w: 80 },
    { key: "taxFee", label: "记账报税", fmt: fmtBRL },
    { key: "returnFee", label: "退货费用10%", fmt: fmtBRL },
    { key: "allCost", label: "所有费用", fmt: fmtBRL },
    { key: "delivery", label: "签收率", input: true, num: true, w: 70 },
    { key: "gross", label: "毛利率", fmt: fmtPct },
    { key: "beRoi", label: "保本roi", fmt: fmtRoi },
    { key: "cpa", label: "保本CPA（最大转化成本）", fmt: fmtBRL },
    { key: "coupon", label: "优惠劵（雷亚尔）", input: true, num: true, w: 90 },
    { key: "roi", label: "预期ROI", input: true, num: true, w: 80 },
    { key: "expectedProfit", label: "预期毛利", fmt: fmtBRL },
    { key: "margin", label: "毛利率", fmt: fmtPct }
  ];

  /* ---------------- 渲染 ---------------- */
  function renderParams() {
    $("#p-rate").value = State.params.rate;
    $("#p-orderfee").value = State.params.orderFee;
    $("#p-other").value = State.params.other;
    $("#p-bid").value = State.params.bid;
    $("#p-delivery").value = State.params.delivery;
    $("#p-roi").value = State.params.roi;
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
    $("#fee-total").textContent = ((fee("类目扣点", 0.18) + fee("分期付款", 0.03) + fee("交易费", 0.03) + fee("记账报税", 0.01)) * 100).toFixed(1) + "%";
    $$(".fee-name").forEach((el) => el.addEventListener("input", (e) => { State.fees[+e.target.dataset.i].name = e.target.value; save(); }));
    $$(".fee-val").forEach((el) => el.addEventListener("input", (e) => { State.fees[+e.target.dataset.i].value = num(e.target.value, 0); save(); renderFees(); }));
    $$(".fee-del").forEach((el) => el.addEventListener("click", (e) => { State.fees.splice(+e.target.dataset.i, 1); save(); renderFees(); renderAll(); }));
  }

  function renderHead() {
    let html = "<tr>";
    COLS.forEach((c) => {
      html += '<th' + (c.input ? ' class="col-input"' : '') + (c.w ? ' style="min-width:' + c.w + 'px"' : "") + ">" +
        c.label + (c.note ? ' <span class="col-note">' + c.note + "</span>" : "") + "</th>";
    });
    html += '<th style="min-width:36px"></th></tr>';
    $("#calc-head").innerHTML = html;
  }
  function renderBody() {
    const body = $("#calc-body");
    body.innerHTML = State.rows.map((r, i) => {
      const c = calcRow(r);
      let html = "<tr data-i='" + i + "'>";
      COLS.forEach((f) => {
        if (f.input) {
          html += '<td><input class="calc-input' + (f.num ? " num" : "") + '" data-field="' + f.key + '" ' +
            (f.num ? 'type="number" step="any"' : 'type="text"') +
            ' value="' + esc(r[f.key] == null ? "" : r[f.key]) + '"></td>';
        } else {
          const v = c[f.key];
          const warn = (f.key === "gross" || f.key === "margin") && v < 0;
          html += '<td class="calc-cell' + (warn ? " neg" : "") + '" data-calc="' + f.key + '">' + f.fmt(v) + "</td>";
        }
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
    COLS.filter((f) => !f.input).forEach((f) => {
      const cell = tr.querySelector('td[data-calc="' + f.key + '"]');
      if (cell) {
        const v = c[f.key];
        cell.textContent = f.fmt(v);
        cell.classList.toggle("neg", (f.key === "gross" || f.key === "margin") && v < 0);
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
      set("#s-gross", "-"); set("#s-margin", "-"); set("#s-roi", "-"); set("#s-cpa", "-");
      return;
    }
    const calcs = valid.map(calcRow);
    const avg = (k) => calcs.reduce((s, c) => s + (c[k] || 0), 0) / calcs.length;
    set("#s-gross", fmtPct(avg("gross")), "（售价-所有费用）÷售价");
    set("#s-margin", fmtPct(avg("margin")), "按预期ROI计算");
    set("#s-roi", fmtRoi(avg("beRoi")), "售价÷保本CPA 均值");
    set("#s-cpa", fmtBRL(avg("cpa")), "保本CPA 均值");
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
    const header = COLS.map((c) => c.label).concat(["删除"]);
    const lines = State.rows.map((r) => {
      const c = calcRow(r);
      const vals = COLS.map((f) => {
        if (f.input) return r[f.key] == null || r[f.key] === "" ? "" : r[f.key];
        const v = c[f.key];
        return typeof v === "number" ? v.toFixed(2) : v;
      });
      return vals;
    });
    const esc2 = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [header.map(esc2).join(",")].concat(lines.map((l) => l.map(esc2).join(","))).join("\r\n");
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
