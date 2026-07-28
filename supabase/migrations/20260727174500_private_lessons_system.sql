-- Private lessons complete system
create table if not exists public.private_lesson_packages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  badge text,
  icon text,
  color_key text not null default 'primary',
  duration_minutes integer not null default 60,
  sessions_count integer not null default 1,
  support_type text not null default 'standard',
  includes_followup boolean not null default false,
  includes_homework boolean not null default false,
  includes_reports boolean not null default false,
  includes_tests boolean not null default false,
  includes_summaries boolean not null default false,
  includes_question_bank boolean not null default false,
  includes_certificate boolean not null default false,
  includes_priority_booking boolean not null default false,
  includes_reschedule boolean not null default true,
  includes_tech_support boolean not null default true,
  feature_list text[] not null default '{}',
  old_price numeric(10,2),
  price numeric(10,2) not null default 0,
  discount_percent integer not null default 0,
  seats_limit integer,
  seats_remaining integer,
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  cancellation_policy text,
  refund_policy text
);

create table if not exists public.private_lesson_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null,
  package_id uuid not null references public.private_lesson_packages(id) on delete restrict,
  teacher_application_id uuid references public.teacher_applications(id) on delete set null,
  instructor_user_id uuid,
  student_name text not null,
  student_email text,
  student_phone text,
  subject text not null,
  education_level text,
  lesson_date date,
  lesson_time text,
  timezone text,
  sessions_count integer not null default 1,
  duration_minutes integer not null default 60,
  seats_left_snapshot integer,
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  coupon_code text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  booking_status text not null default 'pending' check (booking_status in ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled')),
  cancel_reason text,
  reschedule_count integer not null default 0,
  meeting_link text,
  homework_url text,
  teacher_notes text,
  student_notes text,
  recommended_similar_packages uuid[] not null default '{}',
  calendar_event_ics text,
  added_to_calendar boolean not null default false
);

create table if not exists public.instructor_availability (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_application_id uuid not null references public.teacher_applications(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time text not null,
  end_time text not null,
  is_active boolean not null default true
);

create table if not exists public.private_lesson_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid not null references public.private_lesson_bookings(id) on delete cascade,
  teacher_application_id uuid not null references public.teacher_applications(id) on delete cascade,
  user_id uuid not null,
  teacher_rating smallint not null check (teacher_rating between 1 and 5),
  explanation_quality_rating smallint not null check (explanation_quality_rating between 1 and 5),
  punctuality_rating smallint not null check (punctuality_rating between 1 and 5),
  audio_video_rating smallint not null check (audio_video_rating between 1 and 5),
  overall_rating smallint not null check (overall_rating between 1 and 5),
  comment text,
  is_published boolean not null default true
);

create index if not exists idx_private_bookings_user on public.private_lesson_bookings(user_id);
create index if not exists idx_private_bookings_instructor on public.private_lesson_bookings(instructor_user_id);
create index if not exists idx_private_bookings_status on public.private_lesson_bookings(booking_status, payment_status);
create index if not exists idx_private_packages_active on public.private_lesson_packages(is_active, sort_order);

alter table public.private_lesson_packages enable row level security;
alter table public.private_lesson_bookings enable row level security;
alter table public.instructor_availability enable row level security;
alter table public.private_lesson_reviews enable row level security;

