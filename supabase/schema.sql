-- ============================================================
-- CONDO MANAGER - Schema Supabase
-- Esegui questo SQL nell'editor SQL di Supabase
-- ============================================================

-- Tabella: Disponibilità assemblee
CREATE TABLE IF NOT EXISTS disponibilita_assemblee (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data TIMESTAMPTZ NOT NULL,
  ora VARCHAR(5) NOT NULL DEFAULT '10:00',
  unita VARCHAR(50) NOT NULL,
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella: Obblighi comuni
CREATE TABLE IF NOT EXISTS obblighi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria VARCHAR(50) DEFAULT 'Altro',
  assegnato_a VARCHAR(50),
  ricorrenza VARCHAR(20) DEFAULT 'mensile',
  data_inizio DATE,
  data_fine DATE,
  completato BOOLEAN DEFAULT FALSE,
  completato_il TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se la tabella esiste già, aggiungere le colonne:
-- ALTER TABLE obblighi ADD COLUMN IF NOT EXISTS data_inizio DATE;
-- ALTER TABLE obblighi ADD COLUMN IF NOT EXISTS data_fine DATE;

-- Tabella: Scadenze
CREATE TABLE IF NOT EXISTS scadenze (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria VARCHAR(80) DEFAULT 'Altro',
  data_scadenza DATE NOT NULL,
  importo NUMERIC(10,2),
  completata BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella: Guasti
CREATE TABLE IF NOT EXISTS guasti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria VARCHAR(80) DEFAULT 'Altro',
  priorita VARCHAR(10) DEFAULT 'media' CHECK (priorita IN ('bassa', 'media', 'alta')),
  stato VARCHAR(20) DEFAULT 'aperto' CHECK (stato IN ('aperto', 'in_corso', 'risolto')),
  unita VARCHAR(50),
  risolto_il TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella: Verbali
CREATE TABLE IF NOT EXISTS verbali (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo VARCHAR(255) NOT NULL,
  data_assemblea DATE NOT NULL,
  note TEXT,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_nome VARCHAR(255),
  file_size BIGINT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HELPER: funzione is_admin() con SECURITY DEFINER
-- Bypassa RLS su profiles per evitare dipendenza circolare
-- ============================================================

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

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE disponibilita_assemblee ENABLE ROW LEVEL SECURITY;
ALTER TABLE obblighi ENABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze ENABLE ROW LEVEL SECURITY;
ALTER TABLE guasti ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbali ENABLE ROW LEVEL SECURITY;

-- Policy: tutti gli utenti autenticati possono leggere tutto
CREATE POLICY "Lettura autenticati" ON disponibilita_assemblee FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lettura autenticati" ON obblighi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lettura autenticati" ON scadenze FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lettura autenticati" ON guasti FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lettura autenticati" ON verbali FOR SELECT TO authenticated USING (true);

-- Policy: tutti gli autenticati possono inserire (eccetto scadenze: solo admin)
CREATE POLICY "Inserimento autenticati" ON disponibilita_assemblee FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento autenticati" ON obblighi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento solo admin" ON scadenze FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Inserimento autenticati" ON guasti FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento autenticati" ON verbali FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: tutti possono aggiornare (condominio piccolo, fiducia reciproca)
CREATE POLICY "Aggiornamento autenticati" ON disponibilita_assemblee FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON obblighi FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON scadenze FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON guasti FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON verbali FOR UPDATE TO authenticated USING (true);

-- Policy: solo chi ha creato può eliminare (scadenze: solo admin)
CREATE POLICY "Eliminazione propria" ON disponibilita_assemblee FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Eliminazione propria" ON obblighi FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Eliminazione solo admin" ON scadenze FOR DELETE TO authenticated
  USING (public.is_admin());
CREATE POLICY "Eliminazione propria" ON guasti FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Eliminazione propria" ON verbali FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- STORAGE BUCKET per i PDF
-- Eseguire in SQL editor o dalla UI di Supabase:
-- ============================================================
-- 1. Vai su Storage > Create bucket
-- 2. Nome: "documenti"
-- 3. Public: TRUE (per permettere download diretto)
-- Oppure via SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('documenti', 'documenti', true)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: lettura pubblica
CREATE POLICY "Lettura pubblica storage" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'documenti');

-- Policy storage: upload per autenticati
CREATE POLICY "Upload autenticati" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documenti');

-- Policy storage: eliminazione per chi ha caricato
CREATE POLICY "Eliminazione propria storage" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documenti' AND auth.uid() = owner);

-- ============================================================
-- SUPERADMIN FEATURE
-- ============================================================

-- Tabella: Profili utente
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email      TEXT NOT NULL,
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  unita      VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella: Configurazione millesimi per unità (su 1000)
CREATE TABLE IF NOT EXISTS millesimi_config (
  id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unita VARCHAR(50) NOT NULL UNIQUE,
  valore NUMERIC(7,3) NOT NULL
);

-- Seed iniziale: 6 unità a quota uguale
INSERT INTO millesimi_config (unita, valore) VALUES
  ('Interno 1', 166.667), ('Interno 2', 166.667), ('Interno 3', 166.667),
  ('Interno 4', 166.667), ('Interno 5', 166.667), ('Interno 6', 166.667)
ON CONFLICT (unita) DO NOTHING;

-- Tabella: Spese comuni create dall'admin
CREATE TABLE IF NOT EXISTS spese_comuni (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo         VARCHAR(255) NOT NULL,
  descrizione    TEXT,
  categoria      VARCHAR(80) DEFAULT 'Altro',
  data_scadenza  DATE NOT NULL,
  importo_totale NUMERIC(10,2) NOT NULL,
  note           TEXT,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella: Quote individuali per unità (una riga per unità per spesa)
CREATE TABLE IF NOT EXISTS quote_spese (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spesa_id      UUID REFERENCES spese_comuni(id) ON DELETE CASCADE NOT NULL,
  unita         VARCHAR(50) NOT NULL,
  millesimi     NUMERIC(7,3) NOT NULL,
  importo_quota NUMERIC(10,2) NOT NULL,
  completata    BOOLEAN NOT NULL DEFAULT FALSE,
  completata_il TIMESTAMPTZ,
  UNIQUE(spesa_id, unita)
);

-- ============================================================
-- RLS per le nuove tabelle
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE millesimi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE spese_comuni ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_spese ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Lettura autenticati" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Aggiornamento admin o proprio" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- MILLESIMI_CONFIG
CREATE POLICY "Lettura autenticati" ON millesimi_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modifica solo admin" ON millesimi_config FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "Inserimento solo admin" ON millesimi_config FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- SPESE_COMUNI
CREATE POLICY "Lettura autenticati" ON spese_comuni FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserimento solo admin" ON spese_comuni FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Eliminazione solo admin" ON spese_comuni FOR DELETE TO authenticated
  USING (public.is_admin());

-- QUOTE_SPESE
CREATE POLICY "Lettura autenticati" ON quote_spese FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserimento solo admin" ON quote_spese FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "Aggiornamento quota" ON quote_spese FOR UPDATE TO authenticated
  USING (public.is_admin() OR unita = (SELECT unita FROM profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "Eliminazione solo admin" ON quote_spese FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- TRIGGER: crea profilo automaticamente all'iscrizione
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, is_admin, unita)
  VALUES (NEW.id, NEW.email, FALSE, NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Per utenti già esistenti (eseguire una volta nel SQL editor di Supabase):
-- INSERT INTO public.profiles (user_id, email) SELECT id, email FROM auth.users ON CONFLICT (user_id) DO NOTHING;
-- Promuovere il primo admin:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'tuaemail@esempio.it';
