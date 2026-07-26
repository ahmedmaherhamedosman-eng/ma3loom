-- Allow admins to delete profiles and user_roles for student management
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view enrollments by user (already exists for all enrollments)
-- Allow admins to delete enrollments to clean up student data
CREATE POLICY "Admins can delete enrollments"
ON public.enrollments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));