begin;

-- Financial/security-sensitive tables must not be writable by client roles.
revoke all on table public.wallets from anon, authenticated;
revoke all on table public.coin_transactions from anon, authenticated;
revoke all on table public.google_play_purchases from anon, authenticated;
revoke all on table public.host_earnings from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

-- Wallet balance/history can be read through RLS.
grant select on table public.wallets to authenticated;
grant select on table public.coin_transactions to authenticated;

-- Package catalogue is public/read-only.
grant select on table public.coin_packages to anon, authenticated;

commit;
