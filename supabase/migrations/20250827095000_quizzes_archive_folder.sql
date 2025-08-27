-- Add archived and folder columns to quizzes
alter table if exists public.quizzes
  add column if not exists archived boolean not null default false,
  add column if not exists folder text;

-- Useful indexes
create index if not exists quizzes_owner_id_idx on public.quizzes(owner_id);
create index if not exists quizzes_archived_idx on public.quizzes(archived);
create index if not exists quizzes_folder_idx on public.quizzes(folder);
create index if not exists quizzes_owner_archived_folder_idx on public.quizzes(owner_id, archived, folder);

-- Ensure RLS is enabled
alter table public.quizzes enable row level security;

-- Helper: drop policies if they already exist to avoid conflicts
drop policy if exists quizzes_select_policy on public.quizzes;
drop policy if exists quizzes_update_policy on public.quizzes;
drop policy if exists quizzes_delete_policy on public.quizzes;

-- SELECT policy: allow
--  - owners to see their quizzes
--  - collaborators to see quizzes they are linked to
--  - the public to see quizzes where visibility in ('public','unlisted')
create policy quizzes_select_policy on public.quizzes
  for select
  using (
    (visibility in ('public','unlisted'))
    or (auth.uid() = owner_id)
    or exists (
      select 1 from public.quiz_collaborators qc
      where qc.quiz_id = quizzes.id and qc.user_id = auth.uid()
    )
  );

-- UPDATE policy: allow owners to update, and collaborators with role in ('owner','editor') to update
create policy quizzes_update_policy on public.quizzes
  for update
  using (
    (auth.uid() = owner_id)
    or exists (
      select 1 from public.quiz_collaborators qc
      where qc.quiz_id = quizzes.id and qc.user_id = auth.uid() and qc.role in ('owner','editor')
    )
  )
  with check (
    (auth.uid() = owner_id)
    or exists (
      select 1 from public.quiz_collaborators qc
      where qc.quiz_id = quizzes.id and qc.user_id = auth.uid() and qc.role in ('owner','editor')
    )
  );

-- DELETE policy: owners only
create policy quizzes_delete_policy on public.quizzes
  for delete
  using (auth.uid() = owner_id);
