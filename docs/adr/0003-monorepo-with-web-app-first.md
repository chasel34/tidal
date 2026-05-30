# Monorepo with Web app first

We are moving Tidal into a pnpm monorepo with the current Next.js application as the first app under `apps/web`. The repository root is responsible for workspace orchestration only, while Web-specific configuration stays with the Web app; we are deliberately not extracting shared packages until a second app creates real reuse pressure.
