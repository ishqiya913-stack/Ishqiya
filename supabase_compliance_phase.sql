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
