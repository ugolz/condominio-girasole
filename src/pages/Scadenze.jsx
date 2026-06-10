import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { CheckCircle, Clock, AlertTriangle, Receipt, TrendingDown, CheckCircle2 } from 'lucide-react'
import { format, isBefore, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { useToast } from '../components/Toast'

export default function Scadenze() {
  const { unita, loading: profileLoading } = useProfile()
  const toast = useToast()

  const [quoteSpese, setQuoteSpese] = useState([])
  const [millesimi, setMillesimi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('tutte')

  useEffect(() => {
    if (profileLoading) return
    if (!unita) { setLoading(false); return }
    fetchData()
  }, [unita, profileLoading])

  const fetchData = async () => {
    setLoading(true)
    const [millRes, quoteRes] = await Promise.all([
      supabase.from('millesimi_config').select('valore').eq('unita', unita).single(),
      supabase.from('quote_spese')
        .select('*, spese_comuni(titolo, categoria, data_scadenza, importo_totale, note)')
        .eq('unita', unita)
        .order('spese_comuni(data_scadenza)'),
    ])
    setMillesimi(millRes.data?.valore ?? null)
    setQuoteSpese(quoteRes.data || [])
    setLoading(false)
  }

  const toggleQuota = async (id, completata) => {
    const nuovoStato = !completata
    setQuoteSpese(prev => prev.map(q =>
      q.id === id ? { ...q, completata: nuovoStato, completata_il: nuovoStato ? new Date().toISOString() : null } : q
    ))
    const { error } = await supabase.from('quote_spese').update({
      completata: nuovoStato,
      completata_il: nuovoStato ? new Date().toISOString() : null,
    }).eq('id', id)
    if (error) {
      setQuoteSpese(prev => prev.map(q => q.id === id ? { ...q, completata, completata_il: q.completata_il } : q))
      toast.error('Errore durante l\'aggiornamento.')
    } else {
      toast.success(nuovoStato ? 'Spesa segnata come pagata.' : 'Spesa riaperta.')
    }
  }

  const getStatus = (q) => {
    const scad = new Date(q.spese_comuni.data_scadenza + 'T00:00:00')
    const today = new Date()
    if (q.completata) return { label: 'Pagata', cls: 'badge-done', icon: CheckCircle }
    if (isBefore(scad, today)) return { label: 'Scaduta', cls: 'badge-urgent', icon: AlertTriangle }
    const diff = differenceInDays(scad, today)
    if (diff <= 7)  return { label: `${diff}gg`, cls: 'badge-urgent', icon: AlertTriangle }
    if (diff <= 30) return { label: `${diff}gg`, cls: 'badge-pending', icon: Clock }
    return { label: `${diff}gg`, cls: '', icon: Clock }
  }

  const scad = (q) => new Date(q.spese_comuni.data_scadenza + 'T00:00:00')
  const today = new Date()

  const filtered = quoteSpese.filter(q => {
    if (filtro === 'da_pagare') return !q.completata && !isBefore(scad(q), today)
    if (filtro === 'scadute')   return !q.completata && isBefore(scad(q), today)
    if (filtro === 'pagate')    return q.completata
    return true
  })

  const countDaPagare = quoteSpese.filter(q => !q.completata && !isBefore(scad(q), today)).length
  const countScadute  = quoteSpese.filter(q => !q.completata && isBefore(scad(q), today)).length
  const countPagate   = quoteSpese.filter(q => q.completata).length
  const totaleDovuto  = quoteSpese.filter(q => !q.completata).reduce((s, q) => s + Number(q.importo_quota), 0)
  const totalePagato  = quoteSpese.filter(q => q.completata).reduce((s, q) => s + Number(q.importo_quota), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-800">Pagamenti</h1>
        <p className="text-stone-400 text-sm">
          {unita ? `Le tue quote condominiali — ${unita}${millesimi ? ` · ${millesimi} millesimi` : ''}` : 'Quote condominiali personali'}
        </p>
      </div>

      {/* Unità non configurata */}
      {!profileLoading && !unita && (
        <div className="card p-6 text-center">
          <Clock className="w-8 h-8 text-stone-200 mx-auto mb-2" />
          <p className="text-stone-500 text-sm font-medium">Unità non ancora configurata</p>
          <p className="text-stone-400 text-xs mt-1">Contatta l'amministratore per visualizzare le tue quote.</p>
        </div>
      )}

      {unita && !loading && quoteSpese.length > 0 && (
        <>
          {/* Totali */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 border-l-4 border-amber-400">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Da pagare</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                €{totaleDovuto.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{countDaPagare + countScadute} {(countDaPagare + countScadute) === 1 ? 'quota' : 'quote'} in sospeso</p>
            </div>
            <div className="card p-4 border-l-4 border-sage-400">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-sage-500" />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Già pagato</span>
              </div>
              <p className="text-2xl font-bold text-sage-600">
                €{totalePagato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{countPagate} {countPagate === 1 ? 'quota' : 'quote'} saldate</p>
            </div>
          </div>

          {/* Counter + filtro */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Da pagare', count: countDaPagare, color: 'text-amber-600' },
              { label: 'Scadute',   count: countScadute,  color: 'text-red-500'   },
              { label: 'Pagate',    count: countPagate,   color: 'text-sage-600'  },
            ].map(({ label, count, color }) => (
              <div key={label} className="card p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-stone-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
            {[['tutte', 'Tutte'], ['da_pagare', 'Da pagare'], ['scadute', 'Scadute'], ['pagate', 'Pagate']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filtro === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                {l}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Lista quote */}
      {loading ? (
        <div className="card p-6 text-center text-stone-400 text-sm">Caricamento...</div>
      ) : unita && filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Receipt className="w-8 h-8 text-stone-200 mx-auto mb-2" />
          <p className="text-stone-400 text-sm">
            {quoteSpese.length === 0 ? 'Nessuna spesa condominiale assegnata' : 'Nessuna quota in questa categoria'}
          </p>
        </div>
      ) : unita ? (
        <div className="space-y-2">
          {filtered.map(q => {
            const status = getStatus(q)
            const s = q.spese_comuni
            const scadData = new Date(s.data_scadenza + 'T00:00:00')
            const scaduta = !q.completata && isBefore(scadData, today)
            return (
              <div key={q.id} className={`card p-4 flex items-start gap-3 ${q.completata ? 'opacity-60' : ''}`}>
                <button
                  onClick={() => toggleQuota(q.id, q.completata)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                    ${q.completata ? 'bg-sage-500 border-sage-500' : 'border-stone-300 hover:border-sage-400'}`}
                >
                  {q.completata && <CheckCircle className="w-3 h-3 text-white fill-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${q.completata ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      {s.titolo}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">{s.categoria}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-stone-400">
                    <span>📅 {format(scadData, 'd MMMM yyyy', { locale: it })}</span>
                    <span className={`font-semibold ${q.completata ? 'text-sage-600' : scaduta ? 'text-red-500' : 'text-stone-700'}`}>
                      💶 €{Number(q.importo_quota).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      <span className="font-normal text-stone-400 ml-1">({q.millesimi} mill.)</span>
                    </span>
                  </div>
                  {s.note && <p className="text-xs text-stone-400 mt-0.5">{s.note}</p>}
                  {q.completata && q.completata_il && (
                    <p className="text-xs text-sage-500 mt-0.5">
                      Pagata il {format(new Date(q.completata_il), 'd MMMM yyyy', { locale: it })}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {status.cls ? <span className={status.cls}>{status.label}</span> : (
                    <span className="text-xs text-stone-400">{status.label}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
