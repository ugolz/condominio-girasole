-- ============================================================
-- NOTIFICHE - eseguire nell'SQL editor di Supabase
-- ============================================================

-- Aggiunge lo stato di approvazione alla disponibilità assemblee
-- NULL = in attesa, TRUE = approvata
ALTER TABLE disponibilita_assemblee ADD COLUMN IF NOT EXISTS approvata BOOLEAN DEFAULT NULL;

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

-- Ogni utente legge solo le proprie notifiche
CREATE POLICY "Lettura propria" ON notifiche
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Solo admin può inserire notifiche (le crea quando approva)
CREATE POLICY "Inserimento admin" ON notifiche
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Ogni utente può aggiornare (segnare come letta) solo le proprie
CREATE POLICY "Aggiornamento proprio" ON notifiche
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
