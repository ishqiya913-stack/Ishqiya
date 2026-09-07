-- LiveKit minute-billing hardening delta.
-- Run after the already-applied Ishqiya product migration.
-- This migration does not drop tables or alter existing production data.

create or replace function public.ishqiya_reconcile_video(session_id uuid, as_of timestamptz, finalize boolean default false) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  session_row public.video_sessions%rowtype;
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
  if auth.role() <> 'service_role' then
    raise exception 'Video reconciliation is server-only';
  end if;

  select * into session_row
  from public.video_sessions
  where id = session_id
  for update;

  if not found
    or public.ishqiya_role(session_row.user_id) <> 'user'
    or public.ishqiya_role(session_row.host_id) <> 'host' then
    raise exception 'Invalid video session roles';
  end if;

  if session_row.status in ('ended', 'terminated', 'failed') then
    return session_row.status <> 'failed';
  end if;

  select * into user_presence
  from public.video_session_participants
  where video_session_id = session_id
    and account_id = session_row.user_id
  for update;

  select * into host_presence
  from public.video_session_participants
  where video_session_id = session_id
    and account_id = session_row.host_id
  for update;

  if user_presence.account_id is null or host_presence.account_id is null then
    if finalize then
      if session_row.livekit_finished_at is null
        or as_of < session_row.livekit_finished_at + interval '2 minutes' then
        update public.video_sessions
        set reconciliation_status = 'awaiting_participants',
            reconciliation_error = 'Terminal event received before both participant events'
        where id = session_id;
        return true;
      end if;
      update public.video_sessions
      set status = 'ended',
          ended_at = as_of,
          livekit_finished_at = as_of,
          reconciliation_status = 'failed',
          reconciliation_error = 'Both verified participants are required'
      where id = session_id;
      return false;
    end if;
    return true;
  end if;

  effective_start := greatest(user_presence.joined_at, host_presence.joined_at);
  effective_end := least(
    coalesce(user_presence.left_at, as_of),
    coalesce(host_presence.left_at, as_of),
    as_of
  );

  if effective_end <= effective_start then
    return true;
  end if;

  billable_minutes := greatest(
    0,
    ceil(extract(epoch from (effective_end - effective_start)) / 60.0)::integer
  );

  select video_rate_multiplier into multiplier
  from public.penalties
  where account_id = session_row.user_id;
  multiplier := greatest(1, coalesce(multiplier, 1));

  select host_share_percent into share
  from public.penalties
  where account_id = session_row.host_id;
  share := greatest(0, least(100, coalesce(share, 30)));

  for interval_number in 1..billable_minutes loop
    checkpoint_id := null;

    charge := session_row.rate_per_minute * multiplier;

    select balance into wallet_balance
    from public.wallets
    where user_id = session_row.user_id
    for update;

    if coalesce(wallet_balance, 0) < charge then
      update public.video_sessions
      set status = 'terminated',
          ended_at = as_of,
          duration_seconds = extract(epoch from (effective_end - effective_start))::integer,
          reconciliation_status = 'terminated_insufficient_balance',
          last_billed_at = as_of,
          reconciliation_error = 'Insufficient balance for next billing interval'
      where id = session_id;
      return false;
    end if;

    insert into public.video_billing_checkpoints (
      video_session_id,
      interval_number,
      interval_started_at,
      interval_ended_at,
      coins_charged,
      penalty_multiplier,
      host_share_percent
    ) values (
      session_id,
      interval_number,
      effective_start + ((interval_number - 1) * interval '1 minute'),
      least(effective_start + (interval_number * interval '1 minute'), effective_end),
      charge,
      multiplier,
      share
    )
    on conflict (video_session_id, interval_number) do nothing
    returning id into checkpoint_id;

    if checkpoint_id is null then
      continue;
    end if;

    perform public.ishqiya_debit_wallet(
      session_row.user_id,
      charge,
      'video_debit',
      session_id::text || ':' || interval_number::text,
      'video_billing_checkpoint',
      checkpoint_id
    );

    update public.video_billing_checkpoints
    set coins_charged = charge
    where id = checkpoint_id;

    insert into public.host_earnings (
      host_id,
      source_type,
      source_id,
      gross_coins,
      share_percent,
      earned_coins,
      billing_interval
    ) values (
      session_row.host_id,
      'video',
      session_row.id,
      charge,
      share,
      (charge * share) / 100,
      interval_number
    )
    on conflict (source_type, source_id, billing_interval) do nothing;
  end loop;

  update public.video_sessions
  set started_at = effective_start,
      livekit_started_at = effective_start,
      ended_at = case when finalize then effective_end else ended_at end,
      livekit_finished_at = case when finalize then effective_end else livekit_finished_at end,
      duration_seconds = extract(epoch from (effective_end - effective_start))::integer,
      coins_charged = (
        select coalesce(sum(coins_charged), 0)
        from public.video_billing_checkpoints
        where video_session_id = session_id
      ),
      status = case when finalize then 'ended' else 'active' end,
      last_billed_at = effective_end,
      reconciliation_status = case when finalize then 'complete' else 'active' end,
      reconciliation_error = null
  where id = session_id;

  return true;
end;
$$;

revoke all on function public.ishqiya_reconcile_video(uuid, timestamptz, boolean)
from public, authenticated, anon;
grant execute on function public.ishqiya_reconcile_video(uuid, timestamptz, boolean)
to service_role;
