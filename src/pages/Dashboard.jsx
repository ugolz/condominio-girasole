import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import {
  Calendar, ClipboardList, Clock, Wrench, FileText,
  ChevronRight, Receipt, TrendingDown, CheckCircle2,
} from 'lucide-react'
import { format, addDays, differenceInDays, isBefore } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Dashboard() {
  const { profile, unita, loading: profileLoading } = useProfile()

  const [stats, setStats] = useState({ guastiAperti: 0, pagamentiVicini: 0, prossimeAssemblee: 0, obblighiPendenti: 0 })
  const [recentGuasti, setRecentGuasti] = useState([])
  const [prossimePagamenti, setProssimePagamenti] = useState([])
  const [quoteSpese, setQuoteSpese] = useState([])
  const [millesimi, setMillesimi] = useState(null)
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [loadingUser, setLoadingUser] = useState(false)

  useEffect(() => {
    const fetchGlobal = async () => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const in30ggStr = addDays(today, 30).toISOString().split('T')[0]

      const [guastiRes, pagamentiRes, assembleeRes, obblighiRes] = await Promise.all([
        supabase.from('guasti').select('id, titolo, priorita, created_at').eq('stato', 'aperto').order('created_at', { ascending: false }).limit(4),
        supabase.from('scadenze').select('id, titolo, data_scadenza, categoria, importo').gte('data_scadenza', todayStr).lte('data_scadenza', in30ggStr).eq('completata', false).order('data_scadenza').limit(5),
        supabase.from('disponibilita_assemblee').select('id').gte('data', today.toISOString()),
        supabase.from('obblighi').select('id').eq('completato', false),
      ])

      setRecentGuasti(guastiRes.data || [])
      setProssimePagamenti(pagamentiRes.data || [])
      setStats({
        guastiAperti: guastiRes.data?.length || 0,
        pagamentiVicini: pagamentiRes.data?.length || 0,
        prossimeAssemblee: assembleeRes.data?.length || 0,
        obblighiPendenti: obblighiRes.data?.length || 0,
      })
      setLoadingGlobal(false)
    }
    fetchGlobal()
  }, [])

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
          .order('spese_comuni(data_scadenza)', { ascending: false })
          .limit(20),
      ])
      setMillesimi(millRes.data?.valore ?? null)
      setQuoteSpese(quoteRes.data || [])
      setLoadingUser(false)
    }
    fetchUser()
  }, [unita, profileLoading])

  const quotePendenti = quoteSpese.filter(q => !q.completata)
  const quotePagate = quoteSpese.filter(q => q.completata)
  const totalePendente = quotePendenti.reduce((acc, q) => acc + Number(q.importo_quota), 0)
  const totalePagato = quotePagate.reduce((acc, q) => acc + Number(q.importo_quota), 0)

  const statCards = [
    { label: 'Guasti aperti', value: stats.guastiAperti, icon: Wrench, to: '/guasti', color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Pagamenti entro 30gg', value: stats.pagamentiVicini, icon: Clock, to: '/scadenze', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Disponibilità assemblee', value: stats.prossimeAssemblee, icon: Calendar, to: '/calendario', color: 'text-terracotta-500', bg: 'bg-terracotta-50' },
    { label: 'Obblighi pendenti', value: stats.obblighiPendenti, icon: ClipboardList, to: '/obblighi', color: 'text-sage-600', bg: 'bg-sage-50' },
  ]

  const prioritaClass = { alta: 'badge-urgent', media: 'badge-pending', bassa: 'badge-done' }
  const prioritaLabel = { alta: 'Urgente', media: 'Media', bassa: 'Bassa' }

  const ora = new Date().getHours()
  const saluto = ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buona sera'
  const nomeDisplay = profile?.nome
    ? profile.nome
    : profile?.email?.split('@')[0] ?? ''

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-stone-400 text-sm">{format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}</p>
        <h1 className="text-xl font-semibold text-stone-800 mt-0.5">
          {saluto}{nomeDisplay ? `, ${nomeDisplay}` : ''}! 👋
        </h1>
        {unita && <p className="text-xs text-stone-400 mt-0.5">{unita}</p>}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, to, color, bg }) => (
          <Link key={to} to={to} className="card p-4 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-stone-800">{loadingGlobal ? '—' : value}</p>
            <p className="text-xs text-stone-400 mt-0.5 leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      {/* Situazione spese personale */}
      {!profileLoading && unita && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">Le tue spese condominiali</h2>

          {/* Totali */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 border-l-4 border-amber-400">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Da pagare</span>
              </div>
              {loadingUser ? (
                <p className="text-2xl font-bold text-stone-300">—</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-amber-600">
                    €{totalePendente.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{quotePendenti.length} {quotePendenti.length === 1 ? 'spesa' : 'spese'} in sospeso</p>
                </>
              )}
            </div>
            <div className="card p-4 border-l-4 border-sage-400">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-sage-500" />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Già pagato</span>
              </div>
              {loadingUser ? (
                <p className="text-2xl font-bold text-stone-300">—</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-sage-600">
                    €{totalePagato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{quotePagate.length} {quotePagate.length === 1 ? 'spesa' : 'spese'} saldate</p>
                </>
              )}
            </div>
          </div>

          {/* Lista quote spese */}
          {!loadingUser && quoteSpese.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <h3 className="font-medium text-stone-700 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-stone-400" />
                  Spese condominiali assegnate
                </h3>
                <Link to="/scadenze" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
                  Tutte <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-stone-50">
                {quoteSpese.slice(0, 6).map(q => {
                  const scad = new Date(q.spese_comuni.data_scadenza + 'T00:00:00')
                  const oggi = new Date()
                  const diff = differenceInDays(scad, oggi)
                  const scaduta = !q.completata && isBefore(scad, oggi)
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

      {/* Avviso unità non configurata */}
      {!profileLoading && !unita && (
        <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            La tua unità non è ancora configurata. Contatta l'amministratore per visualizzare le tue spese personali.
          </p>
        </div>
      )}

      {/* Guasti e pagamenti imminenti */}
      <div className="grid lg:grid-cols-2 gap-4">
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

        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h2 className="font-medium text-stone-700 text-sm">Pagamenti prossimi (30gg)</h2>
            <Link to="/scadenze" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
              Tutti <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-50">
            {loadingGlobal ? (
              <div className="p-4 text-sm text-stone-400">Caricamento...</div>
            ) : prossimePagamenti.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-sm">Nessun pagamento nei prossimi 30 giorni</div>
            ) : (
              prossimePagamenti.map(s => {
                const quota = s.importo && millesimi ? (s.importo * millesimi / 1000) : null
                return (
                  <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{s.titolo}</p>
                      <p className="text-xs text-stone-400">
                        {s.categoria}
                        {quota && <span className="ml-2 text-stone-500 font-medium">· Tua quota: €{quota.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex-shrink-0">
                      {format(new Date(s.data_scadenza + 'T00:00:00'), 'd MMM', { locale: it })}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="card p-4">
        <h2 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-3">Accesso rapido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { to: '/calendario', label: 'Segna disponibilità', icon: Calendar },
            { to: '/guasti', label: 'Segnala un guasto', icon: Wrench },
            { to: '/verbali', label: 'Carica verbale', icon: FileText },
            { to: '/obblighi', label: 'Aggiungi obbligo', icon: ClipboardList },
            { to: '/scadenze', label: 'Vai ai pagamenti', icon: Clock },
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
