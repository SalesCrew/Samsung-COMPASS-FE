# Samsung COMPASS frontend

Next.js 16 / React 19 frontend for Samsung SEC reporting. The authenticated app is at `/`; administrators use `/admin`. Explicit synthetic previews are at `/preview` and `/preview/admin`.

## Local development

Use Node.js 24 and pnpm 10.33.0. Copy `.env.example` to `.env.local`, configure the SEC backend URL and Supabase public project values, then run `pnpm install --frozen-lockfile` and `pnpm dev` (port 4319).

## Vercel

Deploy this repository from its root as a Next.js project. Configure the production environment:

- `NEXT_PUBLIC_SEC_API_URL`: HTTPS Railway backend origin, without `/api`.
- `NEXT_PUBLIC_SUPABASE_URL`: existing Samsung SEC Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public publishable key only.

A Supabase service-role/secret key must never be present in this repository or the frontend environment. Allow the exact Vercel production origin in the backend's `FRONTEND_ORIGINS`. Public variables are embedded at build time; redeploy after changing them.

## Checks

`pnpm build`, `pnpm typecheck`, `pnpm lint`. Run `pnpm test` against a running app (`SEC_TEST_URL` overrides localhost for the rendered preview test). Source workbooks and employee data are not distributed with this repository.
