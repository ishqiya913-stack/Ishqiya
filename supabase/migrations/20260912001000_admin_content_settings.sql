begin;

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

insert into public.site_settings(key,value) values
 ('brand_tagline','TERE ISHQ KA JUNOON'),
 ('hero_eyebrow','A little closer to something real'),
 ('hero_title','Find someone who feels like home.'),
 ('hero_intro','Meet people who make conversation feel effortless, and let a meaningful connection unfold at its own pace.'),
 ('hero_feature_1','Enjoy 1-on-1 video chat with Hosts.'),
 ('hero_feature_2','Join as a Host & start earning.'),
 ('chat_price_coins','100'),
 ('video_price_coins_per_minute','100'),
 ('host_share_percent','20'),
 ('support_email',''),
 ('child_safety_contact',''),
 ('maintenance_mode','false')
on conflict (key) do nothing;

commit;
