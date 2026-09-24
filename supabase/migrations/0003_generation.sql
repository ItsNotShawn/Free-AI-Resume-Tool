-- Resume Memory · Milestone 4: targeted generation
-- Run once in Supabase → SQL Editor → New query → paste → Run (after 0001 and 0002).
-- Safe to re-run.

-- A pasted job posting.
create table if not exists public.job_targets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  company      text check (company is null or char_length(company) <= 200),
  description  text not null check (char_length(description) between 1 and 30000),
  created_at   timestamptz not null default now()
);
create index if not exists job_targets_user_idx on public.job_targets(user_id);

-- A generated resume. `content` holds the structured draft (roles, cited
-- bullets, skills) plus the grounding-check report.
create table if not exists public.drafts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_target_id  uuid not null references public.job_targets(id) on delete cascade,
  content        jsonb not null,
  model          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists drafts_user_idx on public.drafts(user_id, created_at desc);

drop trigger if exists drafts_updated_at on public.drafts;
create trigger drafts_updated_at before update on public.drafts
  for each row execute function public.set_updated_at();

-- Which confirmed atoms each draft used ("show what was used").
create table if not exists public.draft_atoms (
  draft_id  uuid not null references public.drafts(id) on delete cascade,
  atom_id   uuid not null references public.atoms(id) on delete cascade,
  primary key (draft_id, atom_id)
);
create index if not exists draft_atoms_atom_idx on public.draft_atoms(atom_id);

-- One row per successful generation. Milestone 6 enforces the monthly quota from this.
create table if not exists public.generation_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  draft_id    uuid references public.drafts(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists generation_events_user_idx on public.generation_events(user_id, created_at);

-- ───────────────────────── row-level security ─────────────────────────
alter table public.job_targets       enable row level security;
alter table public.drafts            enable row level security;
alter table public.draft_atoms       enable row level security;
alter table public.generation_events enable row level security;

drop policy if exists "own job_targets" on public.job_targets;
create policy "own job_targets" on public.job_targets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own drafts" on public.drafts;
create policy "own drafts" on public.drafts
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.job_targets j where j.id = job_target_id and j.user_id = auth.uid())
  );

-- Links must join your own draft to your own CONFIRMED atom.
drop policy if exists "own draft_atoms" on public.draft_atoms;
create policy "own draft_atoms" on public.draft_atoms
  for all to authenticated
  using (exists (select 1 from public.drafts d where d.id = draft_id and d.user_id = auth.uid()))
  with check (
    exists (select 1 from public.drafts d where d.id = draft_id and d.user_id = auth.uid())
    and exists (select 1 from public.atoms a
                where a.id = atom_id and a.user_id = auth.uid() and a.status = 'confirmed')
  );

-- Users may read and add their own events, but not edit or delete them (quota integrity).
drop policy if exists "read own generation_events" on public.generation_events;
create policy "read own generation_events" on public.generation_events
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "insert own generation_events" on public.generation_events;
create policy "insert own generation_events" on public.generation_events
  for insert to authenticated with check (user_id = auth.uid());
