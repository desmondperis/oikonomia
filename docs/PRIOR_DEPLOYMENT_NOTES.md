# Deploy Oikonomia on the existing Cloudflare stack

Oikonomia is intended to remain connected to the existing `budgetbridge` GitHub repository, Cloudflare Pages project, D1 database, and Google OAuth client. Do not create replacement infrastructure during a routine release.

The product is called Oikonomia; the Cloudflare project, the D1 database and the repository are still called `budgetbridge`. That is deliberate — renaming them would create new resources and leave the live household data behind.

## 1. Validate the release

From the repository root:

```bash
npm ci
npm run build
```

The build output is `public/`. The `functions/` directory is discovered by Cloudflare Pages and serves the API routes.

`npm run build` runs three things: a syntax check across every JavaScript file, the product invariants in `scripts/validate.mjs`, and the test suite. A failure in `validate.mjs` names the promise from the product vision that broke.

## 2. Cloudflare Pages build settings

Keep these Git integration settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `public` |
| Root directory | `/` |

Pull-request branches should receive preview deployments when preview builds are enabled. Do not promote a preview until the signed-out and signed-in paths have both been checked.

## 3. Preserve runtime bindings and secrets

The Pages project needs the D1 binding named `DB`. The repository’s `wrangler.toml` records the current database binding and production origin.

Configure these encrypted secrets in Production and in Preview when end-to-end preview testing is required:

| Name | Purpose |
|---|---|
| `GOOGLE_CLIENT_SECRET` | Google OAuth code exchange |
| `APP_SESSION_SECRET` | Signed login and OAuth-state cookies |
| `APP_ENCRYPTION_KEY` | Google refresh tokens and household AI-key encryption |

Configure these variables:

| Name | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `APP_URL` | Exact public origin, without a trailing slash |
| `OPENROUTER_MODEL` | An explicitly free route; defaults to `nvidia/nemotron-3-ultra-550b-a55b:free` |

Use long, independent random values for the two application secrets. Rotating `APP_SESSION_SECRET` signs everyone out. Rotating `APP_ENCRYPTION_KEY` without a migration makes existing encrypted Google and OpenRouter credentials unreadable.

There is no project-wide `OPENROUTER_API_KEY`. Each Head of Household connects a household-owned key in setup; the encrypted value is stored in that household’s Google Drive.

## 4. Google OAuth configuration

The production OAuth client must allow this exact redirect URI:

```text
https://budgetbridge.pages.dev/api/auth/google/callback
```

If a custom domain is used, add its exact HTTPS callback too and set `APP_URL` to that origin. Oikonomia requests `openid`, `email`, `profile`, and `drive.file`; do not broaden the Drive scope.

## 5. D1 schema

Apply `migrations/0001_households.sql` to a new database before first use. Existing deployments are also protected by `ensureSchema()`, which creates missing tables and adds the current `source_hash` and `report_file_id` columns, but migrations remain the auditable production record.

Example with Wrangler:

```bash
npx wrangler d1 execute budgetbridge --remote --file=migrations/0001_households.sql
```

Confirm the target database before running the command. The migration is additive and uses `IF NOT EXISTS`.

## 6. Release verification

Check the production deployment in this order:

1. `/` stays on the public landing page and all trust/legal links open.
2. `/app.html` while signed out shows an access choice and no fictional household data.
3. Google sign-in returns to `/setup.html` and an existing household is detected.
4. A Head can create a household Drive vault; a member can join with the household code.
5. Setup accepts only an OpenRouter free route and never asks for a Cloudflare AI secret.
6. Device-only manual income and expense entries survive reload and work after the app shell is cached.
7. A PDF/CSV/TSV upload shows visible stages, a reconciliation result, and a review action.
8. Removing an imported statement removes its Drive files, report, import record, and associated imported budget rows.
9. Two edited copies produce an explicit conflict choice instead of a silent merge.
10. `/api/ai` rejects GET, requires a session, and returns only a reduced-summary privacy mode on successful POST.

Keep a pre-release JSON export from a non-sensitive test household when validating upgrades. Never use a real household statement in a public preview or bug report.
