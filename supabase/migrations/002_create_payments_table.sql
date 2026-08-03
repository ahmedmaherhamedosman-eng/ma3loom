-- Migration: create payments table
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  amount numeric not null,
  currency text not null default 'SAR',
  stripe_session_id text,
  status text default 'pending', -- pending, succeeded, failed
  coupon_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
