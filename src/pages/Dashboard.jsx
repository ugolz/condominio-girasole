import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import {
  Calendar, ClipboardList, Clock, Wrench, FileText,
  ChevronRight, Receipt, TrendingDown, CheckCircle2, Users,
} from 'lucide-react'
import { format, addDays, differenceInDays, isBefore, isAfter, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Dashboard() {
  const { profile, unita, loading: profileLoading } = useProfile()

  const [globalStats, setGlobalStats] = useState({ guastiAperti: 0, prossimeAssemblee: 0, obblighiPendenti: 0 })
  const [recentGuasti, setRecentGuasti] = useState([])
  const [assemblee, setAssemblee] = useState([])
  const [obblighi, setObblighi] = useState([])
  const [quoteSpese, setQuoteSpese] = useState([])
  const [millesimi, setMillesimi] = useState(null)
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [loadingUser, setLoadingUser] = useState(false)

  // Fetch globale (indipendente dall'unità)
  useEffect(() => {
    const fetchGlobal = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const [guastiRes, dispRes, obblighiRes, assembleeRes] = await Promise.all([
        supabase.from('guasti').select('id, titolo, priorita, created_at').eq('stato', 'aperto').order('created_at', { ascending: false }).limit(4),
        supabase.from('disponibilita_assemblee').select('id').gte('data', new Date().toISOString()),
        supabase.from('obblighi').select('*').eq('completato', false).order('data_inizio'),
        supabase.from('assemblee').select('*').gte('data', today).order('data').limit(5),
      ])
      setRecentGuasti(guastiRes.data || [])
      setObblighi(obblighiRes.data || [])
      setAssemblee(assembleeRes.data || [])
      setGlobalStats({
        guastiAperti:      guastiRes.data?.length || 0,
        prossimeAssemblee: dispRes.data?.length || 0,
        obblighiPendenti:  obblighiRes.data?.length || 0,
      })
      setLoadingGlobal(false)
    }
    fetchGlobal()
  }, [])

  // Fetch specifico per l'unità dell'utente
  useEffect(() => {
    if (profileLoading || !unita) return
    const fetchUser = async () => {
      setLoadingUser(true)
      const [millRes, quoteRes] = await Promise.all([
        supabase.from('millesimi_config').select('valore').eq('unita', unita).single(),
        supabase.from('quote_spese')
          .select('*, spese_comuni(titolo, categoria, data_scadenza, importo_totale)')
          .eq('unita', unita)
          .order('completata')
          .order('spese_comuni(data_scadenza)', { ascending: true })
          .limit(20),
      ])
      setMillesimi(millRes.data?.valore ?? null)
      setQuoteSpese(quoteRes.data || [])
      setLoadingUser(false)
    }
    fetchUser()
  }, [unita, profileLoading])

  const today = new Date()
  const in30gg = addDays(today, 30)

  const quotePendenti  = quoteSpese.filter(q => !q.completata)
  const quotePagate    = quoteSpese.filter(q => q.completata)
  const quoteVicine    = quotePendenti.filter(q => {
    const scad = new Date(q.spese_comuni.data_scadenza + 'T00:00:00')
    return !isBefore(scad, today) && isBefore(scad, in30gg)
  })
  const totalePendente = quotePendenti.reduce((acc, q) => acc + Number(q.importo_quota), 0)
  const totalePagato   = quotePagate.reduce((acc, q)  => acc + Number(q.importo_quota), 0)

  const statCards = [
    { label: 'Guasti aperti',           value: globalStats.guastiAperti,      icon: Wrench,        to: '/guasti',     color: 'text-red-500',        bg: 'bg-red-50',        loading: loadingGlobal },
    { label: 'Pagamenti entro 30gg',    value: quoteVicine.length,             icon: Clock,         to: '/scadenze',   color: 'text-amber-500',      bg: 'bg-amber-50',      loading: loadingUser || profileLoading },
    { label: 'Disponibilità assemblee', value: globalStats.prossimeAssemblee,  icon: Calendar,      to: '/calendario', color: 'text-terracotta-500', bg: 'bg-terracotta-50', loading: loadingGlobal },
    { label: 'Obblighi pendenti',       value: globalStats.obblighiPendenti,   icon: ClipboardList, to: '/obblighi',   color: 'text-sage-600',       bg: 'bg-sage-50',       loading: loadingGlobal },
  ]

  // Classifica ogni obbligo come "oggi", "settimana" o "mese"
  const oggi = startOfDay(new Date())
  const fineSettimana = endOfWeek(new Date(), { weekStartsOn: 1 })
  const fineMese = endOfMonth(new Date())

  const obblighiClassificati = obblighi.map(o => {
    const start = o.data_inizio ? startOfDay(parseISO(o.data_inizio + 'T00:00:00')) : null
    const fine  = o.data_fine  ? startOfDay(parseISO(o.data_fine  + 'T00:00:00')) : null
    // attivo su un dato giorno: iniziato o senza inizio, e non ancora finito
    const attivoIn = (d) => (!start || !isAfter(start, d)) && (!fine || !isBefore(fine, d))
    if (attivoIn(oggi))          return { ...o, periodo: 'oggi' }
    if (attivoIn(fineSettimana)) return { ...o, periodo: 'settimana' }
    if (attivoIn(fineMese))      return { ...o, periodo: 'mese' }
    return null
  }).filter(Boolean)

  const periodoLabel = { oggi: 'Oggi', settimana: 'Questa settimana', mese: 'Questo mese' }
  const periodoColor = { oggi: 'text-red-600 bg-red-50', settimana: 'text-amber-600 bg-amber-50', mese: 'text-stone-500 bg-stone-100' }

  const prioritaClass = { alta: 'badge-urgent', media: 'badge-pending', bassa: 'badge-done' }
  const prioritaLabel = { alta: 'Urgente', media: 'Media', bassa: 'Bassa' }

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buona sera'
  const nomeDisplay = profile?.nome ?? profile?.email?.split('@')[0] ?? ''

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Benvenuto */}
      <div>
        <p className="text-stone-400 text-sm">{format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}</p>
        <h1 className="text-xl font-semibold text-stone-800 mt-0.5">
          {saluto}{nomeDisplay ? `, ${nomeDisplay}` : ''}! 👋
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, to, color, bg, loading }) => (
          <Link key={to} to={to} className="card p-4 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-stone-800">{loading ? '—' : value}</p>
            <p className="text-xs text-stone-400 mt-0.5 leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      {/* Assemblee confermate */}
      {!loadingGlobal && assemblee.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
            {assemblee.length === 1 ? 'Assemblea indetta' : 'Assemblee indette'}
          </h2>
          {assemblee.map(a => {
            const data = parseISO(a.data + 'T00:00:00')
            const giorni = differenceInDays(data, startOfDay(today))
            return (
              <Link key={a.id} to="/calendario" className="card p-4 flex items-center gap-4 border-l-4 border-terracotta-400 hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 text-center bg-terracotta-50 rounded-xl px-3 py-2 min-w-[52px]">
                  <p className="text-lg font-bold text-terracotta-600 leading-none">{format(data, 'd', { locale: it })}</p>
                  <p className="text-[10px] font-semibold text-terracotta-400 uppercase tracking-wide">{format(data, 'MMM', { locale: it })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-terracotta-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-stone-800">
                      Assemblea condominiale · ore {a.ora}
                    </p>
                  </div>
                  {a.note && <p className="text-xs text-stone-400 mt-0.5 truncate">{a.note}</p>}
                  <p className="text-xs text-terracotta-500 mt-0.5 font-medium">
                    {giorni === 0 ? 'Oggi' : giorni === 1 ? 'Domani' : `Tra ${giorni} giorni`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Riepilogo spese personali */}
      {!profileLoading && unita && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Le tue spese condominiali</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 border-l-4 border-amber-400">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Da pagare</span>
              </div>
              {loadingUser ? <p className="text-2xl font-bold text-stone-300">—</p> : (
                <>
                  <p className="text-2xl font-bold text-amber-600">
                    €{totalePendente.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {quotePendenti.length} {quotePendenti.length === 1 ? 'quota' : 'quote'} in sospeso
                  </p>
                </>
              )}
            </div>
            <div className="card p-4 border-l-4 border-sage-400">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-sage-500" />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Già pagato</span>
              </div>
              {loadingUser ? <p className="text-2xl font-bold text-stone-300">—</p> : (
                <>
                  <p className="text-2xl font-bold text-sage-600">
                    €{totalePagato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {quotePagate.length} {quotePagate.length === 1 ? 'quota' : 'quote'} saldate
                  </p>
                </>
              )}
            </div>
          </div>

          {!loadingUser && quoteSpese.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <h3 className="font-medium text-stone-700 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-stone-400" /> Spese assegnate
                </h3>
                <Link to="/scadenze" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
                  Tutte <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-stone-50">
                {quoteSpese.slice(0, 5).map(q => {
                  const scad = new Date(q.spese_comuni.data_scadenza + 'T00:00:00')
                  const diff = differenceInDays(scad, today)
                  const scaduta = !q.completata && isBefore(scad, today)
                  return (
                    <div key={q.id} className={`px-4 py-3 flex items-center gap-3 ${q.completata ? 'opacity-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${q.completata ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                            {q.spese_comuni.titolo}
                          </p>
                          {q.completata && <CheckCircle2 className="w-3.5 h-3.5 text-sage-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-stone-400">
                          {format(scad, 'd MMM yyyy', { locale: it })}
                          {millesimi && <span className="ml-1">· {millesimi} mill.</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${q.completata ? 'text-sage-500' : scaduta ? 'text-red-500' : 'text-stone-700'}`}>
                          €{Number(q.importo_quota).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                        {!q.completata && (
                          <p className={`text-xs ${scaduta ? 'text-red-400' : diff <= 7 ? 'text-amber-500' : 'text-stone-400'}`}>
                            {scaduta ? 'Scaduta' : `${diff}gg`}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!loadingUser && quoteSpese.length === 0 && (
            <div className="card p-6 text-center">
              <Receipt className="w-7 h-7 text-stone-200 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">Nessuna spesa condominiale assegnata</p>
            </div>
          )}
        </div>
      )}

      {!profileLoading && !unita && (
        <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            La tua unità non è ancora configurata. Contatta l'amministratore per visualizzare le tue spese personali.
          </p>
        </div>
      )}

      {/* Obblighi comuni */}
      {!loadingGlobal && obblighiClassificati.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h2 className="font-medium text-stone-700 text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-sage-500" /> Obblighi comuni
            </h2>
            <Link to="/obblighi" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
              Tutti <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-50">
            {obblighiClassificati.slice(0, 5).map(o => (
              <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{o.titolo}</p>
                  <p className="text-xs text-stone-400">
                    {o.categoria}
                    {o.assegnato_a && <span className="ml-1">· {o.assegnato_a}</span>}
                    {o.data_fine && <span className="ml-1">· fino al {format(parseISO(o.data_fine + 'T00:00:00'), 'd MMM', { locale: it })}</span>}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${periodoColor[o.periodo]}`}>
                  {periodoLabel[o.periodo]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guasti aperti */}
      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h2 className="font-medium text-stone-700 text-sm">Guasti aperti</h2>
          <Link to="/guasti" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
            Tutti <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-stone-50">
          {loadingGlobal ? (
            <div className="p-4 text-sm text-stone-400">Caricamento...</div>
          ) : recentGuasti.length === 0 ? (
            <div className="p-6 text-center text-stone-400 text-sm">Nessun guasto aperto 🎉</div>
          ) : (
            recentGuasti.map(g => (
              <div key={g.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{g.titolo}</p>
                  <p className="text-xs text-stone-400">{format(new Date(g.created_at), 'd MMM', { locale: it })}</p>
                </div>
                <span className={prioritaClass[g.priorita]}>{prioritaLabel[g.priorita]}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Accesso rapido */}
      <div className="card p-4">
        <h2 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-3">Accesso rapido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { to: '/calendario', label: 'Segna disponibilità', icon: Calendar },
            { to: '/guasti',     label: 'Segnala un guasto',   icon: Wrench },
            { to: '/verbali',    label: 'Carica verbale',       icon: FileText },
            { to: '/obblighi',   label: 'Aggiungi obbligo',    icon: ClipboardList },
            { to: '/scadenze',   label: 'Vai ai pagamenti',    icon: Clock },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-2 p-3 rounded-lg hover:bg-stone-50 transition-colors border border-stone-100 text-sm text-stone-600 hover:text-stone-800">
              <Icon className="w-4 h-4 text-terracotta-400 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
