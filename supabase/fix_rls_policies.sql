-- ============================================================
-- FIX RLS POLICIES - eseguire sull'SQL editor di Supabase
-- Risolve il problema "qual = null" e la dipendenza circolare
-- con la tabella profiles che ha RLS abilitato
-- ============================================================

-- STEP 1: crea funzione helper SECURITY DEFINER
-- Questa funzione bypassa RLS quando legge profiles,
-- evitando la dipendenza circolare nelle policy
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

-- STEP 2: fix policy DELETE e INSERT su scadenze
DROP POLICY IF EXISTS "Eliminazione solo admin" ON scadenze;
DROP POLICY IF EXISTS "Inserimento solo admin" ON scadenze;

CREATE POLICY "Eliminazione solo admin" ON scadenze
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Inserimento solo admin" ON scadenze
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- STEP 3: fix policy su millesimi_config
DROP POLICY IF EXISTS "Modifica solo admin" ON millesimi_config;
DROP POLICY IF EXISTS "Inserimento solo admin" ON millesimi_config;

CREATE POLICY "Modifica solo admin" ON millesimi_config
  FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Inserimento solo admin" ON millesimi_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- STEP 4: fix policy su spese_comuni
DROP POLICY IF EXISTS "Inserimento solo admin" ON spese_comuni;
DROP POLICY IF EXISTS "Eliminazione solo admin" ON spese_comuni;

CREATE POLICY "Inserimento solo admin" ON spese_comuni
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Eliminazione solo admin" ON spese_comuni
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- STEP 5: fix policy su quote_spese
DROP POLICY IF EXISTS "Inserimento solo admin" ON quote_spese;
DROP POLICY IF EXISTS "Aggiornamento quota" ON quote_spese;
DROP POLICY IF EXISTS "Eliminazione solo admin" ON quote_spese;

CREATE POLICY "Inserimento solo admin" ON quote_spese
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Aggiornamento quota" ON quote_spese
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR unita = (SELECT unita FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Eliminazione solo admin" ON quote_spese
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- STEP 6: fix policy UPDATE su profiles (stessa dipendenza circolare)
DROP POLICY IF EXISTS "Aggiornamento admin o proprio" ON profiles;

CREATE POLICY "Aggiornamento admin o proprio" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- STEP 7 (se non già fatto): aggiungi colonne mancanti
ALTER TABLE obblighi ADD COLUMN IF NOT EXISTS data_inizio DATE;
ALTER TABLE obblighi ADD COLUMN IF NOT EXISTS data_fine DATE;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cognome TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS note TEXT;

-- VERIFICA: controlla che le policy ora abbiano qual non null
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('scadenze', 'millesimi_config', 'spese_comuni', 'quote_spese', 'profiles')
-- ORDER BY tablename, cmd;
