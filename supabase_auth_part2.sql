create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('user','host')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique
on public.profiles (lower(email));

create index if not exists profiles_role_idx
on public.profiles(role);

create or replace function public.prevent_ishqiya_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Ishqiya account roles are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_ishqiya_role_change on public.profiles;
create trigger prevent_ishqiya_role_change
before update on public.profiles
for each row
execute function public.prevent_ishqiya_role_change();

alter table public.profiles enable row level security;

create table if not exists public.ishqiya_signup_intents (
  token text primary key,
  email text not null,
  role text not null check (role in ('user', 'host')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz
);

alter table public.ishqiya_signup_intents enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.handle_new_ishqiya_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_intent public.ishqiya_signup_intents%rowtype;
begin
  select * into signup_intent
  from public.ishqiya_signup_intents
  where token = new.raw_user_meta_data->>'signup_intent'
    and lower(email) = lower(new.email)
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'A valid Ishqiya signup intent is required';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, lower(new.email), signup_intent.role)
  on conflict (id) do nothing;

  update public.ishqiya_signup_intents
  set consumed_at = now()
  where token = signup_intent.token;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ishqiya on auth.users;

create trigger on_auth_user_created_ishqiya
after insert on auth.users
for each row
execute function public.handle_new_ishqiya_user();

revoke all on function public.handle_new_ishqiya_user() from public;

create table if not exists public.host_verification_photos (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  photo_number smallint not null check (photo_number between 1 and 3),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (host_id, photo_number),
  unique (storage_path)
);

create index if not exists host_verification_photos_host_idx
on public.host_verification_photos(host_id);

alter table public.host_verification_photos enable row level security;

drop policy if exists "host_photos_select_own" on public.host_verification_photos;
create policy "host_photos_select_own"
on public.host_verification_photos
for select
to authenticated
using (host_id = auth.uid());

drop policy if exists "host_photos_insert_own" on public.host_verification_photos;
create policy "host_photos_insert_own"
on public.host_verification_photos
for insert
to authenticated
with check (
  host_id = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'host'
  )
);

drop policy if exists "host_photos_update_own" on public.host_verification_photos;

insert into storage.buckets (id, name, public)
values ('host-verification', 'host-verification', false)
on conflict (id) do nothing;

drop policy if exists "host_verification_upload_own" on storage.objects;
create policy "host_verification_upload_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'host-verification' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "host_verification_read_own" on storage.objects;
create policy "host_verification_read_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'host-verification' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "host_verification_update_own" on storage.objects;
create policy "host_verification_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'host-verification' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'host-verification' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "host_verification_delete_own" on storage.objects;
create policy "host_verification_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'host-verification' and (storage.foldername(name))[1] = auth.uid()::text);
