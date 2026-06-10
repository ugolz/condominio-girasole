import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isSameDay, addMonths, subMonths, parseISO,
  isAfter, isBefore, startOfDay,
} from 'date-fns'
import { it } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Users, CheckCircle, Calendar, ClipboardList, Check, X,
} from 'lucide-react'

function getObbligoOccurrences(obbligo, month) {
  if (obbligo.completato) return []
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  // Senza data_inizio: l'obbligo è sempre attivo (appare ogni giorno del mese)
  if (!obbligo.data_inizio) {
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
  }

  const start = startOfDay(parseISO(obbligo.data_inizio))
  const fine = obbligo.data_fine ? startOfDay(parseISO(obbligo.data_fine)) : null

  if (isAfter(start, monthEnd)) return []
  if (fine && isBefore(fine, monthStart)) return []

  // Se c'è solo data_inizio (nessuna data_fine): mostra solo quel giorno
  if (!fine) return [start].filter(d => !isBefore(d, monthStart) && !isAfter(d, monthEnd))

  // Con data_inizio e data_fine: appare su tutti i giorni dell'intervallo
  const rangeStart = isBefore(start, monthStart) ? monthStart : start
  const rangeEnd   = isAfter(fine, monthEnd) ? monthEnd : fine
  return eachDayOfInterval({ start: rangeStart, end: rangeEnd })
}

