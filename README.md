# Free AI Resume Tool (Resume Memory)

Free career memory that builds targeted resumes from experience you've confirmed.

- **Free forever.** No accounts, paid tiers, ads, upsells, analytics or tracking.
- **Your data stays on your device.** Your career memory is one JSON file you download and keep. The site has no server.
- **Bring your own AI key.** The browser calls Anthropic directly with your key. Nothing is sent anywhere else, and the site's Content-Security-Policy blocks every other host.

Live site: https://itsnotshawn.github.io/Free-AI-Resume-Tool/

Stack: Vite · React · TypeScript · Tailwind · GitHub Pages (deployed by GitHub Actions).

## Status (branch `static-byok`)

- [x] **1. Scaffold and deploy**: static Vite app, Pages workflow, home page
- [x] **2. Memory file + guided intake**: new / open / download, autosaved working copy, versioned format; one-question-per-screen setup for contact, jobs (basics, day to day, wins, tools), education, certifications, skills, hobbies, optional sections, and how you work / what excites you
- [ ] 3. Your key + AI structuring (answers → proposed facts → confirm)
- [ ] 4. Target: job posting → cited draft + never-invent flags
- [ ] 5. Light editing + PDF download
- [ ] 6. Cleanup and docs

## Memory file format

One JSON file (`my-career-memory.json` by default) with `"format": "resume-memory"` and `"version": 1`. When the shape changes, bump `CURRENT_VERSION` in `src/lib/memory/schema.ts` and add a migration step there, so older files still open.

## Run locally

Requires Node 20.19+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to dist/
```

## One-time GitHub Pages setup

1. Repo **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.
2. Repo **Settings → Environments → github-pages → Deployment branches and tags**: add `static-byok` (only `main` is allowed by default).
3. Re-run the latest "Deploy to GitHub Pages" run under the **Actions** tab, or push a commit.

## Ground rules

- Never invent experience. AI only proposes facts ("atoms"); you confirm them. Every resume line cites the atoms it came from, and a check in the browser flags anything not found in them.
- Never send the user's key or data anywhere except `api.anthropic.com`.
