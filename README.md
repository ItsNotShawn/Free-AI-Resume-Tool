# MasterResumeSite (Resume Memory)

Career memory that builds targeted resumes from confirmed experience.

Stack: Next.js (App Router, TypeScript, Tailwind) · Supabase (magic-link auth + Postgres) · Anthropic Claude · Vercel.

## Status

- [x] **M1 Skeleton**: magic-link login, protected empty dashboard, deploy-ready
- [x] **M2 Experience library**: add/edit/delete roles and facts ("atoms") by hand; confirmed-only model
- [x] **M3 AI structuring**: one ramble per role (type, paste or dictate) → Claude proposes atoms → code checks them against the note → you confirm
- [ ] M4 Generate (job posting → draft; every bullet cites atoms; invention check in code)
- [ ] M5 Edit + PDF export
- [ ] M6 Quota (15 generations / calendar month, soft block + waitlist)
- [ ] M7 Dogfood

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## One-time Supabase setup

1. Create a project at supabase.com (free tier is fine).
2. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env.local`.
3. **Authentication → Sign In / Providers → Email**: make sure Email is enabled. (Magic links use it; no password needed.)
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` for now (change to your Vercel URL after deploy).
   - Redirect URLs: exactly `http://localhost:3000/auth/confirm` (full URL, not just the path). After deploy, add `https://YOUR-APP.vercel.app/auth/confirm`. Nothing else is needed.

`NEXT_PUBLIC_SUPABASE_URL` must be the bare project URL, `https://xxxx.supabase.co`, with no `/rest/v1` and no trailing slash. A path there causes `Invalid path specified in request URL`.

Supabase's built-in email sender is rate-limited (a few emails per hour). That's fine for testing; set up custom SMTP before inviting friends.

## Database setup (once per Supabase project)

Supabase → **SQL Editor** → New query → paste the contents of
`supabase/migrations/0001_experience_library.sql` → **Run**. It's safe to run again.

This creates `roles`, `atoms` and `source_notes` with row-level security (each user sees only their own rows).
Atoms have a `status` of `proposed` or `confirmed`; only confirmed atoms (the `confirmed_atoms` view) will ever feed resume generation.
Anything typed by hand is confirmed on save, and the database rejects a hand-typed atom that isn't.

### Milestone 3 migration

Run `supabase/migrations/0002_ai_structuring.sql` the same way (after 0001). It links notes to roles and adds `evidence` / `review_note` to atoms.

## How AI structuring stays honest

1. Your note is saved first, exactly as written (`source_notes`).
2. Claude proposes atoms through a strict JSON tool call. Each one must quote the note (`evidence`).
3. `src/lib/ai/verify.ts` checks every proposal **in code**:
   - quote not found in the note → **dropped**
   - a number not in the note, an estimate turned exact, or a skill/tool not named in the note → **flagged**
   - the model's own "needs your input" questions → **flagged**
4. Proposals are stored as `status = 'proposed'`. The review screen shows flagged ones unticked with the reason.
5. Only what you tick becomes `confirmed`. Only confirmed atoms can feed resume generation.

Fair-use limit: 25 structuring runs per user per 24 hours (separate from the 15 generations/month).

## Deploy to Vercel

1. vercel.com → Add New Project → import `ItsNotShawn/MasterResumeSite`.
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL, no trailing slash), `ANTHROPIC_API_KEY`.
3. Deploy, then add the Vercel URL to Supabase's Site URL and Redirect URLs (step 4 above).

## Ground rules

- Never invent experience. From M4 on, this is enforced in server code, not only in prompts.
- Secrets live in `.env.local` / Vercel settings only. `.env*` is git-ignored.
