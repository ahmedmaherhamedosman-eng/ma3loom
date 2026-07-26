ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, user_type, age, phone, education_level, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    NULLIF(NEW.raw_user_meta_data->>'age', '')::integer,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'education_level', 'ثانوي'),
    NEW.raw_user_meta_data->>'country'
  );
  RETURN NEW;
END;
$function$;