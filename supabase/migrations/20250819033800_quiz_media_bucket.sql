-- Storage bucket for quiz media (public read)
insert into storage.buckets (id, name, public)
values ('quiz-media','quiz-media', true)
on conflict (id) do nothing;

-- Allow public read of objects in quiz-media
create policy if not exists "Public can read quiz-media"
  on storage.objects for select
  to public
  using (bucket_id = 'quiz-media');

-- Allow authenticated users to upload into their own folder (/<userId>/...)
create policy if not exists "Users can upload to own folder in quiz-media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quiz-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update/delete their own files
create policy if not exists "Users can manage own files in quiz-media"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'quiz-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
