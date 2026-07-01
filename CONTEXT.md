# Tidal domain context

## Domain vocabulary

### 持仓

An instrument the user owns locally, represented by an instrument identity plus share count and cost basis. 持仓 data is persisted in localStorage and enriched with live quote data for display.

### 自选

An instrument the user watches locally without position data. 自选 data is persisted in localStorage and enriched with live quote data for display.

### 持仓派生

Computed portfolio facts derived from 持仓, cash, quotes, and sort state. This includes enriched holding rows, portfolio summary, asset allocation, and sorted holding/watch lists.

持仓派生 is not persisted. It is recalculated from raw local facts and live Quote data so the Store does not carry stale derived state.

The shared 持仓派生 Module owns enrichment, summary, allocation, labels, and default sort policy. App-specific surfaces may pass explicit sort state, but callers should not duplicate 持仓派生 math.

### 持仓 history

The rule set for building portfolio time series from 持仓, cash, period, Quote fallback values, kline data, minute data, and 场外基金 NAV history.

The shared 持仓 history Module owns period routing, market capability checks, fund NAV fallback, quote fallback, forward fill, and labels. It depends on a small history data port so 主看板 can adapt TanStack Query and 菜单栏看板 can adapt Electron main-process market data.

### Quote

Normalized live market data used to enrich 持仓 and 自选. For 场外基金, Quote can represent either an intraday estimate or the latest settled NAV.

### Quote 归一化

The market-data rule set that turns upstream stock-sdk and fund data into normalized Quote values. Quote 归一化 owns source routing, code disambiguation, 场外基金 estimate-vs-settled-NAV selection, and the default cache policy for short-lived fund estimates.

Quote 归一化 does not expose cache metadata. Necessary upstream failures are errors: the Module throws, and app-specific Adapters may log before letting the failure surface through their transport. 场外基金 intraday estimate data is an enhancement over settled NAV; estimate failure can fall back to settled NAV when that still produces a valid Quote.

### 主看板

The full dashboard surface for reviewing and managing 持仓, 自选, portfolio summary, and instrument detail.

### 菜单栏看板

A compact, glanceable dashboard surface for 持仓, 自选, market indices, and portfolio summary. 菜单栏看板 complements 主看板 rather than replacing it.

### 价格提醒

A user-defined threshold rule for an instrument. 价格提醒 becomes relevant when live Quote data crosses the configured threshold.

### 截图导入

The flow that turns a screenshot of a broker / wealth app holdings (or watch) list into 持仓 or 自选. A multimodal model reads the instruments off the image, each recognized row is matched to a real instrument and shown in an editable 二次确认 step, and only confirmed rows are written to the Store.
_避免_: OCR 导入, 扫描导入

### 持仓反推

The rule for recovering the 份额 and 成本 a 持仓 requires from the only fields a holdings screenshot actually shows — 市值 and 持有收益 — by combining them with live Quote data at import time. The recovered 份额 is an estimate, so the dashboard's recomputed 市值 may not match the screenshot exactly.
_避免_: 换算, 折算

### AI 识别配置

The user's own multimodal-model credential set (provider, API key, base URL, model id) that powers 截图导入. BYOK and single-active-provider. 仅本地存储 on each surface and deliberately excluded from the export/import backup so the key never travels in a shareable file.
_避免_: OCR 设置, 模型配置

### 组合同步

The capability that keeps the 组合核心 in step across a user's devices through their own Google Drive 应用数据区. The user surface labels it "Google Drive 同步", but the synced unit is deliberately narrower than the word "配置" suggests: it covers only the 组合核心, not per-device preferences. AI 识别配置 is never part of 组合同步.
_避免_: 配置同步 (oversells the scope), 备份

### 组合核心

The portfolio facts worth carrying between devices: 持仓, 自选, and 现金 — and nothing else. Per-device preferences (主题, 周期, 排序偏好, 菜单栏偏好, 价格提醒) are deliberately out of scope; they are cheap to re-set on each device and stay local. The 组合核心 is the single unit 组合同步 reads and writes as a whole.
_避免_: 全量配置, 用户配置

### 同步冲突

The state where a device's local 组合核心 and the cloud copy have both changed since that device last synced, so neither can be assumed newer. 组合同步 detects this rather than silently overwriting, and resolves it as a whole-snapshot choice (keep this device's 组合核心 or take the cloud's) — never a field-by-field or item-by-item merge.
_避免_: 合并, merge
