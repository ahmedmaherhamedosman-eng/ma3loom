-- Migration: create bookings, sessions, packages tables (initial)
-- Run this in your Supabase SQL editor or migration tool

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  price numeric not null,
  sessions_count int not null,
  session_duration_minutes int not null,
  features jsonb,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references packages(id) on delete set null,
  user_id uuid,
  teacher_id uuid,
  slot timestamptz,
  subject text,
  grade text,
  status text default 'pending',
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  teacher_id uuid,
  student_id uuid,
  slot timestamptz,
  duration_minutes int,
  status text default 'scheduled',
  created_at timestamptz default now()
);

-- RPC placeholder for available slots
create function if not exists get_available_slots(pkg_id uuid, from_iso text, to_iso text)
returns jsonb language sql stable as $$
  select jsonb_agg(jsonb_build_object('slot', now()::timestamptz + (i * interval '2 hour'))) from generate_series(1,8) i;
$$;
