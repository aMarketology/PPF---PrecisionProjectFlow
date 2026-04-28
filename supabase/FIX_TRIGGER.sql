-- =====================================================
-- FIX_TRIGGER.sql
-- Recreates handle_new_user with safe defaults for
-- all non-null columns, including user_type.
-- Run this in the Supabase SQL editor.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        user_type
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'engineer')
    )
    ON CONFLICT (id) DO UPDATE
        SET
            email     = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            user_type = EXCLUDED.user_type;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (safe – drops first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
