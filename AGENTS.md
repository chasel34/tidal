<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions

- Never edit CLAUDE.md directly — all instructions go in AGENTS.md
- Package manager: `pnpm`. Monorepo with app workspaces under `apps/*` and shared packages under `packages/*`:
  - `apps/web` (`@tidal/web`) — the Next.js web dashboard.
  - `apps/menubar` (`@tidal/menubar`) — the Electron menubar app (electron-vite).
  - `packages/core` (`@tidal/core`) — shared portfolio derivation, portfolio history, quote normalization, and domain types used by both apps.
- Shared dependency versions live in `pnpm-workspace.yaml` under `catalog:` (apps reference them with `"catalog:"`). App-specific deps (`next`, `electron`, etc.) stay pinned in their app.
- Shared TypeScript compiler options live in root `tsconfig.base.json`; each app's `tsconfig.json` extends it and keeps only its own overrides. Shared eslint ignore globs live in root `eslint.config.base.mjs` (`sharedIgnores`).
- Root scripts: `pnpm lint`, `pnpm test`, `pnpm build` run recursively across workspaces (`pnpm -r`). `pnpm dev` runs the web app, `pnpm dev:menubar` the menubar app, and `pnpm dist:menubar` packages the menubar app.
- Or run directly in a workspace: `pnpm -F @tidal/web <script>` / `pnpm -F @tidal/menubar <script>` / `pnpm -F @tidal/core <script>`.
- Path alias (web): `@/*` → `./src/*` (relative to `apps/web`). Menubar has its own: `@/*` → `src/renderer/src/*`, `@shared/*` → `src/shared/*`, `@main/*` → `src/main/*`.
- ESLint flat config in `apps/web/eslint.config.mjs`. Vitest configured in `apps/web/vitest.config.mts`.

# Architecture

- **Styling**: Inline `style` props via `tidalPalette()` palette object — NOT Tailwind utility classes in components. Tailwind is only imported in `globals.css` for base resets.
- **Persistence**: localStorage only (key `tidal-dashboard-v1`). No server-side user data.
- **Data**: `stock-sdk` for quotes/kline/search. Fund profiles scraped from `fund.eastmoney.com`. Server API routes use in-memory `Map` caches with TTL.
- **Shared domain logic**: `@tidal/core` owns 持仓派生, 持仓 history, and Quote 归一化. App code adapts data ports/UI-specific behavior; do not duplicate this math in `apps/web` or `apps/menubar`.
- **Locale**: Chinese-only UI (`zh-CN`). Financial color convention: red = up, green = down (红涨绿跌).
- **State**: Zustand store (`apps/web/src/store/useStore.tsx`) — `create` + `persist` middleware hydrating from localStorage (key `tidal-dashboard-v1`).
