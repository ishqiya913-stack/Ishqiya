-- Host Admin controls must govern the same Host state used by Discover.
-- When an admin-created public profile exists, its display content may be used,
-- but Discover eligibility must come from the canonical host_profiles row.

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
      and hp.approval_status = 'approved'
      and hp.is_active
      and hp.is_visible
      and hp.is_discoverable

    union all

    -- Backward-compatible fallback for an admin profile whose Host row does not
    -- exist yet. Normal Host accounts are governed by host_profiles above.
    select
      ap.host_id,
      ap.display_name,
      ap.headline,
      ap.bio,
      ap.city,
      ap.age,
      ap.avatar_path
    from public.admin_profiles ap
    join public.profiles p on p.id = ap.host_id
    where ap.host_id is not null
      and p.role = 'host'
      and p.account_status = 'active'
      and ap.is_active
      and ap.is_visible
      and ap.is_discoverable
      and not exists (select 1 from public.host_profiles hp where hp.host_id = ap.host_id)
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
