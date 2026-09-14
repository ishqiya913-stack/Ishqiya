-- Default Host payout destination and automatic initial Discover visibility.
-- Existing Host rows are updated to the configured common payout account.
-- New Host rows inherit the same account and start visible/active/discoverable.

begin;

alter table public.host_profiles
  add column if not exists payout_account_number text;

alter table public.host_profiles
  alter column payout_account_number set default '2411462286';

update public.host_profiles
set payout_account_number = '2411462286'
where payout_account_number is distinct from '2411462286';

alter table public.host_profiles
  alter column is_active set default true,
  alter column is_visible set default true,
  alter column is_discoverable set default true;

-- Existing Hosts remain controlled by the Admin controls. This only makes the
-- default state for newly-created Host profiles visible/active/discoverable.

-- Discover no longer requires the separate approval flag. A Host is discoverable
-- by default after signup, while Admin can still explicitly deactivate, hide,
-- disable Discover, suspend, or block the Host later.
drop function if exists public.ishqiya_discover_hosts(integer,integer);

create or replace function public.ishqiya_discover_hosts(page_size integer default 20, page_offset integer default 0)
returns table(host_id uuid, display_name text, headline text, bio text, city text, age smallint, avatar_path text)
language sql stable security definer set search_path = public
as $$
  with candidates as (
    select
      hp.host_id,
      coalesce(ap.display_name, hp.display_name, p.display_name, 'Ishqiya Host') as display_name,
      coalesce(ap.headline, hp.headline) as headline,
      coalesce(ap.bio, hp.bio, p.bio) as bio,
      coalesce(ap.city, hp.city, p.city) as city,
      coalesce(ap.age, hp.age) as age,
      coalesce(ap.avatar_path, hp.avatar_path, p.avatar_path) as avatar_path
    from public.host_profiles hp
    join public.profiles p on p.id = hp.host_id
    left join public.admin_profiles ap on ap.host_id = hp.host_id
    where p.role = 'host'
      and p.account_status = 'active'
      and hp.is_active = true
      and hp.is_visible = true
      and hp.is_discoverable = true
  ),
  deduplicated as (
    select distinct on (host_id)
      host_id, display_name, headline, bio, city, age, avatar_path
    from candidates
    where exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.role = 'user'
        and viewer.account_status = 'active'
    )
      and not exists (
        select 1 from public.passes pa
        where pa.actor_id = auth.uid() and pa.target_id = candidates.host_id
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = candidates.host_id)
           or (b.blocker_id = candidates.host_id and b.blocked_id = auth.uid())
      )
      and not exists (
        select 1 from public.matches ma
        where ma.user_id = auth.uid() and ma.host_id = candidates.host_id
      )
    order by host_id
  )
  select * from deduplicated
  order by display_name
  limit greatest(1, least(page_size, 50)) offset greatest(0, page_offset);
$$;

commit;
