-- Migration: create coupons table
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null, -- 'amount' or 'percent'
  value numeric not null,
  expires_at timestamptz,
  usage_limit int default 1,
  times_used int default 0,
  active boolean default true,
  metadata jsonb,
  created_at timestamptz default now()
);
