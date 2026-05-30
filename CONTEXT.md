# Tidal domain context

## Domain vocabulary

### 持仓

An instrument the user owns locally, represented by an instrument identity plus share count and cost basis. 持仓 data is persisted in localStorage and enriched with live quote data for display.

### 自选

An instrument the user watches locally without position data. 自选 data is persisted in localStorage and enriched with live quote data for display.

### 持仓派生

Computed portfolio facts derived from 持仓, cash, quotes, and sort state. This includes enriched holding rows, portfolio summary, asset allocation, and sorted holding/watch lists.

持仓派生 is not persisted. It is recalculated from raw local facts and live Quote data so the Store does not carry stale derived state.

### Quote

Normalized live market data used to enrich 持仓 and 自选. For 场外基金, Quote can represent either an intraday estimate or the latest settled NAV.

### 主看板

The full dashboard surface for reviewing and managing 持仓, 自选, portfolio summary, and instrument detail.

### 菜单栏看板

A compact, glanceable dashboard surface for 持仓, 自选, market indices, and portfolio summary. 菜单栏看板 complements 主看板 rather than replacing it.

### 价格提醒

A user-defined threshold rule for an instrument. 价格提醒 becomes relevant when live Quote data crosses the configured threshold.
