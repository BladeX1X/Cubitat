-- Fix search path and enum casting in the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_metadata->>'full_name', ''),
        coalesce((new.raw_user_metadata->>'role')::public.user_role, 'buyer'::public.user_role)
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
