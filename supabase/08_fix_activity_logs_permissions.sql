-- Update RLS for activity_logs to allow Managers and Developers to read logs
DROP POLICY IF EXISTS "Admins can read activity logs" ON public.activity_logs;

CREATE POLICY "Admins, Managers, and Developers can read activity logs" 
  ON public.activity_logs FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer')
    )
  );
