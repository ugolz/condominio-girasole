import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isSameDay, addMonths, subMonths, parseISO,
  addDays, getDate, getMonth, isAfter, isBefore,
} from 'date-fns'
import { it } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Users, CheckCircle, Calendar, ClipboardList, Check,
} from 'lucide-react'

const UNITA = ['Interno 1', 'Interno 2', 'Interno 3', 'Interno 4', 'Interno 5', 'Interno 6']

const ricorrenzaLabel = {
  giornaliera: 'Ogni giorno', settimanale: 'Ogni settimana', mensile: 'Ogni mese',
  trimestrale: 'Ogni trimestre', annuale: 'Annuale', unica: 'Una tantum',
}

function getObbligoOccurrences(obbligo, month) {
  if (!obbligo.data_inizio || obbligo.completato) return []
  const start = parseISO(obbligo.data_inizio)
  const fine = obbligo.data_fine ? parseISO(obbligo.data_fine) : null
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  if (isAfter(start, monthEnd)) return []
  if (fine && isBefore(fine, monthStart)) return []

  const rangeEnd = fine && isBefore(fine, monthEnd) ? fine : monthEnd
  const monthDays = eachDayOfInterval({ start: monthStart, end: rangeEnd })
  const inRange = (d) => !isBefore(d, start) && (!fine || !isAfter(d, fine))

  switch (obbligo.ricorrenza) {
    case 'unica':       return monthDays.filter(d => isSameDay(d, start))
    case 'giornaliera': return monthDays.filter(inRange)
    case 'settimanale': {
      const days = []; let cur = start
      while (!isAfter(cur, rangeEnd)) { if (!isBefore(cur, monthStart)) days.push(cur); cur = addDays(cur, 7) }
      return days
    }
    case 'mensile': return monthDays.filter(d => getDate(d) === getDate(start) && inRange(d))
    case 'trimestrale': {
      const days = []; let cur = start
      while (!isAfter(cur, rangeEnd)) { if (!isBefore(cur, monthStart)) days.push(cur); cur = addMonths(cur, 3) }
      return days
    }
    case 'annuale':
      return monthDays.filter(d => getDate(d) === getDate(start) && getMonth(d) === getMonth(start) && inRange(d))
    default: return []
  }
}