export default function Calendario() {
  const { isAdmin, unita: profiloUnita } = useProfile()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [disponibilita, setDisponibilita] = useState([])
  const [obblighi, setObblighi] = useState([])
  const [assemblee, setAssemblee] = useState([])
  const [profili, setProfili] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ data: '', ora: '10:00', unita: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)
  const [approvaModal, setApprovaModal] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    fetchDisponibilita()
    fetchObblighi()
    fetchAssemblee()
  }, [currentMonth])

  useEffect(() => {
    supabase.from('profiles').select('user_id, nome, cognome, email')
      .then(({ data }) => setProfili(data || []))
  }, [])

  const nomeDisp = (d) => {
    const p = profili.find(pr => pr.user_id === d.user_id)
    if (!p) return d.unita || 'Sconosciuto'
    const full = [p.nome, p.cognome].filter(Boolean).join(' ')
    return full || p.email
  }

  const fetchDisponibilita = async () => {
    const { data } = await supabase
      .from('disponibilita_assemblee')
      .select('*')
      .gte('data', startOfMonth(currentMonth).toISOString())
      .lte('data', endOfMonth(currentMonth).toISOString())
      .order('data')
    setDisponibilita(data || [])
  }

  const fetchObblighi = async () => {
    const { data } = await supabase.from('obblighi').select('*').eq('completato', false)
    setObblighi(data || [])
  }

  const fetchAssemblee = async () => {
    const s = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const e = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase.from('assemblee').select('*').gte('data', s).lte('data', e)
    setAssemblee(data || [])
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7

  const dispForDay = (day) => disponibilita.filter(d => isSameDay(parseISO(d.data), day))

  // Confronto per stringa evita qualsiasi problema di timezone con le date degli obblighi
  const obbligiForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return obblighi.filter(o =>
      getObbligoOccurrences(o, currentMonth).some(d => format(d, 'yyyy-MM-dd') === dayStr)
    )
  }

  const assembleaForDay = (day) => assemblee.find(a => a.data === format(day, 'yyyy-MM-dd'))

  const handleDayClick = (day) => {
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null)
    } else {
      setSelectedDay(day)
      setForm(f => ({ ...f, data: format(day, 'yyyy-MM-dd') }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('disponibilita_assemblee').insert({
      data: new Date(`${form.data}T${form.ora}`).toISOString(),
      ora: form.ora,
      unita: form.unita,
      note: form.note,
      user_id: session?.user?.id,
    })
    if (!error) {
      setShowForm(false)
      setForm({ data: '', ora: '10:00', unita: '', note: '' })
      fetchDisponibilita()
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('disponibilita_assemblee').delete().eq('id', id)
    fetchDisponibilita()
  }

  const handleDeleteAssemblea = async (id) => {
    // Recupera i dati prima di eliminare per poter notificare
    const assemblea = assemblee.find(a => a.id === id)
    await supabase.from('assemblee').delete().eq('id', id)

    if (assemblea) {
      const dayDate = parseISO(assemblea.data + 'T00:00:00')
      const disps = disponibilita.filter(d => isSameDay(parseISO(d.data), dayDate))
      const userIds = [...new Set(disps.filter(d => d.user_id).map(d => d.user_id))]
      for (const uid of userIds) {
        await supabase.from('notifiche').insert({
          user_id: uid,
          titolo: 'Assemblea annullata ❌',
          messaggio: `L'assemblea del ${format(dayDate, 'd MMMM yyyy', { locale: it })} (ore ${assemblea.ora}) è stata annullata dall'amministratore.`,
        })
      }
    }

    fetchAssemblee()
  }

  const openApprovaModal = (day) => {
    const disps = dispForDay(day)
    const counts = {}
    disps.forEach(d => { counts[d.ora] = (counts[d.ora] || 0) + 1 })
    const oraDefault = Object.keys(counts).length > 0
      ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
      : '10:00'
    setApprovaModal({ day, ora: oraDefault, note: '' })
  }

  const handleApprovaSubmit = async (e) => {
    e.preventDefault()
    const { day, ora, note } = approvaModal
    const dateStr = format(day, 'yyyy-MM-dd')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('assemblee').insert({
      data: dateStr, ora, note: note || null, created_by: user?.id,
    })
    if (!error) {
      const disps = dispForDay(day)
      const userIds = [...new Set(disps.filter(d => d.user_id).map(d => d.user_id))]
      for (const uid of userIds) {
        await supabase.from('notifiche').insert({
          user_id: uid,
          titolo: 'Assemblea confermata 📅',
          messaggio: `L'assemblea condominiale è confermata per il ${format(day, 'd MMMM yyyy', { locale: it })} alle ore ${ora}.${note ? ' ' + note : ''}`,
        })
      }
      setApprovaModal(null)
      fetchAssemblee()
    }
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  const selDisp = selectedDay ? dispForDay(selectedDay) : []
  const selObbli = selectedDay ? obbligiForDay(selectedDay) : []
  const selAssemblea = selectedDay ? assembleaForDay(selectedDay) : null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Calendario</h1>
          <p className="text-stone-400 text-sm">Disponibilità assemblee e obblighi comuni</p>
        </div>
        <button onClick={() => { setForm(f => ({ ...f, unita: profiloUnita || '' })); setShowForm(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Aggiungi disponibilità
        </button>
      </div>

      {/* Legenda */}
      <div className="flex items-center flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-indigo-400 inline-block" /> Assemblea confermata
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-sage-500 inline-block" /> Obbligo comune
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-terracotta-400 inline-block" /> Disponibilità assemblea
        </span>
      </div>

      {/* Calendario full-width */}
      <div className="card p-4">
        {/* Navigazione mese */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-ghost p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-stone-700 capitalize text-base">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-ghost p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Intestazione giorni settimana */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-stone-400 py-2 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Griglia giorni — celle arrotondate con gap */}
        <div className="grid grid-cols-7 gap-1">
          {Array(firstDayOfWeek).fill(null).map((_, i) => (
            <div key={`e-${i}`} className="min-h-[6rem]" />
          ))}
          {days.map(day => {
            const disp      = dispForDay(day)
            const obbli     = obbligiForDay(day)
            const assemblea = assembleaForDay(day)
            const isSelected   = selectedDay && isSameDay(day, selectedDay)
            const isCurrentDay = isToday(day)

            // Priorità: assemblea > obblighi > disponibilità
            const allEvents = [
              ...(assemblea ? [{ type: 'assemblea', label: `Ore ${assemblea.ora}` }] : []),
              ...obbli.map(o => ({ type: 'obbligo', label: o.titolo })),
              ...disp.map(d => ({ type: 'disp', label: d.unita || `Disp. ${d.ora}` })),
            ]
            const visible = allEvents.slice(0, 3)
            const extra   = allEvents.length - visible.length

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  flex flex-col p-1.5 rounded-lg text-left transition-colors min-h-[6rem] w-full
                  ${isSelected
                    ? 'bg-terracotta-50 ring-1 ring-terracotta-300'
                    : 'hover:bg-stone-100'
                  }
                `}
              >
                {/* Numero giorno */}
                <span className={`
                  text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 flex-shrink-0
                  ${isSelected || isCurrentDay
                    ? 'bg-terracotta-500 text-white'
                    : 'text-stone-600'
                  }
                `}>
                  {format(day, 'd')}
                </span>

                {/* Pillole eventi */}
                <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                  {visible.map((ev, i) => (
                    <span key={i} className={`
                      text-[10px] font-medium px-1 py-0.5 rounded truncate leading-tight block
                      ${ev.type === 'assemblea'
                        ? 'bg-indigo-100 text-indigo-700'
                        : ev.type === 'obbligo'
                          ? 'bg-sage-100 text-sage-700'
                          : 'bg-terracotta-100 text-terracotta-700'
                      }
                    `}>
                      {ev.label}
                    </span>
                  ))}
                  {extra > 0 && (
                    <span className="text-[9px] pl-0.5 text-stone-400">
                      +{extra} altri
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pannello dettaglio giorno (sotto il calendario) */}
      {selectedDay && (
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-800 text-base capitalize">
              {format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="text-stone-400 hover:text-stone-600 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Colonna sinistra: assemblea + disponibilità */}
            <div className="space-y-4">
              {/* Assemblea confermata */}
              {selAssemblea && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                        <Check className="w-3.5 h-3.5" /> Assemblea confermata
                      </p>
                      <p className="text-xl font-bold text-indigo-800">Ore {selAssemblea.ora}</p>
                      {selAssemblea.note && <p className="text-sm text-indigo-600 mt-1">{selAssemblea.note}</p>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteAssemblea(selAssemblea.id)} className="text-indigo-300 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Disponibilità */}
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <Users className="w-3.5 h-3.5" /> Disponibilità ({selDisp.length})
                </p>

                {selDisp.length === 0 ? (
                  <p className="text-stone-400 text-sm">Nessuna disponibilità segnata</p>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      {selDisp.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-sage-50 rounded-lg border border-sage-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-sage-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-sage-800 truncate">{nomeDisp(d)}</span>
                            <span className="text-xs text-stone-400 flex-shrink-0">{d.ora}{d.note && ` · ${d.note}`}</span>
                          </div>
                          <button onClick={() => handleDelete(d.id)} className="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setForm(f => ({ ...f, unita: profiloUnita || '' })); setShowForm(true) }} className="btn-secondary text-sm py-2 flex-1">
                    + Aggiungi disponibilità
                  </button>
                  {isAdmin && selDisp.length > 0 && !selAssemblea && (
                    <button
                      onClick={() => openApprovaModal(selectedDay)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approva assemblea
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Colonna destra: obblighi */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <ClipboardList className="w-3.5 h-3.5" /> Obblighi comuni ({selObbli.length})
              </p>
              {selObbli.length === 0 ? (
                <div className="flex items-center gap-2 text-stone-400 text-sm py-3">
                  <ClipboardList className="w-4 h-4" />
                  Nessun obbligo per questo giorno
                </div>
              ) : (
                <div className="space-y-2">
                  {selObbli.map(o => (
                    <div key={o.id} className="p-3 bg-sage-50 rounded-xl border border-sage-100">
                      <p className="text-sm font-semibold text-sage-800">{o.titolo}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        {o.categoria && (
                          <span className="text-[11px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded font-medium">
                            {o.categoria}
                          </span>
                        )}
                        {o.assegnato_a && <span className="text-[11px] text-stone-500">· {o.assegnato_a}</span>}
                        {o.data_fine && <span className="text-[11px] text-stone-400">fino al {format(parseISO(o.data_fine + 'T00:00:00'), 'd MMM yyyy', { locale: it })}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Riepilogo inferiore */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Disponibilità per unità */}
        <div className="card p-4">
          <h3 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-sage-500" /> Disponibilità questo mese
          </h3>
          <div className="flex flex-wrap gap-2">
            {profili.map(p => {
              const count = disponibilita.filter(d => d.user_id === p.user_id).length
              const nome = [p.nome, p.cognome].filter(Boolean).join(' ') || p.email
              return (
                <div key={p.user_id} className={`px-3 py-1.5 rounded-lg text-xs font-medium border
                  ${count > 0 ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-stone-50 text-stone-400 border-stone-200'}`}>
                  {nome}: {count} {count === 1 ? 'data' : 'date'}
                </div>
              )
            })}
          </div>
        </div>

        {/* Assemblee + obblighi attivi */}
        <div className="card p-4 space-y-3">
          {assemblee.length > 0 && (
            <div>
              <h3 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-500" /> Assemblee confermate
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {assemblee.map(a => (
                  <div key={a.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {format(parseISO(a.data + 'T00:00:00'), 'd MMM', { locale: it })} · ore {a.ora}
                  </div>
                ))}
              </div>
            </div>
          )}
          {obblighi.some(o => getObbligoOccurrences(o, currentMonth).length > 0) && (
            <div>
              <h3 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-sage-500" /> Obblighi attivi questo mese
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {obblighi
                  .filter(o => getObbligoOccurrences(o, currentMonth).length > 0)
                  .map(o => (
                    <div key={o.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-sage-50 text-sage-700 border border-sage-200">
                      {o.titolo}
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          {assemblee.length === 0 && !obblighi.some(o => getObbligoOccurrences(o, currentMonth).length > 0) && (
            <div className="flex items-center gap-2 text-stone-400 text-sm">
              <Calendar className="w-4 h-4" /> Nessun evento confermato questo mese
            </div>
          )}
        </div>
      </div>

      {/* Modal: aggiungi disponibilità */}
      {showForm && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-stone-800 mb-4">Aggiungi disponibilità assemblea</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Data</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="input" required min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div>
                <label className="label">Orario preferito</label>
                <input type="time" value={form.ora} onChange={e => setForm(f => ({ ...f, ora: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="label">Note (opzionale)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" placeholder="es. solo mattina" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annulla</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: approva assemblea */}
      {approvaModal && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-stone-800 mb-1">Approva data assemblea</h3>
            <p className="text-sm text-stone-500 mb-1 capitalize">
              {format(approvaModal.day, 'EEEE d MMMM yyyy', { locale: it })}
            </p>
            <p className="text-xs text-stone-400 mb-4">
              Notifica a {dispForDay(approvaModal.day).length} {dispForDay(approvaModal.day).length === 1 ? 'condomino disponibile' : 'condomini disponibili'}.
            </p>
            <form onSubmit={handleApprovaSubmit} className="space-y-4">
              <div>
                <label className="label">Orario assemblea</label>
                <input
                  type="time"
                  value={approvaModal.ora}
                  onChange={e => setApprovaModal(m => ({ ...m, ora: e.target.value }))}
                  className="input"
                  required
                />
                <p className="text-xs text-stone-400 mt-1">Pre-compilato con l'orario più comune tra le disponibilità</p>
              </div>
              <div>
                <label className="label">Comunicazione aggiuntiva (opzionale)</label>
                <textarea
                  value={approvaModal.note}
                  onChange={e => setApprovaModal(m => ({ ...m, note: e.target.value }))}
                  className="input h-16 resize-none"
                  placeholder="es. Ordine del giorno: approvazione bilancio..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setApprovaModal(null)} className="btn-secondary flex-1">Annulla</button>
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
                  <Check className="w-4 h-4" /> Conferma e notifica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
