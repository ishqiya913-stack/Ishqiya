begin;

create table if not exists public.google_play_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  purchase_token text not null unique,
  order_id text,
  package_name text not null default 'com.ishqiya.app',
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

create unique index if not exists google_play_purchases_order_uidx
  on public.google_play_purchases(order_id)
  where order_id is not null;

alter table public.google_play_purchases enable row level security;

drop policy if exists "google_play_purchases_own_select"
  on public.google_play_purchases;

create policy "google_play_purchases_own_select"
on public.google_play_purchases
for select to authenticated
using (user_id = auth.uid());

commit;
