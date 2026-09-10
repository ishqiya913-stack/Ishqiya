-- ISHQIYA FINAL PRODUCTION MIGRATION
-- Compliance + Google Play Billing

-- ISHQIYA COMPLIANCE PHASE
-- Safe additive migration. Does not remove existing data/features.

begin;

-- =========================================================
-- HOST KYC / AGE / AGREEMENT / PAYOUT FIELDS
-- =========================================================

alter table public.host_profiles
  add column if not exists phone text,
  add column if not exists legal_name text,
  add column if not exists date_of_birth date,
  add column if not exists age_verified boolean not null default false,
  add column if not exists kyc_status text not null default 'pending',
  add column if not exists kyc_reference text,
  add column if not exists pan_verified boolean not null default false,
  add column if not exists payout_upi text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_holder text,
  add column if not exists payout_account_last4 text,
  add column if not exists payout_ifsc text,
  add column if not exists onboarding_status text not null default 'pending',
  add column if not exists agreement_required boolean not null default true,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid;

do $$
begin
  alter table public.host_profiles
    add constraint host_profiles_kyc_status_check
    check (kyc_status in ('pending','submitted','verified','rejected'))
    not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.host_profiles
    add constraint host_profiles_onboarding_status_check
    check (onboarding_status in ('pending','under_review','approved','rejected','blocked'))
    not valid;
exception
  when duplicate_object then null;
end $$;

-- =========================================================
-- VERSIONED HOST AGREEMENTS
-- =========================================================

create table if not exists public.host_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  content text not null,
  effective_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.host_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  agreement_version_id uuid not null references public.host_agreement_versions(id),
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  unique(host_id, agreement_version_id)
);

-- =========================================================
-- DEFAULT DIGITAL HOST AGREEMENT
-- =========================================================

insert into public.host_agreement_versions
  (version, title, content, active)
values
  (
    '1.0',
    'Ishqiya Host Partner Agreement',
    'ISHQIYA HOST PARTNER AGREEMENT

By registering as a Host on Ishqiya, I confirm that:

1. I am 18 years of age or older and the personal information submitted by me is true and belongs to me.
2. I agree to complete the required identity/KYC verification and provide valid payout information.
3. The three photographs submitted during registration are my real photographs and are not AI-generated, impersonating, misleading, heavily manipulated, or belonging to another person.
4. Ishqiya may review submitted information, photographs, chats, calls, reports, and moderation signals for safety, fraud prevention, policy enforcement, and legal compliance.
5. I will not share or request personal contact information, payment credentials, or off-platform contact details through Ishqiya where prohibited by platform rules.
6. I will follow Ishqiya Community Guidelines and all applicable laws.
7. Ishqiya may suspend, block, reject, or terminate my Host account for fraud, impersonation, unsafe behaviour, prohibited content, repeated violations, or false information.
8. Host earnings are calculated according to the applicable Ishqiya Host earning policy shown in the platform. The standard Host share for eligible new earnings is 20%, subject to applicable deductions, adjustments, penalties, refunds, fraud reviews, and policy enforcement.
9. Withdrawals are subject to Admin review, available balance, verification, payout information, fraud checks, and the applicable withdrawal policy.
10. I understand that accepting this agreement creates a digital record of my acceptance. The accepted agreement version, acceptance timestamp, and relevant technical audit information may be retained for compliance and dispute-resolution purposes.
11. I have read and understood the Privacy Policy, Terms of Service, Community Guidelines, and Host Safety Rules.

I, [FULL LEGAL NAME], confirm that all the details provided by me are true, complete and filled by me with my consent. I have read and understood the Ishqiya Host Partner Agreement and I accept it. I understand that if I violate any Ishqiya policy, guideline, safety rule or applicable law, Ishqiya has the sole right to suspend or stop my earnings, block my account, and remove me from the platform, subject to applicable law and the platform''s review and appeal process.',
    true
  )
on conflict (version) do update
set title = excluded.title,
    content = excluded.content,
    active = excluded.active;

-- =========================================================
-- HOST WITHDRAWALS
-- =========================================================

create table if not exists public.host_withdrawals (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','processing','paid','rejected','cancelled')),
  payout_method text not null default 'bank_or_upi'
    check (payout_method in ('bank_or_upi')),
  payout_reference text,
  admin_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  paid_at timestamptz
);

create index if not exists host_withdrawals_host_idx
  on public.host_withdrawals(host_id);

create index if not exists host_withdrawals_status_idx
  on public.host_withdrawals(status);

-- =========================================================
-- COMPLIANCE TABLE SECURITY
-- =========================================================

alter table public.host_agreement_versions enable row level security;
alter table public.host_agreement_acceptances enable row level security;
alter table public.host_withdrawals enable row level security;

drop policy if exists "host_agreement_versions_select_active" on public.host_agreement_versions;
create policy "host_agreement_versions_select_active"
on public.host_agreement_versions
for select
to authenticated
using (active = true);

