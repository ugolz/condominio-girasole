# 🏢 Condo Manager

Gestionale condominiale per 6 unità. Stack: React + Vite + Supabase + Tailwind CSS + Vercel.

## Funzionalità

- 📅 **Calendario assemblee** — ogni condomino segna la propria disponibilità per data e orario
- 📋 **Obblighi comuni** — turni pulizie, manutenzioni, task ricorrenti con completamento
- ⏰ **Scadenze** — rate, revisioni, bollette con alert visivi per quelle in scadenza
- 🔧 **Segnalazioni guasti** — ticketing con priorità e stati (aperto → in corso → risolto)
- 📄 **Verbali assemblee** — upload/download PDF con archiviazione su Supabase Storage

---

## Setup in 5 passi

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto
2. Vai su **SQL Editor** e incolla tutto il contenuto di `supabase/schema.sql`
3. Clicca **Run** — crea tutte le tabelle, le policy RLS e il bucket Storage
4. Vai su **Settings > API** e copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env
# Modifica .env con i tuoi valori Supabase
```

### 3. Installa le dipendenze e avvia in locale

```bash
npm install
npm run dev
# → http://localhost:5173
```

### 4. Deploy su Vercel

```bash
# Installa Vercel CLI (opzionale, si può fare anche dalla UI)
npm i -g vercel
vercel

# Oppure:
# 1. Vai su vercel.com > New Project
# 2. Importa il tuo repository GitHub
# 3. Framework Preset: Vite
# 4. Aggiungi le env variables:
#    VITE_SUPABASE_URL = https://xxx.supabase.co
#    VITE_SUPABASE_ANON_KEY = eyJ...
```

### 5. Configura l'autenticazione Supabase

In **Supabase > Authentication > URL Configuration**, aggiungi:
- **Site URL**: `https://tuo-dominio.vercel.app`
- **Redirect URLs**: `https://tuo-dominio.vercel.app/**`

---

## Struttura del progetto

```
src/
├── lib/
│   └── supabase.js          # Client Supabase
├── components/
│   └── Layout.jsx           # Sidebar + navigazione
├── pages/
│   ├── Auth.jsx             # Login / Registrazione
│   ├── Dashboard.jsx        # Panoramica con statistiche
│   ├── Calendario.jsx       # Disponibilità assemblee
│   ├── Obblighi.jsx         # Obblighi comuni
│   ├── Scadenze.jsx         # Scadenze con alert
│   ├── Guasti.jsx           # Segnalazioni guasti
│   └── Verbali.jsx          # Upload/Download PDF
└── App.jsx                  # Router principale
supabase/
└── schema.sql               # Tutte le tabelle + RLS + Storage
```

---

## Note tecniche

- **RLS**: tutti i residenti autenticati possono leggere e inserire. Possono eliminare solo i propri record.
- **Storage**: il bucket `documenti` è pubblico in lettura per permettere download diretti dei PDF.
- **Autenticazione**: basata su email/password con Supabase Auth. Ogni utente si registra con la propria email.
- **Responsive**: funziona su mobile con sidebar a slide-in.

---

## Personalizzazioni rapide

- **Nomi interni**: modifica l'array `UNITA` in `Calendario.jsx`, `Obblighi.jsx` e `Guasti.jsx`
- **Categorie guasti**: modifica `CATEGORIE` in `Guasti.jsx`
- **Palette colori**: modifica `tailwind.config.js` (terracotta, sage, stone)
- **Nome condominio**: modifica il testo "Condominio" in `Layout.jsx`
