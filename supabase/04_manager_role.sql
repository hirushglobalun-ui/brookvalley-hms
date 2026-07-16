-- Migration to add manager role to constraints

-- 1. Modify public.profiles constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'employee', 'manager', 'developer'));

-- 2. Modify public.employees constraint
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'employee', 'manager', 'developer'));
