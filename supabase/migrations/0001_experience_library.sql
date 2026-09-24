-- Resume Memory · Milestone 2: experience library
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: it only creates things that don't exist yet.

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── source_notes ─────────────────────────
-- Raw paste / transcript that atoms were derived from. Unused by the UI until
-- milestone 3, created now so atoms can reference it from day one.
create table if not exists public.source_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 50000),
  created_at  timestamptz not null default now()
);
create index if not exists source_notes_user_idx on public.source_notes(user_id);

-- ───────────────────────── roles ─────────────────────────
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company     text not null check (char_length(company) between 1 and 200),
  title       text not null check (char_length(title) between 1 and 200),
  location    text check (location is null or char_length(location) <= 200),
  start_month date,             -- stored as the 1st of the month
  end_month   date,             -- null + is_current = present
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint roles_current_has_no_end check (not (is_current and end_month is not null)),
  constraint roles_end_after_start check (
    start_month is null or end_month is null or end_month >= start_month
  )
);
create index if not exists roles_user_idx on public.roles(user_id);

drop trigger if exists roles_updated_at on public.roles;
create trigger roles_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

-- ───────────────────────── atoms ─────────────────────────
-- One fact each. Only status = 'confirmed' atoms may ever feed generation.
-- Hand-entered atoms (origin = 'manual') are confirmed on creation; AI-proposed
-- atoms (milestone 3) start as 'proposed' and need the user to confirm them.
do $$ begin
  create type public.atom_kind as enum ('bullet', 'skill', 'tool', 'outcome');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.atom_status as enum ('proposed', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.atom_origin as enum ('manual', 'ai');
exception when duplicate_object then null; end $$;

create table if not exists public.atoms (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role_id         uuid not null references public.roles(id) on delete cascade,
  kind            public.atom_kind not null,
  text            text not null check (char_length(text) between 1 and 600),
  status          public.atom_status not null default 'proposed',
  origin          public.atom_origin not null default 'manual',
  source_note_id  uuid references public.source_notes(id) on delete set null,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- a confirmed atom always records when; a proposed one never does
  constraint atoms_confirmed_at_matches check ((status = 'confirmed') = (confirmed_at is not null)),
  -- anything typed by hand is the user's own statement, so it is confirmed
  constraint atoms_manual_is_confirmed check (origin <> 'manual' or status = 'confirmed')
);
create index if not exists atoms_role_idx on public.atoms(role_id);
create index if not exists atoms_user_status_idx on public.atoms(user_id, status);

drop trigger if exists atoms_updated_at on public.atoms;
create trigger atoms_updated_at before update on public.atoms
  for each row execute function public.set_updated_at();

-- The only thing generation (milestone 4) is allowed to read.
create or replace view public.confirmed_atoms
with (security_invoker = true) as
  select * from public.atoms where status = 'confirmed';

-- ───────────────────────── row-level security ─────────────────────────
alter table public.source_notes enable row level security;
alter table public.roles        enable row level security;
alter table public.atoms        enable row level security;

drop policy if exists "own source_notes" on public.source_notes;
create policy "own source_notes" on public.source_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own roles" on public.roles;
create policy "own roles" on public.roles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Atoms must belong to you AND hang off a role (and source note) that is yours.
drop policy if exists "own atoms" on public.atoms;
create policy "own atoms" on public.atoms
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.roles r where r.id = role_id and r.user_id = auth.uid())
    and (source_note_id is null or exists (
      select 1 from public.source_notes s where s.id = source_note_id and s.user_id = auth.uid()))
  );
