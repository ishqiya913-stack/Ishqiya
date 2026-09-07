-- Ishqiya production product foundation.
-- Run after supabase_auth_part2.sql.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists account_status text not null default 'active' check (account_status in ('active','suspended','blocked'));

create table if not exists public.user_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.host_profiles (
  host_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  city text,
  age smallint check (age is null or age between 18 and 100),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  is_active boolean not null default false,
  is_visible boolean not null default false,
  is_discoverable boolean not null default false,
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.host_profiles add column if not exists display_name text;
alter table public.host_profiles add column if not exists avatar_path text;

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  host_id uuid unique references public.profiles(id) on delete cascade,
  display_name text not null,
  headline text,
  bio text,
  city text,
  age smallint check (age is null or age between 18 and 100),
  avatar_path text,
  is_active boolean not null default false,
  is_visible boolean not null default false,
  is_discoverable boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_by_admin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  admin_profile_id uuid references public.admin_profiles(id) on delete cascade,
  storage_path text not null unique,
  sort_order smallint not null default 0,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  check ((profile_id is not null) <> (admin_profile_id is not null))
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (actor_id, target_id),
  check (actor_id <> target_id)
);

create table if not exists public.passes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (actor_id, target_id),
  check (actor_id <> target_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, host_id),
  check (user_id <> host_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  coins_charged integer not null default 100 check (coins_charged = 100),
  moderation_status text not null default 'approved' check (moderation_status in ('approved','blocked','pending')),
  idempotency_key text,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists idempotency_key text;
create unique index if not exists messages_sender_idempotency_idx on public.messages(conversation_id, sender_id, idempotency_key) where idempotency_key is not null;

create table if not exists public.coin_packages (
  id uuid primary key default gen_random_uuid(),
  coins integer not null unique check (coins > 0),
  price_paise integer not null check (price_paise > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_user_id uuid not null references public.wallets(user_id) on delete cascade,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  kind text not null check (kind in ('payment_credit','message_debit','video_debit','refund','admin_adjustment')),
  idempotency_key text not null unique,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

alter table public.coin_transactions add column if not exists coins_before integer;
alter table public.coin_transactions add column if not exists status text not null default 'posted';
update public.coin_transactions set coins_before = balance_after - amount where coins_before is null;
alter table public.coin_transactions alter column coins_before set not null;
alter table public.coin_transactions drop constraint if exists coin_transactions_status_check;
alter table public.coin_transactions add constraint coin_transactions_status_check check (status in ('posted','reversed'));

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.coin_packages(id),
  coins integer not null,
  expected_amount_paise integer not null,
  upi_uri text not null,
  status text not null default 'pending' check (status in ('pending','proof_submitted','approved','rejected','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.payment_verifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  utr text not null,
  transaction_id text not null,
  screenshot_path text not null,
  status text not null default 'awaiting_review' check (status in ('awaiting_review','approved','rejected')),
  fraud_flags jsonb not null default '[]',
  screenshot_sha256 text,
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_verifications drop constraint if exists payment_verifications_status_check;
alter table public.payment_verifications add constraint payment_verifications_status_check check (status in ('awaiting_review','flagged','approved','rejected'));

create unique index if not exists payment_verifications_screenshot_idx on public.payment_verifications(screenshot_sha256) where screenshot_sha256 is not null;

create unique index if not exists payment_verifications_utr_idx on public.payment_verifications(lower(utr));
create unique index if not exists payment_verifications_transaction_idx on public.payment_verifications(lower(transaction_id));

create table if not exists public.video_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete restrict,
  room_name text not null unique,
  user_id uuid not null references public.profiles(id),
  host_id uuid not null references public.profiles(id),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  rate_per_minute integer not null default 100 check (rate_per_minute > 0),
  coins_charged integer not null default 0 check (coins_charged >= 0),
  status text not null default 'created' check (status in ('created','active','ended','terminated','failed')),
  moderation_status text not null default 'clear' check (moderation_status in ('clear','flagged','under_review','confirmed')),
  created_at timestamptz not null default now()
);

alter table public.video_sessions add column if not exists last_billed_at timestamptz;
alter table public.video_sessions add column if not exists livekit_room_sid text;
alter table public.video_sessions add column if not exists livekit_started_at timestamptz;
alter table public.video_sessions add column if not exists livekit_finished_at timestamptz;
alter table public.video_sessions add column if not exists reconciliation_status text not null default 'pending';
alter table public.video_sessions add column if not exists reconciliation_error text;
create unique index if not exists video_sessions_one_open_per_match
on public.video_sessions(match_id)
where status in ('created','active');

create table if not exists public.video_session_participants (
  video_session_id uuid not null references public.video_sessions(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete restrict,
  participant_identity text not null,
  account_role text not null check (account_role in ('user','host')),
  joined_at timestamptz not null,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (video_session_id, participant_identity),
  unique (video_session_id, account_id)
);

create table if not exists public.livekit_webhook_events (
  event_id text primary key,
  event_type text not null,
  room_name text,
  participant_identity text,
  video_session_id uuid references public.video_sessions(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  error_message text,
  payload_hash text
);

create index if not exists livekit_webhook_events_session_idx on public.livekit_webhook_events(video_session_id, received_at desc);

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

create table if not exists public.host_earnings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('video','admin_adjustment')),
  source_id uuid not null,
  gross_coins integer not null check (gross_coins >= 0),
  share_percent integer not null check (share_percent between 0 and 100),
  earned_coins integer not null check (earned_coins >= 0),
  billing_interval integer not null default 1,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, billing_interval)
);

alter table public.host_earnings add column if not exists billing_interval integer not null default 1;
alter table public.host_earnings drop constraint if exists host_earnings_source_type_source_id_key;
create unique index if not exists host_earnings_source_interval_idx on public.host_earnings(source_type, source_id, billing_interval);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  reported_id uuid not null references public.profiles(id),
  reporter_role text not null check (reporter_role in ('user','host')),
  reported_role text not null check (reported_role in ('user','host')),
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  conversation_id uuid references public.conversations(id),
  call_id uuid references public.video_sessions(id),
  violation_context jsonb not null default '{}',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id),
  account_role text not null check (account_role in ('user','host')),
  source_type text not null check (source_type in ('message','video','report')),
  source_id uuid not null,
  violation_type text not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  reason text not null,
  status text not null default 'flagged' check (status in ('flagged','confirmed','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.video_moderation_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.video_sessions(id) on delete cascade,
  detector text not null check (detector in ('speech','ocr','visual','manual')),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  reason text not null,
  evidence jsonb not null default '{}',
  status text not null default 'flagged' check (status in ('flagged','confirmed','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.profiles(id) on delete cascade,
  contact_violation_count integer not null default 0 check (contact_violation_count >= 0),
  video_rate_multiplier integer not null default 1 check (video_rate_multiplier >= 1),
  host_share_percent integer not null default 30 check (host_share_percent between 0 and 100),
  is_blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.initialize_ishqiya_account()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role = 'user' then
    insert into public.user_profiles(user_id) values (new.id) on conflict do nothing;
    insert into public.wallets(user_id) values (new.id) on conflict do nothing;
  elsif new.role = 'host' then
    insert into public.host_profiles(host_id, display_name, city) values (new.id, new.display_name, new.city) on conflict do nothing;
  end if;
  insert into public.penalties(account_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists initialize_ishqiya_account on public.profiles;
create trigger initialize_ishqiya_account after insert on public.profiles for each row execute function public.initialize_ishqiya_account();

alter table public.admin_profiles add column if not exists host_id uuid references public.profiles(id) on delete cascade;
alter table public.admin_profiles add column if not exists created_by_admin boolean not null default true;
create unique index if not exists admin_profiles_host_id_idx on public.admin_profiles(host_id) where host_id is not null;

drop function if exists public.ishqiya_discover_hosts(integer,integer);
create or replace function public.ishqiya_discover_hosts(page_size integer default 20, page_offset integer default 0)
returns table(host_id uuid, display_name text, headline text, bio text, city text, age smallint, avatar_path text)
language sql stable security definer set search_path = public
as $$
  with candidates as (
    select hp.host_id, coalesce(hp.display_name,p.display_name,'Ishqiya Host') as display_name, hp.headline, coalesce(hp.bio,p.bio) as bio, coalesce(hp.city,p.city) as city, hp.age, coalesce(hp.avatar_path,p.avatar_path) as avatar_path, 0 as priority
    from public.host_profiles hp join public.profiles p on p.id=hp.host_id
    where p.role='host' and p.account_status='active' and hp.approval_status='approved' and hp.is_active and hp.is_visible and hp.is_discoverable
    union all
    select ap.host_id, ap.display_name, ap.headline, ap.bio, ap.city, ap.age, ap.avatar_path, 1 as priority
    from public.admin_profiles ap join public.profiles p on p.id=ap.host_id
    where ap.host_id is not null and p.role='host' and p.account_status='active' and ap.is_active and ap.is_visible and ap.is_discoverable
  ), deduplicated as (
    select distinct on (host_id) host_id, display_name, headline, bio, city, age, avatar_path
    from candidates
    where exists (select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.role='user' and viewer.account_status='active')
      and not exists (select 1 from public.passes pa where pa.actor_id=auth.uid() and pa.target_id=candidates.host_id)
      and not exists (select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=candidates.host_id) or (b.blocker_id=candidates.host_id and b.blocked_id=auth.uid()))
      and not exists (select 1 from public.matches ma where ma.user_id=auth.uid() and ma.host_id=candidates.host_id)
    order by host_id, priority desc
  )
  select * from deduplicated order by display_name
  limit greatest(1, least(page_size, 50)) offset greatest(0, page_offset);
$$;

create or replace function public.ishqiya_my_matches()
returns table(match_id uuid, other_id uuid, other_role text, display_name text, headline text, bio text, avatar_path text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.id, case when m.user_id=auth.uid() then m.host_id else m.user_id end,
    case when m.user_id=auth.uid() then 'host' else 'user' end,
    p.display_name, hp.headline, coalesce(hp.bio,p.bio), coalesce(hp.avatar_path,p.avatar_path), m.created_at
  from public.matches m join public.profiles p on p.id=case when m.user_id=auth.uid() then m.host_id else m.user_id end
  left join public.host_profiles hp on hp.host_id=p.id
  where auth.uid() in (m.user_id,m.host_id)
  order by m.created_at desc;
$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

insert into public.coin_packages(coins, price_paise)
values (100,8000),(500,40000),(1000,90000),(5000,400000),(10000,800000),(50000,4000000),(100000,8000000)
on conflict (coins) do update set price_paise = excluded.price_paise;

insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false) on conflict (id) do nothing;

create or replace function public.ishqiya_role(account_id uuid) returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = account_id and account_status = 'active' $$;

create or replace function public.ishqiya_match_roles(first_id uuid, second_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select (ishqiya_role(first_id) = 'user' and ishqiya_role(second_id) = 'host') or (ishqiya_role(first_id) = 'host' and ishqiya_role(second_id) = 'user') $$;

create or replace function public.ishqiya_like(target uuid) returns uuid
language plpgsql security definer set search_path = public
as $$
declare actor uuid := auth.uid(); user_id_value uuid; host_id_value uuid; match_id_value uuid;
begin
  if actor is null or not ishqiya_match_roles(actor, target) then raise exception 'Only User and Host accounts can match'; end if;
  if exists (select 1 from public.blocks where blocker_id = actor and blocked_id = target or blocker_id = target and blocked_id = actor) then raise exception 'This account is unavailable'; end if;
  if ishqiya_role(actor) = 'user' then user_id_value := actor; host_id_value := target; else user_id_value := target; host_id_value := actor; end if;
  insert into public.likes(actor_id,target_id) values (actor,target) on conflict do nothing;
  if exists (select 1 from public.likes where actor_id = target and target_id = actor) then
    insert into public.matches(user_id,host_id) values (user_id_value,host_id_value) on conflict do nothing returning id into match_id_value;
    if match_id_value is null then select id into match_id_value from public.matches where user_id=user_id_value and host_id=host_id_value; end if;
    insert into public.conversations(match_id) values (match_id_value) on conflict do nothing;
    insert into public.notifications(user_id,kind,title,body) values (user_id_value,'match_created','A mutual connection','Your mutual connection is ready for a conversation.'), (host_id_value,'match_created','A mutual connection','Your mutual connection is ready for a conversation.');
  end if;
  return match_id_value;
end;
$$;

create or replace function public.ishqiya_update_profile(new_display_name text, new_bio text, new_city text) returns void
language plpgsql security definer set search_path = public
as $$ begin
  if auth.uid() is null or ishqiya_role(auth.uid()) <> 'user' then raise exception 'Profile authorization failed'; end if;
  update public.profiles set display_name=left(trim(new_display_name),120), bio=left(trim(new_bio),2000), city=left(trim(new_city),120), updated_at=now() where id=auth.uid();
end; $$;

drop function if exists public.ishqiya_update_host_profile(text,text,text,text,smallint,boolean,boolean,boolean);
create or replace function public.ishqiya_update_host_profile(new_display_name text, new_headline text, new_bio text, new_city text, new_age smallint) returns void
language plpgsql security definer set search_path = public
as $$ begin
  if auth.uid() is null or ishqiya_role(auth.uid()) <> 'host' then raise exception 'Host profile authorization failed'; end if;
  update public.host_profiles set display_name=left(trim(new_display_name),120), headline=left(trim(new_headline),240), bio=left(trim(new_bio),2000), city=left(trim(new_city),120), age=new_age, updated_at=now() where host_id=auth.uid();
end; $$;

create or replace function public.ishqiya_pass(target uuid) returns void
language plpgsql security definer set search_path = public
as $$ begin
  if auth.uid() is null or not ishqiya_match_roles(auth.uid(), target) then raise exception 'Only User and Host accounts can pass'; end if;
  insert into public.passes(actor_id,target_id) values (auth.uid(),target) on conflict do nothing;
end; $$;

create or replace function public.ishqiya_debit_wallet(target_user uuid, debit_amount integer, transaction_kind text, idem text, ref_type text default null, ref_id uuid default null) returns integer
language plpgsql security definer set search_path = public
as $$
declare current_balance integer; next_balance integer;
begin
  insert into public.wallets(user_id) values (target_user) on conflict do nothing;
  select balance into current_balance from public.wallets where user_id=target_user for update;
  if debit_amount <= 0 or current_balance < debit_amount then raise exception 'Insufficient coin balance'; end if;
  next_balance := current_balance - debit_amount;
  update public.wallets set balance=next_balance, updated_at=now() where user_id=target_user;
  insert into public.coin_transactions(wallet_user_id,amount,coins_before,balance_after,status,kind,idempotency_key,reference_type,reference_id) values (target_user,-debit_amount,current_balance,next_balance,'posted',transaction_kind,idem,ref_type,ref_id);
  return next_balance;
end; $$;

create or replace function public.ishqiya_credit_wallet(target_user uuid, credit_amount integer, transaction_kind text, idem text, ref_type text default null, ref_id uuid default null) returns integer
language plpgsql security definer set search_path = public
as $$
declare current_balance integer; next_balance integer;
begin
  if credit_amount <= 0 then raise exception 'Invalid credit'; end if;
  insert into public.wallets(user_id) values (target_user) on conflict do nothing;
  select balance into current_balance from public.wallets where user_id=target_user for update;
  next_balance := current_balance + credit_amount;
  update public.wallets set balance=next_balance, updated_at=now() where user_id=target_user;
  insert into public.coin_transactions(wallet_user_id,amount,coins_before,balance_after,status,kind,idempotency_key,reference_type,reference_id) values (target_user,credit_amount,current_balance,next_balance,'posted',transaction_kind,idem,ref_type,ref_id);
  return next_balance;
end; $$;

create or replace function public.ishqiya_review_payment(verification uuid, decision text, reviewer uuid, review_reason text default null) returns text
language plpgsql security definer set search_path = public
as $$
declare v public.payment_verifications%rowtype; o public.payment_orders%rowtype; before_state jsonb;
begin
  if decision not in ('approve','reject') then raise exception 'Invalid payment decision'; end if;
  select * into v from public.payment_verifications where id=verification for update;
  if not found then raise exception 'Payment verification not found'; end if;
  select * into o from public.payment_orders where id=v.order_id for update;
  if v.status not in ('awaiting_review','flagged') or o.status <> 'proof_submitted' or o.expires_at <= now() then raise exception 'Payment is no longer reviewable'; end if;
  before_state := jsonb_build_object('verification_status',v.status,'order_status',o.status,'coins',o.coins);
  if decision = 'approve' then
    perform public.ishqiya_credit_wallet(o.user_id,o.coins,'payment_credit','payment:' || o.id::text,'payment_order',o.id);
    update public.payment_verifications set status='approved', reviewer_id=reviewer, reviewed_at=now() where id=v.id;
    update public.payment_orders set status='approved' where id=o.id;
    insert into public.notifications(user_id,kind,title,body) values(o.user_id,'payment_approved','Payment approved',format('%s coins have been added to your wallet.',o.coins));
  else
    update public.payment_verifications set status='rejected', reviewer_id=reviewer, reviewed_at=now() where id=v.id;
    update public.payment_orders set status='rejected' where id=o.id;
    insert into public.notifications(user_id,kind,title,body) values(o.user_id,'payment_rejected','Payment proof rejected',coalesce(review_reason,'Your payment proof was not approved.'));
  end if;
  insert into public.audit_logs(admin_id,action,target_type,target_id,before_data,after_data,reason) values(reviewer,'payment_' || decision,'payment_verification',v.id,before_state,jsonb_build_object('verification_status',case when decision='approve' then 'approved' else 'rejected' end,'order_status',case when decision='approve' then 'approved' else 'rejected' end),review_reason);
  return case when decision='approve' then 'approved' else 'rejected' end;
end; $$;

create or replace function public.ishqiya_review_violation(violation uuid, decision text, reviewer uuid, review_reason text default null) returns text
language plpgsql security definer set search_path = public
as $$
declare v public.violations%rowtype; p public.penalties%rowtype; next_count integer; before_state jsonb;
begin
  if decision not in ('confirm','dismiss') then raise exception 'Invalid moderation decision'; end if;
  select * into v from public.violations where id=violation for update;
  if not found or v.status <> 'flagged' then raise exception 'Violation is no longer reviewable'; end if;
  select * into p from public.penalties where account_id=v.account_id for update;
  before_state := jsonb_build_object('status',v.status,'count',p.contact_violation_count,'blocked',p.is_blocked);
  if decision='confirm' then
    next_count := p.contact_violation_count + 1;
    update public.penalties set contact_violation_count=next_count, video_rate_multiplier=case when v.account_role='user' then power(2,next_count)::integer else video_rate_multiplier end, host_share_percent=case when v.account_role='host' and next_count >= 1 then 20 else host_share_percent end, is_blocked=case when v.account_role='host' and next_count >= 2 then true else is_blocked end, updated_at=now() where account_id=v.account_id;
    if v.account_role='host' and next_count >= 2 then update public.profiles set account_status='blocked' where id=v.account_id; end if;
    insert into public.notifications(user_id,kind,title,body) values(v.account_id,'moderation_warning','Account moderation update',case when v.account_role='host' and next_count >= 2 then 'Your Host account has been blocked after a confirmed violation.' else 'A contact-sharing violation was confirmed on your account.' end);
  end if;
  update public.violations set status=case when decision='confirm' then 'confirmed' else 'dismissed' end where id=v.id and status='flagged';
  insert into public.audit_logs(admin_id,action,target_type,target_id,before_data,after_data,reason) values(reviewer,'violation_' || decision,'violation',v.id,before_state,jsonb_build_object('status',case when decision='confirm' then 'confirmed' else 'dismissed' end),review_reason);
  return case when decision='confirm' then 'confirmed' else 'dismissed' end;
end; $$;

create or replace function public.ishqiya_reconcile_video(session_id uuid, as_of timestamptz, finalize boolean default false) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  s public.video_sessions%rowtype;
  user_presence public.video_session_participants%rowtype;
  host_presence public.video_session_participants%rowtype;
  effective_start timestamptz;
  effective_end timestamptz;
  billable_minutes integer;
  interval_number integer;
  multiplier integer;
  share integer;
  charge integer;
  wallet_balance integer;
  checkpoint_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Video reconciliation is server-only'; end if;
  select * into s from public.video_sessions where id=session_id for update;
  if not found or ishqiya_role(s.user_id) <> 'user' or ishqiya_role(s.host_id) <> 'host' then raise exception 'Invalid video session roles'; end if;
  if s.status in ('ended','terminated','failed') then return s.status <> 'failed'; end if;
  select * into user_presence from public.video_session_participants where video_session_id=session_id and account_id=s.user_id for update;
  select * into host_presence from public.video_session_participants where video_session_id=session_id and account_id=s.host_id for update;
  if user_presence.account_id is null or host_presence.account_id is null then
    update public.video_sessions set status='ended', ended_at=as_of, livekit_finished_at=as_of, reconciliation_status='failed', reconciliation_error='Both verified participants are required' where id=session_id;
    return false;
  end if;
  effective_start := greatest(user_presence.joined_at, host_presence.joined_at);
  effective_end := least(coalesce(user_presence.left_at, as_of), coalesce(host_presence.left_at, as_of), as_of);
  if effective_end <= effective_start then return true; end if;
  billable_minutes := greatest(0, ceil(extract(epoch from (effective_end-effective_start))/60.0)::integer);
  select video_rate_multiplier into multiplier from public.penalties where account_id=s.user_id;
  multiplier := greatest(1, coalesce(multiplier, 1));
  select host_share_percent into share from public.penalties where account_id=s.host_id;
  share := greatest(0, least(100, coalesce(share, 30)));
  for interval_number in 1..billable_minutes loop
    insert into public.video_billing_checkpoints(video_session_id,interval_number,interval_started_at,interval_ended_at,coins_charged,penalty_multiplier,host_share_percent)
    values(session_id, interval_number, effective_start + ((interval_number-1) * interval '1 minute'), least(effective_start + (interval_number * interval '1 minute'), effective_end), s.rate_per_minute * multiplier, multiplier, share)
    on conflict (video_session_id, interval_number) do nothing
    returning id into checkpoint_id;
    if checkpoint_id is null then continue; end if;
    charge := s.rate_per_minute * multiplier;
    select balance into wallet_balance from public.wallets where user_id=s.user_id for update;
    if coalesce(wallet_balance, 0) < charge then
      update public.video_sessions set status='terminated', ended_at=as_of, duration_seconds=extract(epoch from (effective_end-effective_start))::integer, reconciliation_status='terminated_insufficient_balance', last_billed_at=as_of, reconciliation_error='Insufficient balance for next billing interval' where id=session_id;
      return false;
    end if;
    perform public.ishqiya_debit_wallet(s.user_id, charge, 'video_debit', session_id::text || ':' || interval_number::text, 'video_billing_checkpoint', checkpoint_id);
    update public.video_billing_checkpoints set coins_charged=charge where id=checkpoint_id;
    insert into public.host_earnings(host_id,source_type,source_id,gross_coins,share_percent,earned_coins,billing_interval)
    values(s.host_id,'video',s.id,charge,share,(charge*share)/100,interval_number)
    on conflict (source_type,source_id,billing_interval) do nothing;
  end loop;
  update public.video_sessions set started_at=effective_start, livekit_started_at=effective_start, ended_at=case when finalize then effective_end else ended_at end, livekit_finished_at=case when finalize then effective_end else livekit_finished_at end, duration_seconds=extract(epoch from (effective_end-effective_start))::integer, coins_charged=(select coalesce(sum(coins_charged),0) from public.video_billing_checkpoints where video_session_id=session_id), status=case when finalize then 'ended' else 'active' end, last_billed_at=effective_end, reconciliation_status=case when finalize then 'complete' else 'active' end, reconciliation_error=null where id=session_id;
  return true;
end; $$;

create or replace function public.ishqiya_bill_video(session_id uuid) returns boolean
language plpgsql security definer set search_path = public
as $$ begin
  if auth.role() <> 'service_role' then raise exception 'Video billing is server-only'; end if;
  return public.ishqiya_reconcile_video(session_id, now(), false);
end; $$;

create or replace function public.ishqiya_send_message(conversation uuid, message_body text, idem text) returns public.messages
language plpgsql security definer set search_path = public
as $$
declare actor uuid := auth.uid(); result public.messages; match_record public.matches%rowtype;
begin
  if actor is null or ishqiya_role(actor) is null then raise exception 'Account is not active'; end if;
  if lower(trim(message_body)) ~ '(whats?app|telegram|snap(chat)?|call[[:space:]]*me|contact|phone|number|[0-9][^a-z0-9]*[0-9][^a-z0-9]*[0-9][^a-z0-9]*[0-9][^a-z0-9]*[0-9][^a-z0-9]*[0-9][^a-z0-9]*[0-9][^a-z0-9]*[0-9])' then raise exception 'Message blocked by moderation'; end if;
  select m.* into match_record from public.matches m join public.conversations c on c.match_id=m.id where c.id=conversation;
  if not found or actor not in (match_record.user_id, match_record.host_id) then raise exception 'Conversation authorization failed'; end if;
  select * into result from public.messages where conversation_id=conversation and sender_id=actor and idempotency_key=idem limit 1;
  if found then return result; end if;
  insert into public.messages(conversation_id,sender_id,body,moderation_status,idempotency_key) values(conversation,actor,trim(message_body),'approved',idem) returning * into result;
  if actor = match_record.user_id then
    perform public.ishqiya_debit_wallet(match_record.user_id,100,'message_debit',idem,'message',result.id);
  end if;
  update public.conversations set last_message_at=now() where id=conversation;
  insert into public.notifications(user_id,kind,title,body) values(case when actor=match_record.user_id then match_record.host_id else match_record.user_id end,'message_received','New message','You have a new Ishqiya message.');
  return result;
exception when others then raise;
end; $$;

-- RLS: clients can read only their own role-safe records. Mutations use RPCs or server admin.
alter table public.user_profiles enable row level security;
alter table public.host_profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.profile_media enable row level security;
alter table public.likes enable row level security;
alter table public.passes enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.coin_packages enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_verifications enable row level security;
alter table public.video_sessions enable row level security;
alter table public.video_session_participants enable row level security;
alter table public.livekit_webhook_events enable row level security;
alter table public.video_billing_checkpoints enable row level security;
alter table public.host_earnings enable row level security;
alter table public.reports enable row level security;
alter table public.violations enable row level security;
alter table public.video_moderation_events enable row level security;
alter table public.penalties enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists user_profiles_own on public.user_profiles;
create policy user_profiles_own on public.user_profiles for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists host_profiles_public_read on public.host_profiles;
drop policy if exists host_profiles_own_update on public.host_profiles;
drop policy if exists likes_own on public.likes;
create policy likes_own on public.likes for select to authenticated using (actor_id=auth.uid() or target_id=auth.uid());
drop policy if exists passes_own on public.passes;
create policy passes_own on public.passes for select to authenticated using (actor_id=auth.uid());
drop policy if exists matches_member on public.matches;
create policy matches_member on public.matches for select to authenticated using (user_id=auth.uid() or host_id=auth.uid());
drop policy if exists conversations_member on public.conversations;
create policy conversations_member on public.conversations for select to authenticated using (exists(select 1 from public.matches m where m.id=match_id and (m.user_id=auth.uid() or m.host_id=auth.uid())));
drop policy if exists messages_member on public.messages;
create policy messages_member on public.messages for select to authenticated using (exists(select 1 from public.conversations c join public.matches m on m.id=c.match_id where c.id=conversation_id and (m.user_id=auth.uid() or m.host_id=auth.uid())));
drop policy if exists wallet_own on public.wallets;
create policy wallet_own on public.wallets for select to authenticated using (user_id=auth.uid());
drop policy if exists ledger_own on public.coin_transactions;
create policy ledger_own on public.coin_transactions for select to authenticated using (wallet_user_id=auth.uid());
drop policy if exists packages_public on public.coin_packages;
create policy packages_public on public.coin_packages for select to authenticated using (is_active);
drop policy if exists orders_own on public.payment_orders;
create policy orders_own on public.payment_orders for select to authenticated using (user_id=auth.uid());
drop policy if exists verifications_own on public.payment_verifications;
create policy verifications_own on public.payment_verifications for select to authenticated using (user_id=auth.uid());
drop policy if exists video_member on public.video_sessions;
create policy video_member on public.video_sessions for select to authenticated using (user_id=auth.uid() or host_id=auth.uid());
drop policy if exists earnings_own on public.host_earnings;
create policy earnings_own on public.host_earnings for select to authenticated using (host_id=auth.uid());
drop policy if exists reports_own on public.reports;
create policy reports_own on public.reports for select to authenticated using (reporter_id=auth.uid());
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists blocks_own on public.blocks;
create policy blocks_own on public.blocks for all to authenticated using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

revoke all on function public.ishqiya_discover_hosts(integer,integer), public.ishqiya_my_matches(), public.ishqiya_role(uuid), public.ishqiya_match_roles(uuid,uuid), public.ishqiya_like(uuid), public.ishqiya_pass(uuid), public.ishqiya_debit_wallet(uuid,integer,text,text,text,uuid), public.ishqiya_credit_wallet(uuid,integer,text,text,text,uuid), public.ishqiya_send_message(uuid,text,text), public.ishqiya_bill_video(uuid), public.ishqiya_reconcile_video(uuid,timestamptz,boolean) from public, authenticated, anon;
revoke all on function public.ishqiya_review_payment(uuid,text,uuid,text), public.ishqiya_review_violation(uuid,text,uuid,text) from public, authenticated, anon;
revoke all on function public.initialize_ishqiya_account(), public.ishqiya_update_profile(text,text,text), public.ishqiya_update_host_profile(text,text,text,text,smallint) from public, authenticated, anon;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists host_profiles_own_update on public.host_profiles;
grant execute on function public.ishqiya_like(uuid), public.ishqiya_pass(uuid), public.ishqiya_send_message(uuid,text,text), public.ishqiya_update_profile(text,text,text), public.ishqiya_update_host_profile(text,text,text,text,smallint) to authenticated;
grant execute on function public.ishqiya_discover_hosts(integer,integer), public.ishqiya_my_matches(), public.ishqiya_like(uuid), public.ishqiya_pass(uuid), public.ishqiya_send_message(uuid,text,text) to authenticated;
grant execute on function public.ishqiya_review_payment(uuid,text,uuid,text), public.ishqiya_review_violation(uuid,text,uuid,text), public.ishqiya_debit_wallet(uuid,integer,text,text,text,uuid), public.ishqiya_credit_wallet(uuid,integer,text,text,text,uuid), public.ishqiya_bill_video(uuid), public.ishqiya_reconcile_video(uuid,timestamptz,boolean) to service_role;
