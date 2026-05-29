<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions

- Never edit CLAUDE.md directly — all instructions go in AGENTS.md
- Package manager: `pnpm`. Commands: `pnpm dev`, `pnpm build`, `pnpm lint`
- Path alias: `@/*` → `./src/*`
- No tests configured. No Prettier — only ESLint (flat config, `eslint-config-next`).

# Architecture

- **Styling**: Inline `style` props via `tidalPalette()` palette object — NOT Tailwind utility classes in components. Tailwind is only imported in `globals.css` for base resets.
- **Persistence**: localStorage only (key `tidal-dashboard-v1`). No server-side user data.
- **Data**: `stock-sdk` for quotes/kline/search. Fund profiles scraped from `fund.eastmoney.com`. Server API routes use in-memory `Map` caches with TTL.
- **Locale**: Chinese-only UI (`zh-CN`). Financial color convention: red = up, green = down (红涨绿跌).
- **State**: React Context store (`useStore`) with localStorage hydration.
