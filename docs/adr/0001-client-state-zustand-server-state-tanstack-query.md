# 客户端状态用 Zustand，服务端数据用 TanStack Query

最初的目标是"把所有数据管理迁到 Zustand"，但盘点后发现剩余的"数据管理"几乎都是服务端异步数据（行情、kline、分时、基金净值/档案、搜索），这些是缓存/去重/失效/loading 问题，而非客户端状态问题。把它们塞进 Zustand 等于手写一个 TanStack Query。因此我们改为**职责拆分**：Zustand 只负责客户端持久状态（theme/tab/period/holdings/watch/cash/sort），TanStack Query v5 负责所有服务端数据。这正是为什么仓库里会"同时存在 Zustand 和 TanStack Query"——这是刻意的，不是没迁完。

## Considered Options

- **全部迁入 Zustand**（字面请求）：需在 store 里手写 TTL、去重、loading/error 状态机，重造轮子，否决。
- **SWR**：一度选定，更轻、无强制 provider；最终改用 TanStack Query 以获得更细的轮询/缓存控制与 devtools。
- **TanStack Query v5**（采纳）。

## Consequences

- `quotes` 是关键耦合点：被 10+ 组件和 `derivePortfolio()`（纯函数）当作 store 状态读。决定**不**把 quotes 迁进 Query 缓存，而是用一个 `useQuery(refetchInterval)` 轮询后**写回 `store.quotes`**，从而保持所有消费者和派生逻辑不动。代价是 quotes 仍"住"在 Zustand，形成 Query→store 的单向桥。
- `api-client.ts` 的四个模块级 `Map` 缓存（kline/minute/fundNav/profile）被删除，TTL 收敛到各 query 的 `staleTime`（kline 5min / minute 1min / fundNav 5min / profile `Infinity`）。
- 聚合型请求（`useDailyCloses`、`usePortfolioSeries` 在一个 fetcher 里拉多条 kline）改用 `queryClient.fetchQuery(['kline', code])`，与单条 `useKline` 共享同一份缓存。
- 全局默认保守贴近现状：`refetchOnWindowFocus: false`、`retry: 1`，避免引入原本不存在的聚焦/重连重拉。
- v5 已移除 `useQuery` 的 `onSuccess/onError`，quotes 写回 store 必须用 `useEffect(() => …, [data])`，不能用回调。