-- Public packages read
create policy "Private packages public read"
on public.private_lesson_packages
for select
using (is_active = true or public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins manage private packages"
on public.private_lesson_packages
for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

-- Student bookings
create policy "Users create own private bookings"
on public.private_lesson_bookings
for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users read own private bookings"
on public.private_lesson_bookings
for select to authenticated
using (auth.uid() = user_id);

create policy "Users update own pending bookings"
on public.private_lesson_bookings
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Instructor and admin visibility
create policy "Instructors read assigned private bookings"
on public.private_lesson_bookings
for select to authenticated
using (
  instructor_user_id = auth.uid()
  or public.has_role(auth.uid(), 'admin'::app_role)
);

create policy "Instructors update assigned private bookings"
on public.private_lesson_bookings
for update to authenticated
using (
  instructor_user_id = auth.uid()
  or public.has_role(auth.uid(), 'admin'::app_role)
)
with check (
  instructor_user_id = auth.uid()
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- Availability
create policy "Public read instructor availability"
on public.instructor_availability
for select
using (is_active = true or public.has_role(auth.uid(), 'admin'::app_role));

create policy "Instructors manage own availability"
on public.instructor_availability
for all to authenticated
using (
  exists (
    select 1 from public.teacher_applications ta
    where ta.id = teacher_application_id
      and ta.instructor_user_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin'::app_role)
)
with check (
  exists (
    select 1 from public.teacher_applications ta
    where ta.id = teacher_application_id
      and ta.instructor_user_id = auth.uid()
  )
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- Reviews
create policy "Public read published private reviews"
on public.private_lesson_reviews
for select
using (is_published = true or public.has_role(auth.uid(), 'admin'::app_role));

create policy "Users insert own private reviews"
on public.private_lesson_reviews
for insert to authenticated
with check (auth.uid() = user_id);

create policy "Admins manage private reviews"
on public.private_lesson_reviews
for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at triggers
create or replace function public.set_private_lessons_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_private_packages_updated_at
before update on public.private_lesson_packages
for each row execute function public.set_private_lessons_updated_at();

create trigger trg_private_bookings_updated_at
before update on public.private_lesson_bookings
for each row execute function public.set_private_lessons_updated_at();

create trigger trg_private_availability_updated_at
before update on public.instructor_availability
for each row execute function public.set_private_lessons_updated_at();

-- Notify admin on new booking
create or replace function public.notify_new_private_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_package_name text;
begin
  select name into v_package_name from public.private_lesson_packages where id = new.package_id;

  insert into public.admin_notifications (type, title, message, link, metadata)
  values (
    'private_lesson_booking',
    'حجز جديد في الحصص الخصوصية',
    new.student_name || ' حجز باقة ' || coalesce(v_package_name, 'غير محددة'),
    '/admin/private-lessons',
    jsonb_build_object('booking_id', new.id, 'user_id', new.user_id, 'package_id', new.package_id)
  );

  return new;
end;
$$;

create trigger trg_notify_new_private_booking
after insert on public.private_lesson_bookings
for each row execute function public.notify_new_private_booking();

-- Seed packages
insert into public.private_lesson_packages (
  name, slug, short_description, full_description, badge, icon, color_key,
  duration_minutes, sessions_count, support_type, includes_followup, includes_homework,
  includes_reports, includes_tests, includes_summaries, includes_question_bank,
  includes_certificate, includes_priority_booking, includes_reschedule, includes_tech_support,
  feature_list, old_price, price, discount_percent, is_active, is_featured, sort_order,
  cancellation_policy, refund_policy
)
values
(
  'الحصة المفردة', 'single-session',
  'شرح درس محدد أو مراجعة قبل اختبار مع مرونة كاملة في الموعد.',
  'مثالية للطلاب الذين يحتاجون إلى شرح درس معين، مراجعة قبل اختبار، حل الواجبات، أو الإجابة عن استفسارات محددة.',
  null, '🟢', 'emerald',
  60, 1, 'standard', true, true,
  false, false, false, false,
  false, false, true, true,
  array['مدة الحصة', 'اختيار المادة', 'اختيار المعلم', 'اختيار الموعد', 'إعادة الجدولة'],
  0, 120, 0, true, false, 1,
  'يمكن إعادة الجدولة قبل 12 ساعة من الموعد.',
  'استرجاع كامل خلال 24 ساعة من الحجز ما لم تبدأ الحصة.'
),
(
  'الباقة الأسبوعية', 'weekly-plan',
  'برنامج أسبوعي منتظم مع متابعة مستمرة وتوفير أفضل من الحصص المفردة.',
  'برنامج أسبوعي يتضمن عدة حصص مع متابعة مستمرة من المعلم لضمان تقدم الطالب وتحقيق أفضل النتائج.',
  '🔥 الأكثر طلباً', '🔵', 'sky',
  60, 3, 'priority', true, true,
  true, false, false, false,
  false, false, true, true,
  array['عدد الحصص أسبوعياً', 'متابعة الواجبات', 'تقارير أسبوعية', 'تواصل مع المعلم'],
  360, 320, 11, true, true, 2,
  'يمكن إعادة الجدولة لكل حصة قبل 8 ساعات من الموعد.',
  'استرجاع جزئي حسب الحصص المستخدمة.'
),
(
  'الباقة الشهرية', 'monthly-program',
  'برنامج متكامل بخطة تعليمية شخصية وتقارير أداء دورية.',
  'برنامج متكامل يوفر متابعة تعليمية مستمرة طوال الشهر، مع خطة تعليمية شخصية وتقارير أداء دورية لتحقيق أعلى مستوى من التحصيل.',
  '⭐ أفضل قيمة', '🟣', 'violet',
  60, 12, 'priority', true, true,
  true, true, true, true,
  true, true, true, true,
  array['خطة تعليمية', 'اختبارات دورية', 'تقارير للأهل', 'أولوية الحجز', 'شهادة إتمام'],
  1440, 1120, 22, true, true, 3,
  'إمكانية إعادة جدولة حتى 2 مرة لكل أسبوع.',
  'استرجاع نسبي للحصص غير المستخدمة خلال أول 7 أيام.'
),
(
  'الباقة المكثفة', 'intensive-exam',
  'مراجعة مكثفة للمنهج مع نماذج اختبارات وبنك أسئلة.',
  'برنامج مكثف صُمم خصيصاً لمراجعة المنهج بالكامل قبل الاختبارات، مع التركيز على أهم النقاط والأسئلة المتوقعة وحل نماذج الامتحانات.',
  '🚀 استعداد للاختبارات', '🟠', 'amber',
  90, 16, 'priority', true, true,
  true, true, true, true,
  true, true, true, true,
  array['مراجعة المنهج بالكامل', 'حل نماذج امتحانات', 'تدريبات مكثفة', 'ملخصات شاملة', 'بنك أسئلة', 'اختبارات تجريبية', 'تقارير مستوى'],
  2800, 2250, 20, true, true, 4,
  'لا يمكن الإلغاء قبل أقل من 24 ساعة من أول حصة.',
  'استرجاع جزئي وفق سياسة المنصة للبرامج المكثفة.'
)
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  badge = excluded.badge,
  icon = excluded.icon,
  color_key = excluded.color_key,
  duration_minutes = excluded.duration_minutes,
  sessions_count = excluded.sessions_count,
  support_type = excluded.support_type,
  includes_followup = excluded.includes_followup,
  includes_homework = excluded.includes_homework,
  includes_reports = excluded.includes_reports,
  includes_tests = excluded.includes_tests,
  includes_summaries = excluded.includes_summaries,
  includes_question_bank = excluded.includes_question_bank,
  includes_certificate = excluded.includes_certificate,
  includes_priority_booking = excluded.includes_priority_booking,
  includes_reschedule = excluded.includes_reschedule,
  includes_tech_support = excluded.includes_tech_support,
  feature_list = excluded.feature_list,
  old_price = excluded.old_price,
  price = excluded.price,
  discount_percent = excluded.discount_percent,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  cancellation_policy = excluded.cancellation_policy,
  refund_policy = excluded.refund_policy,
  updated_at = now();
