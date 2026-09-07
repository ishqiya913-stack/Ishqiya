-- Manual UPI payment flow delta.
-- Run after the already-applied Ishqiya product migration.
-- No existing tables are dropped and no production data is deleted.

alter table public.payment_verifications add column if not exists attempt_number integer not null default 1;
alter table public.payment_verifications add column if not exists expected_amount_paise integer;
alter table public.payment_verifications add column if not exists fraud_reason text;

alter table public.payment_verifications drop constraint if exists payment_verifications_order_id_key;
create index if not exists payment_verifications_order_idx on public.payment_verifications(order_id, created_at desc);
create unique index if not exists payment_verifications_open_order_idx
on public.payment_verifications(order_id)
where status in ('awaiting_review', 'flagged');

create or replace function public.ishqiya_submit_payment_proof(
  payment_order uuid,
  submitting_user uuid,
  proof_utr text,
  proof_transaction_id text,
  proof_screenshot_path text,
  proof_screenshot_sha256 text
) returns public.payment_verifications
language plpgsql security definer set search_path = public
as $$
declare
  order_row public.payment_orders%rowtype;
  result public.payment_verifications;
  flags jsonb := '[]'::jsonb;
  next_attempt integer;
  normalized_utr text := lower(trim(proof_utr));
  normalized_transaction text := lower(trim(proof_transaction_id));
begin
  if auth.role() <> 'service_role' then
    raise exception 'Payment proof submission is server-only';
  end if;

  if normalized_utr !~ '^[a-z0-9][a-z0-9_-]{5,63}$'
    or normalized_transaction !~ '^[a-z0-9][a-z0-9_-]{5,63}$' then
    raise exception 'Invalid UTR or transaction ID';
  end if;

  select * into order_row
  from public.payment_orders
  where id = payment_order
    and user_id = submitting_user
  for update;

  if not found or order_row.status <> 'pending' or order_row.expires_at <= now() then
    raise exception 'Payment order is unavailable or expired';
  end if;

  if exists (select 1 from public.payment_verifications where lower(utr) = normalized_utr) then
    flags := flags || '"duplicate_utr"'::jsonb;
  end if;
  if exists (select 1 from public.payment_verifications where lower(transaction_id) = normalized_transaction) then
    flags := flags || '"duplicate_transaction_id"'::jsonb;
  end if;
  if proof_screenshot_sha256 is null or proof_screenshot_sha256 = '' then
    flags := flags || '"missing_screenshot_fingerprint"'::jsonb;
  elsif exists (select 1 from public.payment_verifications where screenshot_sha256 = proof_screenshot_sha256) then
    flags := flags || '"duplicate_screenshot"'::jsonb;
  end if;

  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.payment_verifications
  where order_id = payment_order;

  insert into public.payment_verifications (
    order_id,
    user_id,
    utr,
    transaction_id,
    screenshot_path,
    status,
    fraud_flags,
    fraud_reason,
    screenshot_sha256,
    expected_amount_paise,
    attempt_number
  ) values (
    payment_order,
    submitting_user,
    normalized_utr,
    normalized_transaction,
    proof_screenshot_path,
    case when flags = '[]'::jsonb then 'awaiting_review' else 'flagged' end,
    flags,
    case when flags = '[]'::jsonb then null else 'Automated duplicate or proof-integrity signal requires Admin review.' end,
    proof_screenshot_sha256,
    order_row.expected_amount_paise,
    next_attempt
  ) returning * into result;

  update public.payment_orders
  set status = 'proof_submitted'
  where id = payment_order;

  return result;
end;
$$;

revoke all on function public.ishqiya_submit_payment_proof(uuid,uuid,text,text,text,text)
from public, authenticated, anon;
grant execute on function public.ishqiya_submit_payment_proof(uuid,uuid,text,text,text,text)
to service_role;

create or replace function public.ishqiya_review_payment(verification uuid, decision text, reviewer uuid, review_reason text default null) returns text
language plpgsql security definer set search_path = public
as $$
declare
  verification_row public.payment_verifications%rowtype;
  order_row public.payment_orders%rowtype;
  before_state jsonb;
begin
  if auth.role() <> 'service_role' or decision not in ('approve', 'reject') then
    raise exception 'Invalid payment review authorization or decision';
  end if;

  select * into verification_row from public.payment_verifications where id = verification for update;
  if not found then raise exception 'Payment verification not found'; end if;
  select * into order_row from public.payment_orders where id = verification_row.order_id for update;
  if verification_row.status not in ('awaiting_review', 'flagged')
    or order_row.status <> 'proof_submitted' then
    raise exception 'Payment is no longer reviewable';
  end if;

  before_state := jsonb_build_object('verification_status', verification_row.status, 'order_status', order_row.status, 'coins', order_row.coins);
  if decision = 'approve' then
    perform public.ishqiya_credit_wallet(order_row.user_id, order_row.coins, 'payment_credit', 'payment:' || order_row.id::text, 'payment_order', order_row.id);
    update public.payment_verifications set status = 'approved', reviewer_id = reviewer, reviewed_at = now() where id = verification_row.id;
    update public.payment_orders set status = 'approved' where id = order_row.id;
    insert into public.notifications(user_id, kind, title, body) values (order_row.user_id, 'payment_approved', 'Payment approved', format('%s coins have been added to your wallet.', order_row.coins));
  else
    update public.payment_verifications set status = 'rejected', reviewer_id = reviewer, reviewed_at = now() where id = verification_row.id;
    update public.payment_orders set status = 'pending' where id = order_row.id;
    insert into public.notifications(user_id, kind, title, body) values (order_row.user_id, 'payment_rejected', 'Payment proof rejected', coalesce(review_reason, 'Your payment proof was not approved. You may submit a new proof for this order.'));
  end if;
  insert into public.audit_logs(admin_id, action, target_type, target_id, before_data, after_data, reason)
  values (reviewer, 'payment_' || decision, 'payment_verification', verification_row.id, before_state, jsonb_build_object('verification_status', case when decision = 'approve' then 'approved' else 'rejected' end, 'order_status', case when decision = 'approve' then 'approved' else 'pending' end), review_reason);
  return case when decision = 'approve' then 'approved' else 'rejected' end;
end;
$$;

revoke all on function public.ishqiya_review_payment(uuid, text, uuid, text) from public, authenticated, anon;
grant execute on function public.ishqiya_review_payment(uuid, text, uuid, text) to service_role;