drop policy if exists "host_agreement_acceptances_select_own" on public.host_agreement_acceptances;
create policy "host_agreement_acceptances_select_own"
on public.host_agreement_acceptances
for select
to authenticated
using (host_id = auth.uid());

drop policy if exists "host_withdrawals_select_own" on public.host_withdrawals;
create policy "host_withdrawals_select_own"
on public.host_withdrawals
for select
to authenticated
using (host_id = auth.uid());

create table if not exists public.host_withdrawals (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','processing','paid','rejected','cancelled')),
  payout_method text not null default 'bank_or_upi'
    check (payout_method in ('bank_or_upi')),
  payout_reference text,
  admin_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  paid_at timestamptz
);

create index if not exists host_withdrawals_host_idx
  on public.host_withdrawals(host_id);

create index if not exists host_withdrawals_status_idx
  on public.host_withdrawals(status);

-- =========================================================
-- 18+ USER AGE VERIFICATION
-- =========================================================

alter table public.user_profiles
  add column if not exists date_of_birth date,
  add column if not exists age_verified boolean not null default false,
  add column if not exists age_verified_at timestamptz;

-- =========================================================
-- PAYMENT PROVIDER PREPARATION
-- =========================================================

alter table public.payment_orders
  add column if not exists payment_provider text,
  add column if not exists provider_transaction_id text,
  add column if not exists provider_product_id text,
  add column if not exists verification_status text default 'pending';

create unique index if not exists payment_orders_provider_transaction_uidx
  on public.payment_orders(payment_provider, provider_transaction_id)
  where provider_transaction_id is not null;

-- =========================================================
-- HOST EARNING STANDARD
-- =========================================================

-- Existing earning rows remain untouched.
-- New/normal Host earning share is 20%.
-- Existing rows are NOT rewritten.
alter table public.host_earnings
  alter column share_percent set default 20;

commit;

begin;

create table if not exists public.google_play_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  purchase_token text not null unique,
  order_id text,
  package_name text not null,
  purchase_state text not null default 'pending'
    check (purchase_state in ('pending','purchased','canceled','refunded','revoked','error')),
  consumption_state text,
  purchase_time timestamptz,
  processed_at timestamptz,
  consumed_at timestamptz,
  coins_credited integer not null default 0,
  verification_error text,
  raw_purchase jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_play_purchases_user_idx
  on public.google_play_purchases(user_id);

create index if not exists google_play_purchases_product_idx
  on public.google_play_purchases(product_id);

alter table public.google_play_purchases enable row level security;

drop policy if exists "google_play_purchases_own_select"
  on public.google_play_purchases;

create policy "google_play_purchases_own_select"
on public.google_play_purchases
for select to authenticated
using (user_id = auth.uid());

create or replace function public.ishqiya_process_google_play_purchase(
  p_user_id uuid,
  p_product_id text,
  p_purchase_token text,
  p_order_id text,
  p_package_name text,
  p_purchase_time timestamptz,
  p_raw_purchase jsonb,
  p_coins integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.google_play_purchases%rowtype;
  resulting_balance integer;
begin
  if p_coins <= 0 then
    raise exception 'Invalid coin amount';
  end if;

  select *
  into existing
  from public.google_play_purchases
  where purchase_token = p_purchase_token
  for update;

  if found then
    if existing.user_id <> p_user_id then
      raise exception 'Purchase token already belongs to another account';
    end if;

    if existing.coins_credited > 0 then
      return (
        select balance
        from public.wallets
        where user_id = p_user_id
      );
    end if;
  else
    insert into public.google_play_purchases (
      user_id,
      product_id,
      purchase_token,
      order_id,
      package_name,
      purchase_state,
      purchase_time,
      raw_purchase
    )
    values (
      p_user_id,
      p_product_id,
      p_purchase_token,
      p_order_id,
      p_package_name,
      'purchased',
      p_purchase_time,
      p_raw_purchase
    );
  end if;

  resulting_balance := public.ishqiya_credit_wallet(
    p_user_id,
    p_coins,
    'google_play_purchase',
    'google-play:' || p_purchase_token,
    'google_play',
    null
  );

  update public.google_play_purchases
  set
    purchase_state = 'purchased',
    coins_credited = p_coins,
    processed_at = now(),
    updated_at = now(),
    raw_purchase = p_raw_purchase
  where purchase_token = p_purchase_token;

  return resulting_balance;
end;
$$;

revoke all on function public.ishqiya_process_google_play_purchase(
  uuid,text,text,text,text,timestamptz,jsonb,integer
) from public, anon;

grant execute on function public.ishqiya_process_google_play_purchase(
  uuid,text,text,text,text,timestamptz,jsonb,integer
) to service_role;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id),
  notes text
);

create index if not exists account_deletion_requests_email_idx
  on public.account_deletion_requests(lower(email));

alter table public.account_deletion_requests enable row level security;

revoke all on table public.account_deletion_requests from anon, authenticated;

commit;
