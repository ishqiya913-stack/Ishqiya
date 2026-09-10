begin;

-- FINAL ISHQIYA PRICING
-- Price is stored directly in RUPEES.
-- 1 coin = ₹1.

alter table public.coin_packages
  rename column price_paise to price_rupees;

alter table public.coin_packages
  drop constraint if exists coin_packages_price_rupees_check;

alter table public.coin_packages
  add constraint coin_packages_price_rupees_check
  check (price_rupees > 0);

-- Convert the existing legacy paise values to rupees.
update public.coin_packages
set price_rupees = case coins
  when 100 then 100
  when 500 then 500
  when 1000 then 1000
  when 5000 then 5000
  when 10000 then 10000
  when 50000 then 50000
  when 100000 then 100000
  else price_rupees
end;

-- Final authoritative package set.
insert into public.coin_packages (coins, price_rupees, is_active)
values
  (100, 100, true),
  (500, 500, true),
  (1000, 1000, true),
  (5000, 5000, true),
  (10000, 10000, true),
  (50000, 50000, true),
  (100000, 100000, true)
on conflict (coins)
do update set
  price_rupees = excluded.price_rupees,
  is_active = excluded.is_active;

commit;
