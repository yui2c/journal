-- شغّلي هذا الملف في Supabase > SQL Editor
create table if not exists public.journal_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section_id uuid not null references public.journal_sections(id) on delete cascade,
  title text not null default '',
  entry_date date not null default current_date,
  body text not null default '',
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_sections enable row level security;
alter table public.journal_entries enable row level security;

create policy "private sections" on public.journal_sections
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "private entries" on public.journal_entries
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('journal-photos','journal-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "read own journal photos" on storage.objects
for select to authenticated using (bucket_id='journal-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "upload own journal photos" on storage.objects
for insert to authenticated with check (bucket_id='journal-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create policy "delete own journal photos" on storage.objects
for delete to authenticated using (bucket_id='journal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
