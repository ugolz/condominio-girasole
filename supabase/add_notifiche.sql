-- ============================================================
-- NOTIFICHE + ASSEMBLEE - eseguire nell'SQL editor di Supabase
-- ============================================================

-- Tabella notifiche per gli utenti
CREATE TABLE IF NOT EXISTS notifiche (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titolo     TEXT NOT NULL,
  messaggio  TEXT,
  letta      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifiche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura propria" ON notifiche
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Inserimento admin" ON notifiche
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Aggiornamento proprio" ON notifiche
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Tabella assemblee approvate dall'admin
CREATE TABLE IF NOT EXISTS assemblee (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data       DATE NOT NULL UNIQUE,
  ora        VARCHAR(5) NOT NULL DEFAULT '10:00',
  note       TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assemblee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura autenticati" ON assemblee
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inserimento admin" ON assemblee
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Aggiornamento admin" ON assemblee
  FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Eliminazione admin" ON assemblee
  FOR DELETE TO authenticated USING (public.is_admin());
