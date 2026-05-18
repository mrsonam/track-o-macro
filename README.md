# TrackOMacro

Next.js App Router PWA for natural-language meal logging, USDA-backed nutrition resolution, and calorie trends. Auth is NextAuth (credentials + JWT) with Prisma + PostgreSQL.

---

## Requirements

- **Node.js** 20.x (or current LTS)
- **PostgreSQL** — any host; the project is commonly paired with **Supabase** for managed Postgres

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env` file in the project root (never commit real secrets). Use placeholders in docs and CI as needed.

#### Required


| Variable          | Purpose                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Prisma connection string — for serverless / pooler URLs (e.g. Supabase **Transaction** or **Session pooler** on port `6543`).       |
| `DIRECT_URL`      | Direct Postgres URL for migrations (`prisma migrate`), often port `5432` / non-pooler on Supabase.                                  |
| `NEXTAUTH_SECRET` | Signing key for JWT sessions. Generate e.g. `openssl rand -base64 32`.                                                              |
| `NEXTAUTH_URL`    | Absolute origin of the app: `http://localhost:3000` in dev, `https://your-domain.com` in production (must match the URL users hit). |


#### Meal analysis (at least one resolver path)


| Variable                | Purpose                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AVOCAVO_API_KEY`       | Avocavo API for USDA-linked ingredient resolution.                                                               |
| `FATSECRET_CLIENT_ID`   | FatSecret Platform OAuth2 client id ([docs](https://platform.fatsecret.com/docs/guides)).                      |
| `FATSECRET_CLIENT_SECRET` | FatSecret Platform OAuth2 client secret ([docs](https://platform.fatsecret.com/docs/guides)).                |
| `FATSECRET_HTTP_PROXY`  | Optional static-IP HTTP proxy URL for FatSecret calls only (required on Vercel when IP restrictions are on). |
| `OPENAI_API_KEY`        | Optional: OpenAI path for parsing / resolution; behavior is gated in code when this is set.                    |


#### FatSecret IP whitelist (proxy setup)

FatSecret blocks API calls unless the **server outbound IP** is on your allow list (up to 15 IPs; changes can take **24 hours**). Your app already acts as a proxy: the PWA calls `/api/nutrition/usda-search` and `/api/meals/analyze`; only `lib/nutrition/fatsecret.ts` talks to FatSecret. **Never** put client id/secret in the browser.

**On Vercel (recommended path):** serverless egress IPs are not stable, so use a static-IP HTTP proxy:

1. Create a FatSecret Platform app and enable **IP restrictions** under API Keys.
2. Sign up for a static egress proxy (e.g. [Fixie](https://usefixie.com/), QuotaGuard Static, or similar).
3. Set the proxy URL in `.env` and Vercel. Use `FATSECRET_HTTP_PROXY`, or the provider default (`FIXIE_URL` for Fixie, `QUOTAGUARDSTATIC_URL` for QuotaGuard). Restart `npm run dev` after editing env.
4. Set `FATSECRET_CLIENT_ID` and `FATSECRET_CLIENT_SECRET` in `.env` and Vercel.
5. Discover the IP to whitelist:

   ```bash
   npm run fatsecret:egress-check
   ```

   Or, when deployed and logged in: `GET /api/internal/fatsecret-egress` (returns JSON with `outboundIp`).

6. Add that IP in FatSecret → API Keys → IP restrictions. Wait up to 24h.
7. Redeploy Vercel so production uses the proxy env vars. Test food search in the app.

**On a VPS / Fly.io / Railway with a fixed IPv4:** deploy the app there, run `npm run fatsecret:egress-check` on that host (no proxy needed), whitelist that IP, and set only the FatSecret credentials in env.

**Local dev:** either use the same `FATSECRET_HTTP_PROXY` as production, or temporarily whitelist your home IP (uses one of the 15 slots).


#### Optional tuning


| Variable                                                                 | Purpose                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `OPENAI_BASE_URL`, `OPENAI_MEAL_MODEL`                                   | Custom OpenAI-compatible endpoint / model name.                             |
| `OPENAI_TEMPERATURE`, `OPENAI_TOP_P`, `OPENAI_MAX_TOKENS`, `OPENAI_SEED` | Model parameters (defaults exist in `lib/llm/openai-compatible-client.ts`). |
| `OPENAI_RESPONSE_JSON_OBJECT`                                            | `true` / `false` — JSON response mode toggles.                              |
| `AVOCAVO_MAX_BATCH`                                                      | Cap batch size for Avocavo calls.                                           |


### 3. Database & Prisma

Generate the client and apply migrations.

```bash
npx prisma generate
```

**Local development** — create/update the DB from the migration history:

```bash
npx prisma migrate dev
```

**Production / CI** — apply existing migrations without generating new ones:

```bash
npx prisma migrate deploy
```

Migrations live in `[prisma/migrations/](prisma/migrations/)`. The schema is `[prisma/schema.prisma](prisma/schema.prisma)` (`DATABASE_URL` + `DIRECT_URL` are required there for Supabase-style pool + direct URLs).

**Supabase:** in the project dashboard → **Database** → **Connection string**, use the **pooler** (or transaction mode) string for `DATABASE_URL` and the **direct** connection for `DIRECT_URL` so migrations and introspection work reliably with Prisma.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts


| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Next.js dev server (Turbopack).        |
| `npm run build`           | Production build.                      |
| `npm run start`           | Start production server after `build`. |
| `npm run lint`            | ESLint.                                |
| `npm run prisma:generate` | `prisma generate` only.                |


---

## Deploy (e.g. Vercel)

1. Link the repository and set **all** required env vars in the hosting dashboard (same names as in `.env`).
2. Set `NEXTAUTH_URL` to the **canonical production URL** (including `https`).
3. Run `prisma migrate deploy` in CI or a release step before/after deploy so the database matches the app — e.g. Vercel **Build Command** can stay `next build` if migrations run separately, or add a dedicated migration job.
4. Ensure Postgres allows connections from the host provider’s egress IPs (Supabase: use **Connection pooling** for serverless).

---

## PWA

- Web app manifest: `[app/manifest.ts](app/manifest.ts)` (served as `/manifest.webmanifest`).
- Service worker: `[public/sw.js](public/sw.js)` (referenced from the app as needed for install/offline behavior).

---

## Request proxy (Next.js 16)

Edge interception for auth redirects lives in `[proxy.ts](proxy.ts)` (formerly `middleware.ts`). See the [Next.js “Proxy” docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) and upgrade notes for your Next.js version.

---

## Further product context

Roadmaps and epic status: `[CONTEXT.md](CONTEXT.md)`.