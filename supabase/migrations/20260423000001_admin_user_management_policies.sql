-- Admin RLS policies: allow admins to read all profiles and user_roles.
-- Write operations (promote/demote/ban/delete) go through the
-- admin-manage-user edge function which uses the service_role key.

-- Admins can view all profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON public.profiles FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Admins can view all user_roles (so they can see who is admin, provider, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_roles' AND policyname = 'Admins can view all user_roles'
  ) THEN
    CREATE POLICY "Admins can view all user_roles"
      ON public.user_roles FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Admins can view all audit logs (policy may already exist — guard it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND policyname = 'Admins can view all audit logs'
  ) THEN
    CREATE POLICY "Admins can view all audit logs"
      ON public.audit_logs FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
