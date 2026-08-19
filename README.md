# 巴西手机壳电商数据分析面板

一个**完全本地运行**的网页工具，包含四个页面：

1. **市场分析页**（`index.html`）：分析巴西 **美客多（Mercado Livre）** 与 **TikTok Shop** 两个平台上的手机壳（capa de celular / capinha）类目数据，辅助选品与市场洞察。
2. **店铺后台页**（`seller.html`）：分析**你自己的美客多店铺后台数据**（订单、销售额、成本利润、广告、流量、库存、商品表现），支持导入卖家中心导出数据。
3. **智能诊断页**（`diagnose.html`）：自动分析店铺**转化率低的卡点**（瓶颈），输出转化漏斗、卡点评分、商品卡点与行动建议。
4. **利润核价表**（`pricing.html`）：按「巴西美客多」核价表逻辑计算成本/平台费用/退货/保本CPA/预期毛利等，内置 8 个材质的真实核价参数，可编辑、可导出 CSV。

## 快速开始

1. **双击打开** `index.html`（无需安装任何东西、无需联网，Chrome / Edge 均可）。
2. 页面默认载入 640 条**仿真示例数据**（美客多 380 条 + TikTok 260 条，价格单位为巴西雷亚尔 R$）。
3. 点击右上角「📥 导入数据」，可以导入你自己的 **CSV / JSON** 真实数据，一键替换分析。
4. 各页面顶部可互相切换：市场分析 → 店铺后台 → 智能诊断 → 利润核价。

> 说明：当前内置为贴合巴西市场特征的仿真示例数据，**未**从平台抓取真实商品数据。等你拿到真实导出数据后直接导入即可。

## 功能一览

**市场分析页（index.html）**：

- **6 个核心指标卡**：商品总数、平均售价、总销量（估算）、平均评分、评论总数、价格中位数（均分平台对比）。
- **筛选**：平台、品牌、材质、最低评分、价格区间、关键词（标题/品牌/机型/店铺）。
- **18 张图表**：
  - 平台商品占比、平均售价对比、平均销量/评分
  - 价格分布、评分分布、价格带平均销量、月度上新趋势
  - 销量 Top 10、品牌 Top 10、适配机型 Top 10、卖家/店铺 Top 10
  - 价格-销量散点、材质分布、关键词 Top 15、卖家类型占比、卖家地区 Top 10、颜色 Top 10、免息分期占比
- **🏆 型号排行榜**：对适配机型按「商品数 / 总销量 / 平均销量 / 平均评分 / 平均售价」排名，展示各机型价格与销量表现。
- **平台核心指标对比表**：11 项指标逐项对比，绿色标注更优一方。
- **智能解读**：自动生成选品结论（价格带机会、材质热度、爆款集中度、头部品牌等）。
- **商品明细表**：点击表头排序、自动分页，可直接查看每条商品。
- **导出**：把当前筛选结果一键导出为 CSV。

**店铺后台页（seller.html）**：
- 核心指标：总销售额、**总利润、利润率、广告 ROAS**、订单数、平均客单价、在售 SKU 数、转化率。
- 图表：销售额趋势（30/60/90 天）、订单状态分布、品类销售额、销量 Top10、销售额 Top10、**利润 Top10、买家地区 Top10、支付方式分布、流量渠道对比、广告投放效果**、库存预警。
- 商品表现明细表：按 SKU 汇总销量、销售额、**成本、利润、利润率**、浏览量、转化率，可排序分页。
- 智能解读：日均销售额、最佳销售日、头部商品/品类、转化率、取消退货率、补货提醒。
- 数据字段：`date`、`order_id`、`sku`、`title`、`category`、`color`、`qty`、`unit_price`、`revenue`、`cost`、`profit`、`margin`、`shipping_fee`、`shipping_cost`、`coupon_discount`、`ad_spend`、`ad_impressions`、`ad_clicks`、`channel`、`payment`、`installments_count`、`status`、`views`、`stock`、`state`、`city`（兼容葡语列名）。

## 智能诊断页（diagnose.html）

- **总体诊断得分**：0-100 分 + 等级（优秀/良好/需优化/告急），并列出当前卡点。
- **转化漏斗**：商品浏览 → 下单 → 成交 → 销售额；以及广告曝光 → 点击 → 订单 → 销售额。
- **8 项卡点检查**（每项打分 + 健康/警示/卡点状态）：
  1. 整体转化率（目标 ≥ 2%）
  2. 广告点击率 CTR（目标 ≥ 1.2%）
  3. 广告 ROAS（目标 ≥ 3x）
  4. 取消 + 退货率（目标 ≤ 4%）
  5. 缺货率（目标 ≤ 5%）
  6. 广告订单占比（目标 ≤ 40%）
  7. 爆款集中度（目标 ≤ 30%）
  8. 低效商品占比（目标 ≤ 30%）
- **商品卡点表**：按「优化潜力」排序（浏览量高但转化低 = 最值得优化），给出每款商品的评级与建议。
- **行动建议清单**：按优先级汇总可执行动作。

