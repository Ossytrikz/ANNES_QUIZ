
-- Combined attempts tables
create table if not exists public.combined_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  quiz_ids text[] not null default '{}',
  question_count int not null default 0,
  score numeric not null default 0,
  score_total numeric not null default 0
);

create table if not exists public.combined_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.combined_attempts(id) on delete cascade,
  question_id uuid not null,
  source_quiz_id uuid not null,
  is_correct boolean,
  awarded numeric not null default 0,
  possible numeric not null default 0,
  response jsonb
);

-- Enable RLS
alter table public.combined_attempts enable row level security;
alter table public.combined_attempt_items enable row level security;

-- Policies: users can manage their own attempts
create policy if not exists "ca_self_select"
  on public.combined_attempts for select
  using ( user_id = auth.uid() );

create policy if not exists "ca_self_insert"
  on public.combined_attempts for insert
  with check ( user_id = auth.uid() );

create policy if not exists "ca_self_update"
  on public.combined_attempts for update
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() );

create policy if not exists "ca_self_delete"
  on public.combined_attempts for delete
  using ( user_id = auth.uid() );

-- Items inherit access via attempt
create policy if not exists "cai_select_via_attempt"
  on public.combined_attempt_items for select
  using ( exists (select 1 from public.combined_attempts a where a.id = attempt_id and a.user_id = auth.uid()) );

create policy if not exists "cai_insert_via_attempt"
  on public.combined_attempt_items for insert
  with check ( exists (select 1 from public.combined_attempts a where a.id = attempt_id and a.user_id = auth.uid()) );

create policy if not exists "cai_update_via_attempt"
  on public.combined_attempt_items for update
  using ( exists (select 1 from public.combined_attempts a where a.id = attempt_id and a.user_id = auth.uid()) )
  with check ( exists (select 1 from public.combined_attempts a where a.id = attempt_id and a.user_id = auth.uid()) );

create policy if not exists "cai_delete_via_attempt"
  on public.combined_attempt_items for delete
  using ( exists (select 1 from public.combined_attempts a where a.id = attempt_id and a.user_id = auth.uid()) );
