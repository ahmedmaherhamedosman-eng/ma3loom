-- Teacher applications and public teachers profiles
create table if not exists public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'accepted', 'rejected', 'needs_changes')),
  full_name text not null,
  email text not null,
  phone text not null,
  country text not null,
  city text not null,
  education_level text not null,
  university text not null,
  graduation_year integer,
  specialization text not null,
  teaching_subject text not null,
  grade_levels text[] not null default '{}',
  years_experience integer not null default 0,
  bio_short text,
  bio_full text,
  profile_image_url text,
  resume_url text,
  certificates_urls text[] not null default '{}',
  intro_video_url text,
  social_links jsonb not null default '{}'::jsonb,
  linkedin_url text,
  youtube_url text,
  availability text,
  teaching_type text not null default 'both' check (teaching_type in ('live', 'recorded', 'both')),
  terms_accepted boolean not null default false,
  review_notes text,
  decision_reason text,
  is_home_visible boolean not null default false,
  display_order integer not null default 1000,
  badge text check (badge in ('معلم متميز', 'الأكثر طلباً', 'خبير معتمد') or badge is null),
  students_count integer not null default 0,
  courses_count integer not null default 0,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  instructor_user_id uuid,
  approved_by uuid,
  approved_at timestamptz
);

create table if not exists public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_application_id uuid not null references public.teacher_applications(id) on delete cascade,
  student_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.teacher_applications enable row level security;
alter table public.teacher_reviews enable row level security;
alter table public.user_notifications enable row level security;

-- Public can submit applications.
drop policy if exists "Public can insert teacher applications" on public.teacher_applications;
create policy "Public can insert teacher applications"
on public.teacher_applications
for insert
with check (true);

-- Public can only read accepted teacher profiles.
drop policy if exists "Public can read accepted teacher profiles" on public.teacher_applications;
create policy "Public can read accepted teacher profiles"
on public.teacher_applications
for select
using (status = 'accepted');

-- Admin full access.
drop policy if exists "Admins manage teacher applications" on public.teacher_applications;
create policy "Admins manage teacher applications"
on public.teacher_applications
for all
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Reviews
-- Public can read published reviews.
drop policy if exists "Public can read teacher reviews" on public.teacher_reviews;
create policy "Public can read teacher reviews"
on public.teacher_reviews
for select
using (is_published = true);

-- Authenticated users can submit reviews.
drop policy if exists "Authenticated users can insert teacher reviews" on public.teacher_reviews;
create policy "Authenticated users can insert teacher reviews"
on public.teacher_reviews
for insert
to authenticated
with check (true);

-- Admins can manage all reviews.
drop policy if exists "Admins manage teacher reviews" on public.teacher_reviews;
create policy "Admins manage teacher reviews"
on public.teacher_reviews
for all
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- User notifications.
drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications"
on public.user_notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.user_notifications;
create policy "Users update own notifications"
on public.user_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins manage notifications" on public.user_notifications;
create policy "Admins manage notifications"
on public.user_notifications
for all
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Buckets for teacher files.
insert into storage.buckets (id, name, public)
values ('teacher-applications', 'teacher-applications', true)
on conflict (id) do nothing;

-- Public upload/read policy for teacher application files.
drop policy if exists "Public upload teacher application files" on storage.objects;
create policy "Public upload teacher application files"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'teacher-applications');

drop policy if exists "Public read teacher application files" on storage.objects;
create policy "Public read teacher application files"
on storage.objects
for select
using (bucket_id = 'teacher-applications');

-- Keep updated_at in sync.
create or replace function public.set_teacher_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teacher_applications_updated_at on public.teacher_applications;
create trigger trg_teacher_applications_updated_at
before update on public.teacher_applications
for each row
execute function public.set_teacher_applications_updated_at();
