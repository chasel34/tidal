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
