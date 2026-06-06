# 截图导入：客户端直连火山 + key 仅本地 + core 拥有编排

截图导入（多模态模型识别券商/理财截图为 持仓/自选）本期只接火山引擎（豆包视觉，Ark，OpenAI 兼容）。每个端都让**客户端直接调用火山**，BYOK 的 API key **只存本地**、绝不经过任何中转 server：web 在浏览器渲染层直接 `fetch` 火山，menubar 经 IPC 把 key 交给主进程再发火山（不出本机）。这是对 web 既有 `/api/*` 代理惯例和 "No server-side user data" 约束的有意坚持——我们选择**保护 key 不外泄**而接受 web 浏览器直连可能撞上火山 CORS 的风险（真不通时再回退到代理）。

`@tidal/core` 拥有跨端一致、需要测试的那部分：提示词构造、响应解析、[[持仓反推]]、名称→代码匹配编排，并把"发请求"和 `stock-sdk` search 作为注入的 port；各端只实现传输 adapter（web 浏览器 fetch / menubar 主进程）与各自的 UI（pc Modal / mobile Sheet / menubar 弹层）。沿用 `quote-normalizer` 与 portfolio-history 的 port 模式。

## Status

accepted

## Consequences

- web 浏览器直连若被火山 CORS 拒绝，需回退到一个 Next 代理 route；core 的传输 port 抽象让这次回退局限在 web adapter 层。
- API key 既不进 `io.ts` 导出信封也不进 `MenubarExport`（见凭证边界决策），换设备时各端需各自重新配置。
