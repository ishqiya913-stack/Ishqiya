begin;

-- Remove all direct and PUBLIC privileges from the client-facing roles.
revoke all on table public.coin_packages from public;
revoke all on table public.coin_packages from anon;
revoke all on table public.coin_packages from authenticated;

-- Package catalogue is read-only for clients.
grant select on table public.coin_packages to anon;
grant select on table public.coin_packages to authenticated;

commit;
