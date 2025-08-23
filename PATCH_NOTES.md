# Patch Notes

This client includes a clearer Supabase client and Explore page with better error handling.

## RLS policy patch to fix 500 on public listing
Run this in Supabase SQL to avoid recursion/cross-table issues for anonymous browsing:
```sql
drop policy if exists "quizzes_select_public_or_mine_or_collab" on public.quizzes;

create policy "quizzes_select_public_unlisted_anon"
  on public.quizzes for select to anon
  using (visibility in ('public','unlisted'));

create policy "quizzes_select_public_unlisted_auth"
  on public.quizzes for select to authenticated
  using (visibility in ('public','unlisted'));

create policy "quizzes_select_owner_or_collab_auth"
  on public.quizzes for select to authenticated
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.quiz_collaborators c
      where c.quiz_id = quizzes.id and c.user_id = auth.uid()
    )
  );

drop policy if exists "quiz_collab_select_owner_or_self" on public.quiz_collaborators;
drop policy if exists "quiz_collab_select_self" on public.quiz_collaborators;

create policy "quiz_collab_select_self_auth"
  on public.quiz_collaborators for select to authenticated
  using (quiz_collaborators.user_id = auth.uid());
```


## 2025-08-23 Fixes
- Added normalization to grading.ts (case-insensitive, trimmed, diacritic-insensitive).
