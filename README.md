# MasterResumeSite (Resume Memory)

Career memory that builds targeted resumes from confirmed experience.

Stack: Next.js (App Router, TypeScript, Tailwind) · Supabase (magic-link auth + Postgres) · Anthropic Claude · Vercel.

## Status

- [x] **M1 Skeleton**: magic-link login, protected empty dashboard, deploy-ready
- [x] **M2 Experience library**: add/edit/delete roles and facts ("atoms") by hand; confirmed-only model
- [ ] M3 AI structuring (paste → proposed atoms → confirm)
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

## Deploy to Vercel

1. vercel.com → Add New Project → import `ItsNotShawn/MasterResumeSite`.
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL, no trailing slash).
3. Deploy, then add the Vercel URL to Supabase's Site URL and Redirect URLs (step 4 above).

## Ground rules

- Never invent experience. From M4 on, this is enforced in server code, not only in prompts.
- Secrets live in `.env.local` / Vercel settings only. `.env*` is git-ignored.
