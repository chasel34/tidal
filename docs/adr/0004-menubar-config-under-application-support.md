# Build the Electron menu bar dashboard

The 菜单栏看板 is a real Electron menu bar app, not a recreation of the prototype's simulated macOS desktop scene. The design prototype supplies the Calm visual language and interaction model: a compact menu bar popover with asset summary, trend chart, 持仓, 自选, 大盘, actions, footer, plus a settings window.

The app keeps its own local configuration and portfolio data under Electron's application `userData` path, which maps to the platform-standard Application Support location on macOS. This keeps the menu bar app independent from the web dashboard while preserving data across application updates, deletion, and reinstall.

Market data services run in the Electron main process. Quotes, search results, kline data, and fund profile data are exposed to the React renderer through preload IPC so `stock-sdk`, Eastmoney scraping, and TTL caches stay on the Node side while the renderer runs with `contextIsolation` enabled and without direct Node integration.

## Consequences

- The app runs as a system menu bar app with a tray item and separate settings window.
- The Electron app does not depend on a running Next.js API server for market data.
- Shared data-service logic can mirror the web app's service layer, but the transport boundary is IPC rather than HTTP.
- The menu bar app owns a small file-backed menubar config instead of using browser `localStorage` as the source of truth.
- The config reuses core portfolio field names such as `holdings`, `watch`, `cash`, `theme`, and `period`, while keeping menu-bar-only preferences such as sections, refresh cadence, display mode, and alerts in the menu bar app.
- First launch starts with empty 持仓, 自选, and cash rather than seeded demonstration assets.
- Export writes the menu bar config format.
- Import accepts the menu bar config format and the current Zustand-wrapped web store format (`{ state, version }`). Web import overwrites only core portfolio fields (`holdings`, `watch`, `cash`, `theme`, `period`) and leaves menu-bar-only preferences intact.
- Browser session data and cache should not be treated as user portfolio storage.
- The menu bar label defaults to today's portfolio change, supports icon-only and total-asset modes, and falls back to icon-only when portfolio data is empty.
- The popover keeps all prototype sections in the first version; empty sections render compact empty states unless disabled in settings.
- "打开主看板" opens `https://tidal-murex.vercel.app/` in the user's browser rather than launching an embedded dashboard window.
- The settings window supports `light`, `dark`, and `auto` appearance; `auto` resolves against the system color scheme without changing the web dashboard's theme model.
- 开机自启 is a real system login-item integration and defaults off.
- 价格提醒 uses real system notifications, triggered from live quote checks with duplicate-notification suppression.