export default function Calendario() {
  const { isAdmin } = useProfile()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [disponibilita, setDisponibilita] = useState([])
  const [obblighi, setObblighi] = useState([])
  const [assemblee, setAssemblee] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ data: '', ora: '10:00', unita: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)
  // Modal approvazione
  const [approvaModal, setApprovaModal] = useState(null) // { day, ora, note }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    fetchDisponibilita()
    fetchObblighi()
    fetchAssemblee()
  }, [currentMonth])

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
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('assemblee')
      .select('*')
      .gte('data', start)
      .lte('data', end)
    setAssemblee(data || [])
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7

  const dispForDay     = (day) => disponibilita.filter(d => isSameDay(parseISO(d.data), day))
  const obbligiForDay  = (day) => obblighi.filter(o => getObbligoOccurrences(o, currentMonth).some(d => isSameDay(d, day)))
  const assembleaForDay = (day) => assemblee.find(a => a.data === format(day, 'yyyy-MM-dd'))

  const handleDayClick = (day) => {
    setSelectedDay(day)
    setForm(f => ({ ...f, data: format(day, 'yyyy-MM-dd') }))
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
    await supabase.from('assemblee').delete().eq('id', id)
    fetchAssemblee()
  }

  const openApprovaModal = (day) => {
    const disps = dispForDay(day)
    // Pre-compila con l'orario più comune tra le disponibilità
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
      data: dateStr,
      ora,
      note: note || null,
      created_by: user?.id,
    })

    if (!error) {
      // Invia notifica a tutti gli utenti che hanno segnato disponibilità quel giorno
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

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Calendario</h1>
          <p className="text-stone-400 text-sm">Disponibilità assemblee e obblighi comuni</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Aggiungi disponibilità
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-terracotta-400 inline-block" /> Disponibilità
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sage-500 inline-block" /> Obbligo comune
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Assemblea confermata
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-ghost p-2">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-stone-700 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-ghost p-2">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-2">{d}</div>
            ))}
            {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`empty-${i}`} className="min-h-[5rem]" />)}
            {days.map(day => {
              const disp      = dispForDay(day)
              const obbli     = obbligiForDay(day)
              const assemblea = assembleaForDay(day)
              const isSelected    = selectedDay && isSameDay(day, selectedDay)
              const isCurrentDay  = isToday(day)

              const allEvents = [
                ...(assemblea ? [{ type: 'assemblea', label: `🗓 ${assemblea.ora}` }] : []),
                ...disp.map(d => ({ type: 'disp', label: d.unita || d.ora })),
                ...obbli.map(o => ({ type: 'obbligo', label: o.titolo })),
              ]
              const visible = allEvents.slice(0, 2)
              const extra   = allEvents.length - visible.length

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`relative flex flex-col rounded-lg p-1.5 transition-colors min-h-[5rem] text-left w-full
                    ${isSelected ? 'bg-terracotta-500' : 'hover:bg-stone-100'}
                    ${isCurrentDay && !isSelected ? 'ring-2 ring-inset ring-terracotta-400' : ''}
                  `}
                >
                  <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full mb-1 flex-shrink-0
                    ${isSelected ? 'text-white' : isCurrentDay ? 'bg-terracotta-500 text-white' : 'text-stone-600'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                    {visible.map((ev, i) => (
                      <span key={i} className={`text-[10px] font-medium px-1 py-0.5 rounded truncate leading-tight block
                        ${ev.type === 'assemblea'
                          ? isSelected ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
                          : ev.type === 'disp'
                            ? isSelected ? 'bg-white/25 text-white' : 'bg-terracotta-100 text-terracotta-700'
                            : isSelected ? 'bg-white/20 text-white' : 'bg-sage-100 text-sage-700'
                        }
                      `}>
                        {ev.label}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className={`text-[9px] font-medium pl-0.5 ${isSelected ? 'text-white/70' : 'text-stone-400'}`}>
                        +{extra} altri
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="card p-4 space-y-4 overflow-y-auto max-h-[600px]">
          {selectedDay ? (
            <>
              <h3 className="font-semibold text-stone-700 text-sm capitalize">
                {format(selectedDay, 'EEEE d MMMM', { locale: it })}
              </h3>

              {/* Assemblea confermata */}
              {(() => {
                const a = assembleaForDay(selectedDay)
                if (!a) return null
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Assemblea confermata
                        </p>
                        <p className="text-sm font-bold text-indigo-800 mt-0.5">Ore {a.ora}</p>
                        {a.note && <p className="text-xs text-indigo-600 mt-0.5">{a.note}</p>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDeleteAssemblea(a.id)} className="text-indigo-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Disponibilità */}
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Disponibilità ricevute
                </p>

                {dispForDay(selectedDay).length === 0 ? (
                  <p className="text-stone-400 text-xs">Nessuna segnata</p>
                ) : (
                  <div className="space-y-1.5">
                    {/* Riepilogo per unità */}
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {UNITA.map(u => {
                        const d = dispForDay(selectedDay).find(d => d.unita === u)
                        return (
                          <div key={u} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
                            ${d ? 'bg-sage-50 text-sage-700' : 'bg-stone-50 text-stone-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d ? 'bg-sage-500' : 'bg-stone-300'}`} />
                            <span className="truncate">{u.replace('Interno ', 'Int. ')}</span>
                            {d && <span className="ml-auto text-sage-500 text-[10px]">{d.ora}</span>}
                          </div>
                        )
                      })}
                    </div>

                    {/* Lista dettagliata */}
                    {dispForDay(selectedDay).map(d => (
                      <div key={d.id} className="flex items-center justify-between gap-2 px-2.5 py-2 bg-terracotta-50 rounded-lg">
                        <div>
                          <span className="text-xs font-semibold text-terracotta-700">{d.unita}</span>
                          <span className="text-xs text-stone-500 ml-2">{d.ora}{d.note && ` · ${d.note}`}</span>
                        </div>
                        <button onClick={() => handleDelete(d.id)} className="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setShowForm(true)} className="mt-2 w-full btn-secondary text-xs py-2">
                  + Aggiungi disponibilità
                </button>

                {/* Bottone approva (admin, solo se c'è almeno 1 disponibilità e non già approvata) */}
                {isAdmin && dispForDay(selectedDay).length > 0 && !assembleaForDay(selectedDay) && (
                  <button
                    onClick={() => openApprovaModal(selectedDay)}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approva come data assemblea
                  </button>
                )}
              </div>

              {/* Obblighi */}
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Obblighi comuni
                </p>
                <div className="space-y-2">
                  {obbligiForDay(selectedDay).length === 0 ? (
                    <p className="text-stone-400 text-xs">Nessun obbligo</p>
                  ) : (
                    obbligiForDay(selectedDay).map(o => (
                      <div key={o.id} className="p-2.5 bg-sage-50 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-sage-600" />
                          <span className="text-xs font-semibold text-sage-700">{o.titolo}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {o.categoria}{o.assegnato_a && ` · ${o.assegnato_a}`} · {ricorrenzaLabel[o.ricorrenza]}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-stone-200 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">Clicca su un giorno per vedere gli eventi</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary disponibilità */}
      <div className="card p-4">
        <h3 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-sage-500" />
          Disponibilità questo mese per unità
        </h3>
        <div className="flex flex-wrap gap-2">
          {UNITA.map(u => {
            const count = disponibilita.filter(d => d.unita === u).length
            return (
              <div key={u} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${count > 0 ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-stone-50 text-stone-400 border-stone-200'}`}>
                {u}: {count} {count === 1 ? 'data' : 'date'}
              </div>
            )
          })}
        </div>
      </div>

      {/* Assemblee confermate questo mese */}
      {assemblee.length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-indigo-500" />
            Assemblee confermate questo mese
          </h3>
          <div className="flex flex-wrap gap-2">
            {assemblee.map(a => (
              <div key={a.id} className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200">
                {format(parseISO(a.data + 'T00:00:00'), 'd MMMM', { locale: it })} · ore {a.ora}
                {a.note && <span className="text-indigo-500"> · {a.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Obblighi attivi questo mese */}
      {obblighi.some(o => getObbligoOccurrences(o, currentMonth).length > 0) && (
        <div className="card p-4">
          <h3 className="font-medium text-stone-600 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-sage-500" />
            Obblighi attivi questo mese
          </h3>
          <div className="flex flex-wrap gap-2">
            {obblighi
              .filter(o => getObbligoOccurrences(o, currentMonth).length > 0)
              .map(o => (
                <div key={o.id} className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-sage-50 text-sage-700 border-sage-200">
                  {o.titolo}{o.assegnato_a ? ` — ${o.assegnato_a}` : ''}
                </div>
              ))
            }
          </div>
        </div>
      )}

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
                <label className="label">Unità / Interno</label>
                <select value={form.unita} onChange={e => setForm(f => ({ ...f, unita: e.target.value }))} className="input" required>
                  <option value="">Seleziona...</option>
                  {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
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
            <p className="text-sm text-stone-500 mb-4 capitalize">
              {format(approvaModal.day, 'EEEE d MMMM yyyy', { locale: it })}
            </p>
            <p className="text-xs text-stone-400 mb-4">
              Verrà inviata una notifica a {dispForDay(approvaModal.day).length} {dispForDay(approvaModal.day).length === 1 ? 'condomino disponibile' : 'condomini disponibili'}.
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
