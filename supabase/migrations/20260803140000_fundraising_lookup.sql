-- Partner lookup OTP + sessions (additive)
create table if not exists public.fundraising_lookup_otps (
  lookup_token text primary key,
  otp_hash text not null,
  otp_salt text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.fundraising_lookup_sessions (
  id text primary key,
  partner_id text not null,
  lookup_token text,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.fundraising_lookup_otps enable row level security;
alter table public.fundraising_lookup_sessions enable row level security;

grant select, insert, update, delete on table public.fundraising_lookup_otps to authenticated, service_role;
grant select, insert, update, delete on table public.fundraising_lookup_sessions to authenticated, service_role;
