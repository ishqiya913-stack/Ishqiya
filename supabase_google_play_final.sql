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
