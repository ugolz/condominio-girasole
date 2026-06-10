import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Calendar, ClipboardList, Clock, Wrench, FileText, ChevronRight, AlertTriangle } from 'lucide-react'
import { format, isAfter, addDays } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Dashboard() {
  const [stats, setStats] = useState({ guastiAperti: 0, scadenzeVicine: 0, prossimeAssemblee: 0, obblighiPendenti: 0 })
  const [recentGuasti, setRecentGuasti] = useState([])
  const [prossimeScadenze, setProssimeScadenze] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date()
      const in30giorni = addDays(today, 30)

      const [guastiRes, scadenzeRes, assembleeRes, obblighiRes] = await Promise.all([
        supabase.from('guasti').select('id, titolo, priorita, created_at').eq('stato', 'aperto').order('created_at', { ascending: false }).limit(4),
        supabase.from('scadenze').select('id, titolo, data_scadenza, categoria').gte('data_scadenza', today.toISOString()).lte('data_scadenza', in30giorni.toISOString()).order('data_scadenza').limit(5),
        supabase.from('disponibilita_assemblee').select('id').gte('data', today.toISOString()),
        supabase.from('obblighi').select('id').eq('completato', false),
      ])

      setRecentGuasti(guastiRes.data || [])
      setProssimeScadenze(scadenzeRes.data || [])
      setStats({
        guastiAperti: guastiRes.data?.length || 0,
        scadenzeVicine: scadenzeRes.data?.length || 0,
        prossimeAssemblee: assembleeRes.data?.length || 0,
        obblighiPendenti: obblighiRes.data?.length || 0,
      })
      setLoading(false)
    }
    fetchData()
  }, [])

  const statCards = [
    { label: 'Guasti aperti', value: stats.guastiAperti, icon: Wrench, to: '/guasti', color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Scadenze vicine', value: stats.scadenzeVicine, icon: Clock, to: '/scadenze', color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Disponibilità assemblee', value: stats.prossimeAssemblee, icon: Calendar, to: '/calendario', color: 'text-terracotta-500', bg: 'bg-terracotta-50' },
    { label: 'Obblighi pendenti', value: stats.obblighiPendenti, icon: ClipboardList, to: '/obblighi', color: 'text-sage-600', bg: 'bg-sage-50' },
  ]

  const prioritaLabel = { alta: 'Urgente', media: 'Media', bassa: 'Bassa' }
  const prioritaClass = { alta: 'badge-urgent', media: 'badge-pending', bassa: 'badge-done' }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-800">Panoramica</h1>
        <p className="text-stone-400 text-sm mt-0.5">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, to, color, bg }) => (
          <Link key={to} to={to} className="card p-4 hover:shadow-md transition-shadow group">
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-stone-800">{loading ? '—' : value}</p>
            <p className="text-xs text-stone-400 mt-0.5 leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Guasti recenti */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h2 className="font-medium text-stone-700 text-sm">Guasti aperti</h2>
            <Link to="/guasti" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
              Tutti <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-50">
            {loading ? (
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

        {/* Prossime scadenze */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h2 className="font-medium text-stone-700 text-sm">Scadenze prossime (30gg)</h2>
            <Link to="/scadenze" className="text-xs text-terracotta-600 hover:underline flex items-center gap-1">
              Tutte <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-50">
            {loading ? (
              <div className="p-4 text-sm text-stone-400">Caricamento...</div>
            ) : prossimeScadenze.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-sm">Nessuna scadenza nei prossimi 30 giorni</div>
            ) : (
              prossimeScadenze.map(s => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{s.titolo}</p>
                    <p className="text-xs text-stone-400">{s.categoria}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {format(new Date(s.data_scadenza), 'd MMM', { locale: it })}
                  </span>
                </div>
              ))
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
            { to: '/scadenze', label: 'Nuova scadenza', icon: Clock },
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
