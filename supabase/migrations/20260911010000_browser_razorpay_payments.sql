create table if not exists public.browser_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.coin_packages(id),
  coins integer not null check (coins > 0),
  amount_rupees integer not null check (amount_rupees > 0),
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  status text not null default 'created' check (status in ('created','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.browser_payment_orders enable row level security;
revoke all on public.browser_payment_orders from anon, authenticated;

create index if not exists browser_payment_orders_user_idx on public.browser_payment_orders(user_id, created_at desc);

-- The server-side payment routes use the service role to read/write this table.
-- Clients never receive direct table privileges.
