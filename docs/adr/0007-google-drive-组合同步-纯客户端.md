# Google Drive 组合同步：纯客户端、只同步组合核心、整份覆盖

[[组合同步]] 通过用户**自己的** Google Drive **应用数据区**（`drive.appdata` scope）在多设备间保持 [[组合核心]] 一致。三个决定一起记在这里，因为它们互相支撑、且都难逆转。

**一、纯客户端，无后端。** 沿用"No server-side user data"与 ADR 0005 的"绝不经过任何中转 server"立场：OAuth 与 Drive 读写全部在端上完成。web/移动网页用 Google Identity Services（GIS）token client 直接在浏览器里拿 access token；菜单栏（Electron）走 loopback + PKCE 拿正式 refresh token 存系统钥匙串。代价是浏览器端没有长期 refresh token，会周期性落到"需要重新登录"（reauth）状态——设计稿已为此画好 UI。自用 + OAuth **测试模式**下浏览器 refresh token 约 7 天过期，可接受；菜单栏不受影响。

**二、同步单元只取组合核心（持仓+自选+现金），不含偏好、不含 [[AI 识别配置]]。** UI 叫"Google Drive 同步"，但范围**刻意窄于"配置"**：主题/周期/排序/菜单栏偏好/价格提醒每台设备各自设、留在本地；API Key 延续 ADR 0005 绝不离开本机。好处是云端是一个两端都认识的固定三字段 schema，回避了"并集 schema + 跨端字段归属"的复杂度。

**三、检测 [[同步冲突]]，按整份快照二选一，不做 merge。** 本地记录"上次同步时云端的版本"（Drive `headRevisionId`）；推送前比对，若云端已变且本机也改过即为冲突，弹"用本机 / 用云端"。绝不静默覆盖，但也**不做逐项合并**——组合核心作为整体被替换。

scope 选 `drive.appdata` 是因为 Google 将其归为**非敏感**：只需基础 OAuth 验证，无安全评估、无 CASA、无年费；同步文件不出现在用户 Drive 文件列表，应用也读不到用户其它文件。

## Status

accepted

## Consequences

- web 浏览器端会周期性 reauth（测试模式下更频繁）；这是有意接受的取舍，不是缺陷。
- OAuth 只在固定线上来源生效：web 登记 Vercel 生产域名 + localhost；Vercel preview 的随机 URL 不支持同步。
- 偏好类配置（主题/周期/排序/菜单栏偏好/价格提醒）换设备需各自重设；若日后要同步，需要重开"并集 schema + 字段归属"的设计。
- 冲突按整份覆盖，极端情况下用户需主动选边，可能丢弃一侧的手输改动——以"绝不静默丢数据"换取实现简单。
- 公开分发需另走发布验证（非敏感 scope 验证较轻：隐私政策 + 主页 + 域名所有权），当前仅自用、不涉及。

## Considered Options

- **加极简 token-broker 后端**：web 也能长期免登录、体验最顺，但引入服务端用户状态，违反现有约束与 ADR 0005，未选。
- **菜单栏先行、web 延后**：token 故事最干净，但推迟了最常用的 web/移动场景，未选。
- **同步全量配置（设计稿完整清单）**：体验最完整，但带来并集 schema 与跨端字段归属复杂度，与"自用、只关心持仓"的实际诉求不匹配，未选。
- **后写胜（last-write-wins，不检测冲突）**：实现最省，但会静默盖掉另一台设备手输的持仓，未选。
