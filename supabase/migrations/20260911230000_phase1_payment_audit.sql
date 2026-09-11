-- ISHQIYA PHASE 1
-- Payment separation + financial audit hardening.
-- Historical Razorpay migrations are intentionally NOT deleted:
-- migration history must remain immutable.

begin;

-- ----------------------------------------------------------
-- Payment orders: explicit provider + lifecycle metadata
-- ----------------------------------------------------------
alter table public.payment_orders
  add column if not exists payment_provider text,
  add column if not exists provider_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists admin_note text;

-- Browser orders created by the current UPI flow are UPI.
-- Existing rows remain untouched.
create index if not exists payment_orders_provider_status_idx
  on public.payment_orders(payment_provider, status);

-- Prevent duplicate provider references when supplied.
create unique index if not exists payment_orders_provider_reference_uidx
  on public.payment_orders(payment_provider, provider_reference)
  where provider_reference is not null;

-- ----------------------------------------------------------
-- Payment verification: explicit review metadata
-- ----------------------------------------------------------
alter table public.payment_verifications
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists admin_note text;

create index if not exists payment_verifications_status_created_idx
  on public.payment_verifications(status, created_at desc);

-- ----------------------------------------------------------
-- Google Play: reconciliation visibility
-- ----------------------------------------------------------
alter table public.google_play_purchases
  add column if not exists last_verified_at timestamptz,
  add column if not exists last_verification_error text;

create index if not exists google_play_purchases_state_idx
  on public.google_play_purchases(purchase_state, consumption_state);

-- ----------------------------------------------------------
-- Financial audit trail
-- ----------------------------------------------------------
create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  user_id uuid references public.profiles(id) on delete set null,
  amount_rupees numeric(14,2),
  coins integer,
  provider text,
  reference text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists financial_audit_logs_created_idx
  on public.financial_audit_logs(created_at desc);

create index if not exists financial_audit_logs_entity_idx
  on public.financial_audit_logs(entity_type, entity_id);

create index if not exists financial_audit_logs_user_idx
  on public.financial_audit_logs(user_id);

alter table public.financial_audit_logs enable row level security;

revoke all on public.financial_audit_logs from anon, authenticated;

commit;
