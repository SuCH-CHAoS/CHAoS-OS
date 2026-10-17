-- CHAoS OS Supabase access policies
-- Run once in Supabase Dashboard > SQL Editor as the project owner.
-- Public visitors can only read website content and public bucket assets.
-- Only the configured CHAoS OS administrator can create or edit content/upload files.

create table if not exists public.website_content (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.website_content enable row level security;

drop policy if exists "Public can read website content" on public.website_content;
drop policy if exists "Admin can create website content" on public.website_content;
drop policy if exists "Admin can update website content" on public.website_content;

create policy "Public can read website content"
on public.website_content
for select
to anon, authenticated
using (id = 'main');

create policy "Admin can create website content"
on public.website_content
for insert
to authenticated
with check (
  id = 'main'
  and (select auth.uid()) = '661d7cb3-6cab-4769-b96f-7883e045baed'::uuid
);

create policy "Admin can update website content"
on public.website_content
for update
to authenticated
using (
  id = 'main'
  and (select auth.uid()) = '661d7cb3-6cab-4769-b96f-7883e045baed'::uuid
)
with check (
  id = 'main'
  and (select auth.uid()) = '661d7cb3-6cab-4769-b96f-7883e045baed'::uuid
);

insert into storage.buckets (id, name, public)
values ('website-assets', 'website-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Admin uploads website assets" on storage.objects;

create policy "Admin uploads website assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'website-assets'
  and (select auth.uid()) = '661d7cb3-6cab-4769-b96f-7883e045baed'::uuid
);
