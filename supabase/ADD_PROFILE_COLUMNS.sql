-- Add missing columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'engineer' CHECK (user_type IN ('client', 'engineer')),
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Also add INSERT policy so the trigger-created row can be updated by the user
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
