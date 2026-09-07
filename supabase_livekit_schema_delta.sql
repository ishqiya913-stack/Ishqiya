-- LiveKit schema prerequisite delta.
-- Run after the already-applied supabase_product_phase.sql and before
-- supabase_livekit_billing_delta.sql.
-- This migration does not drop tables or data. It replaces one obsolete
-- Host-earnings uniqueness constraint so future LiveKit intervals can coexist.

create extension if not exists pgcrypto;

-- Existing video_sessions rows receive the fields used by webhook and worker code.
alter table public.video_sessions add column if not exists rate_per_minute integer not null default 100;
alter table public.video_sessions add column if not exists last_billed_at timestamptz;
alter table public.video_sessions add column if not exists livekit_room_sid text;
alter table public.video_sessions add column if not exists livekit_started_at timestamptz;
alter table public.video_sessions add column if not exists livekit_finished_at timestamptz;
alter table public.video_sessions add column if not exists reconciliation_status text not null default 'pending';
alter table public.video_sessions add column if not exists reconciliation_error text;

do $$
begin
  if not exists (
    select 1
    from pg_index index_meta
    join pg_class index_class on index_class.oid = index_meta.indexrelid
    join pg_class table_class on table_class.oid = index_meta.indrelid
    join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
    where table_schema.nspname = 'public'
      and table_class.relname = 'video_sessions'
      and index_meta.indisunique
      and index_meta.indnkeyatts = 1
      and (select attribute.attname
           from pg_attribute attribute
           where attribute.attrelid = index_meta.indrelid
             and attribute.attnum = index_meta.indkey[0]) = 'match_id'
      and lower(regexp_replace(pg_get_expr(index_meta.indpred, index_meta.indrelid), '\s+', '', 'g'))
        like '%status%created%active%'
  ) then
    create unique index video_sessions_one_open_per_match
    on public.video_sessions(match_id)
    where status in ('created', 'active');
  end if;
end;
$$;

create table if not exists public.video_session_participants (
  video_session_id uuid not null references public.video_sessions(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete restrict,
  participant_identity text not null,
  account_role text not null check (account_role in ('user', 'host')),
  joined_at timestamptz not null,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (video_session_id, participant_identity),
  unique (video_session_id, account_id)
);

create index if not exists video_session_participants_account_idx
on public.video_session_participants(account_id, joined_at desc);

create table if not exists public.livekit_webhook_events (
  event_id text primary key,
  event_type text not null,
  room_name text,
  participant_identity text,
  video_session_id uuid references public.video_sessions(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  payload_hash text
);

create index if not exists livekit_webhook_events_session_idx
on public.livekit_webhook_events(video_session_id, received_at desc);

create table if not exists public.video_billing_checkpoints (
  id uuid primary key default gen_random_uuid(),
  video_session_id uuid not null references public.video_sessions(id) on delete cascade,
  interval_number integer not null check (interval_number > 0),
  interval_started_at timestamptz not null,
  interval_ended_at timestamptz not null,
  coins_charged integer not null check (coins_charged >= 0),
  penalty_multiplier integer not null check (penalty_multiplier >= 1),
  host_share_percent integer not null check (host_share_percent between 0 and 100),
  created_at timestamptz not null default now(),
  unique (video_session_id, interval_number)
);

create index if not exists video_billing_checkpoints_session_idx
on public.video_billing_checkpoints(video_session_id, interval_number);

-- Existing rows predate interval billing and represent historical aggregate
-- earnings. Interval 0 preserves that meaning without pretending they were
-- minute 1, and prevents collisions with future positive intervals.
alter table public.host_earnings add column if not exists billing_interval integer;
update public.host_earnings
set billing_interval = 0
where billing_interval is null;
alter table public.host_earnings alter column billing_interval set default 1;
alter table public.host_earnings alter column billing_interval set not null;

-- The original product schema enforced one earning row per source. Remove
-- only obsolete two-column uniqueness, regardless of its generated name.
-- No financial rows are removed or changed.
do $$
declare
  constraint_row record;
  index_row record;
begin
  for constraint_row in
    select constraint_meta.conname as constraint_name
    from pg_constraint constraint_meta
    join pg_class table_class on table_class.oid = constraint_meta.conrelid
    join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
    where table_schema.nspname = 'public'
      and table_class.relname = 'host_earnings'
      and constraint_meta.contype = 'u'
      and (
        select array_agg(attribute.attname order by key_position.ordinality)
        from unnest(constraint_meta.conkey) with ordinality as key_position(attnum, ordinality)
        join pg_attribute attribute
          on attribute.attrelid = constraint_meta.conrelid
         and attribute.attnum = key_position.attnum
      ) = array['source_type', 'source_id']::name[]
  loop
    execute format('alter table public.host_earnings drop constraint %I', constraint_row.constraint_name);
  end loop;

  for index_row in
    select index_class.relname as index_name
    from pg_index index_meta
    join pg_class index_class on index_class.oid = index_meta.indexrelid
    join pg_class table_class on table_class.oid = index_meta.indrelid
    join pg_namespace table_schema on table_schema.oid = table_class.relnamespace
    where table_schema.nspname = 'public'
      and table_class.relname = 'host_earnings'
      and index_meta.indisunique
      and index_meta.indnkeyatts = 2
      and not exists (
        select 1
        from pg_constraint constraint_meta
        where constraint_meta.conindid = index_meta.indexrelid
      )
      and (
        select array_agg(attribute.attname order by key_position.ordinality)
        from unnest(index_meta.indkey) with ordinality as key_position(attnum, ordinality)
        join pg_attribute attribute
          on attribute.attrelid = index_meta.indrelid
         and attribute.attnum = key_position.attnum
      ) = array['source_type', 'source_id']::name[]
  loop
    execute format('drop index public.%I', index_row.index_name);
  end loop;
end;
$$;

create unique index if not exists host_earnings_source_interval_idx
on public.host_earnings(source_type, source_id, billing_interval);

alter table public.video_session_participants enable row level security;
alter table public.livekit_webhook_events enable row level security;
alter table public.video_billing_checkpoints enable row level security;

revoke all on table public.video_session_participants, public.livekit_webhook_events, public.video_billing_checkpoints
from public, anon, authenticated;
grant all on table public.video_session_participants, public.livekit_webhook_events, public.video_billing_checkpoints
to service_role;
