# 保留数据 hook 层（useKline / useFundProfile / usePalette / useDailyCloses）

架构审查建议删除这些 hook、让调用方直接 `useQuery(queryOptions(...))` — 看起来它们只是 query-options 上的浅层包装。实际做 deletion test 后发现四个中只有 `useFundProfile` 是真正的 shallow module；其余三个都有实质 depth，保留更合理。

## Considered Options

- **全部删除，调用方直接用 query-options**：减少文件数，但 `usePalette` 的 8+ 调用方各增 2 行样板，`useKline` 的数据变换（KlinePoint → Candle + labels + take 截断 + hasKlineMarket 检查）必须在两个调用方各写一遍。
- **全部保留**（采纳）。

## Consequences

- `usePalette`：1 行 interface 消除 8+ 处 `useStore(theme) + useMemo(tidalPalette)` 样板 — leverage 足够。
- `useKline`：做了 KlinePoint→Candle 变换 + 市场可用性检查 — interface 比 implementation 简单，有 depth。
- `useDailyCloses`：聚合多条 instrument 的 kline 请求为单个 query，共享 klineOptions 缓存 — 编排逻辑有 depth。
- `useFundProfile`：27 行，是唯一真正的 shallow module（`useQuery + null 包装`），但只有 2 个调用方，删除收益微小、不值得单独动。