## 利润核价表（pricing.html）

- 参数可调：汇率（默认 0.77 雷亚尔/人民币）、操作费固定、其他扣费系数 0.92、出价系数、默认签收率、默认预期 ROI、目标毛利率。
- 平台费用明细（可编辑）：类目扣点 18% + 交易费 3% + 分期付款费 3% + 公司记账报税 1%（合计 25%）。
- 计算逻辑（与「巴西美客多」核价表一致）：
  成本(纯成本) = 成本(¥) × 汇率；平台费用 = 售价 × 25%；
  退货费用 = (成本 - 优惠券) × (1 - 签收率)；所有费用 = 成本 + 操作费固定 + 平台费用 + 退货费用 + 广告费；
  保本CPA = (售价 - 所有费用) × 0.92；保本ROI = 售价 ÷ 保本CPA；预期毛利 = 保本CPA - 售价 ÷ 预期ROI；
  建议售价按「目标毛利率」反推。
- 内置 8 个材质（CYK / PFFH / 太空壳 / 四角 / 3D玻璃防窥膜 / 无尘仓防窥膜 / 无尘仓高清膜 / 磁吸壳）的核价参数，可增删行、自动保存到本机、导出 CSV。

## 数据字段

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| platform | 平台：Mercado Livre / TikTok Shop | Mercado Livre |
| title | 商品标题（葡语） | Capa de Celular iPhone 15 Silicone |
| brand | 品牌 | Apple / Samsung / Xiaomi… |
| model | 适配机型 | iPhone 15 / Galaxy A55… |
| material | 材质/款式 | Silicone / TPU / Couro… |
| price_brl | 售价（雷亚尔） | 24.9 |
| original_price_brl | 划线原价（可空） | 39.9 |
| sales | 销量（估算，ML 为已售、TT 为订单） | 1520 |
| rating | 评分 0-5 | 4.7 |
| reviews | 评论数 | 210 |
| seller | 卖家 / 店铺 | CelShop Brasil |
| listed_date | 上架日期（YYYY-MM-DD） | 2026-02-14 |
| shipping_free | 是否免邮（true/false） | true |
| color | 颜色/款式 | Preto / Transparente… |
| condition | 新旧（Novo/Usado） | Novo |
| seller_type | 卖家类型 | MercadoLíder / Loja Oficial / Vendedor |
| state / city | 卖家所在州 / 城市 | SP / São Paulo |
| installments_count / interest_free | 分期数 / 是否免息 | 12 / true |
| available_quantity | 可售库存 | 85 |

## 导入真实数据

- **CSV**：表头使用上表英文列名即可（也兼容 `price`、`vendidos`、`nota`、`loja` 等常见别名），编码建议 UTF-8。导入弹窗里有「⬇ 下载 CSV 模板」。
- **JSON**：一个对象数组，键名与上表一致；也可直接在弹窗里粘贴 JSON。
- 导入后所有图表、指标、解读会**立即基于新数据重新计算**；点「🔄 载入示例」可恢复内置示例数据。
- 建议做法：把两平台的真实数据合并到同一份文件，`platform` 列分别填 `Mercado Livre` 和 `TikTok Shop`，导入后即可做双平台对比分析。

## 文件结构

```
巴西电商数据/
├─ index.html                  # 市场分析页（双击打开）
├─ seller.html                 # 店铺后台分析页（我的美客多店铺）
├─ diagnose.html                # 智能转化诊断页（卡点分析）
├─ pricing.html                 # 利润核价表页（巴西美客多）
├─ css/style.css               # 样式
├─ js/
│  ├─ data.js                  # 市场分析内置示例数据（可整体替换）
│  ├─ seller-data.js            # 店铺后台内置示例数据
│  ├─ seller-app.js             # 店铺后台分析逻辑
│  ├─ diagnose-app.js            # 智能诊断逻辑
│  ├─ pricing-app.js             # 利润核价逻辑
│  ├─ charts.js                # 轻量 SVG 图表引擎（无外部依赖）
│  └─ app.js                   # 分析逻辑
├─ data/
│  ├─ sample-data.json         # 市场示例数据（JSON）
│  ├─ sample-data.csv          # 市场示例数据（CSV）
│  ├─ seller-sample-data.json  # 店铺示例数据（JSON）
│  └─ seller-sample-data.csv   # 店铺示例数据（CSV）
├─ scripts/
│  ├─ generate_sample_data.py  # 市场示例数据生成脚本
  └─ generate_seller_sample.py # 店铺示例数据生成脚本
├─ preview/                    # 页面预览截图
└─ README.md
```

## 重新生成示例数据（可选）

需要 Python 3，运行：

```
python scripts/generate_sample_data.py
```

生成后需重新同步 `js/data.js`（或直接把 `data/sample-data.json` 的内容整体替换进 `js/data.js` 中的 `window.SAMPLE_DATA`）。

## 提示

- 全部为纯前端实现，数据只在本机处理，不上传任何服务器。
- 销量字段为平台公开展示的“已售/订单”口径，实际分析中建议结合评论数、评分综合判断。
