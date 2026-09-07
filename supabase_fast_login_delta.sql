-- Fast Login identity delta.
-- Run after the already-applied authentication/product migrations.
-- This is additive: no tables or production data are dropped.

alter table public.profiles alter column email drop not null;

create or replace function public.handle_new_ishqiya_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_intent public.ishqiya_signup_intents%rowtype;
  profile_email text;
begin
  select * into signup_intent
  from public.ishqiya_signup_intents
  where token = new.raw_user_meta_data->>'signup_intent'
    and (
      lower(email) = lower(new.email)
      or (
        new.email is null
        and role = 'user'
        and email like 'fast-login:%@internal.ishqiya'
      )
    )
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'A valid Ishqiya signup intent is required';
  end if;

  profile_email := coalesce(lower(new.email), signup_intent.email);

  insert into public.profiles (id, email, role)
  values (new.id, profile_email, signup_intent.role)
  on conflict (id) do nothing;

  update public.ishqiya_signup_intents
  set consumed_at = now()
  where token = signup_intent.token;

  return new;
end;
$$;

revoke all on function public.handle_new_ishqiya_user() from public, anon, authenticated;
