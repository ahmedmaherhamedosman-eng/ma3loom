-- Teacher applications must be submitted by a signed-in platform user.
drop policy if exists "Public can insert teacher applications" on public.teacher_applications;

create policy "Authenticated users can insert teacher applications"
on public.teacher_applications
for insert
to authenticated
with check (auth.uid() is not null);
