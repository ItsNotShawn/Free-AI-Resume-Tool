-- Resume Memory · Milestone 3: AI structuring
-- Run once in Supabase → SQL Editor → New query → paste → Run (after 0001).
-- Safe to re-run.

-- A source note (one ramble) belongs to one role.
alter table public.source_notes
  add column if not exists role_id uuid references public.roles(id) on delete cascade;
create index if not exists source_notes_role_idx on public.source_notes(role_id);

-- Proposed atoms carry the verbatim quote from the note that supports them,
-- plus an optional flag explaining what the user should double-check.
alter table public.atoms
  add column if not exists evidence text
    check (evidence is null or char_length(evidence) <= 1000);
alter table public.atoms
  add column if not exists review_note text
    check (review_note is null or char_length(review_note) <= 500);

-- A note may only point at a role you own.
drop policy if exists "own source_notes" on public.source_notes;
create policy "own source_notes" on public.source_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (role_id is null or exists (
      select 1 from public.roles r where r.id = role_id and r.user_id = auth.uid()))
  );

-- confirmed_atoms was defined with "select *" before the new columns existed;
-- recreate it so it includes them.
drop view if exists public.confirmed_atoms;
create view public.confirmed_atoms
with (security_invoker = true) as
  select * from public.atoms where status = 'confirmed';
