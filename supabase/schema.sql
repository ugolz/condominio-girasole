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
  completato BOOLEAN DEFAULT FALSE,
  completato_il TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Policy: tutti gli autenticati possono inserire
CREATE POLICY "Inserimento autenticati" ON disponibilita_assemblee FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento autenticati" ON obblighi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento autenticati" ON scadenze FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento autenticati" ON guasti FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Inserimento autenticati" ON verbali FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: tutti possono aggiornare (condominio piccolo, fiducia reciproca)
CREATE POLICY "Aggiornamento autenticati" ON disponibilita_assemblee FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON obblighi FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON scadenze FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON guasti FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Aggiornamento autenticati" ON verbali FOR UPDATE TO authenticated USING (true);

-- Policy: solo chi ha creato può eliminare
CREATE POLICY "Eliminazione propria" ON disponibilita_assemblee FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Eliminazione propria" ON obblighi FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Eliminazione propria" ON scadenze FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
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
