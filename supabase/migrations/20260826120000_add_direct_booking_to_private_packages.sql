alter table public.private_lesson_packages
  add column if not exists direct_booking boolean not null default false;
