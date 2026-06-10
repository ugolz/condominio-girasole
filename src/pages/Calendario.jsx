import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Users, CheckCircle, Calendar } from 'lucide-react'

const UNITA = ['Interno 1', 'Interno 2', 'Interno 3', 'Interno 4', 'Interno 5', 'Interno 6']

export default function Calendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [disponibilita, setDisponibilita] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ data: '', ora: '10:00', unita: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    fetchDisponibilita()
  }, [currentMonth])

  const fetchDisponibilita = async () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const { data } = await supabase
      .from('disponibilita_assemblee')
      .select('*')
      .gte('data', start.toISOString())
      .lte('data', end.toISOString())
      .order('data')
    setDisponibilita(data || [])
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7 // Monday=0

  const dispForDay = (day) => disponibilita.filter(d => isSameDay(parseISO(d.data), day))

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

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Calendario Assemblee</h1>
          <p className="text-stone-400 text-sm">Segna la tua disponibilità per le assemblee condominiali</p>
        </div>
        <button onClick={() => { setShowForm(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Aggiungi disponibilità
        </button>
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

          {/* Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-2">{d}</div>
            ))}
            {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const disp = dispForDay(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors
                    ${isToday(day) ? 'ring-2 ring-terracotta-400' : ''}
                    ${isSelected ? 'bg-terracotta-500 text-white' : 'hover:bg-stone-100 text-stone-700'}
                  `}
                >
                  <span className="text-xs font-medium">{format(day, 'd')}</span>
                  {disp.length > 0 && (
                    <div className={`flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full`}>
                      {disp.slice(0, 3).map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-terracotta-400'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar - selected day */}
        <div className="card p-4">
          {selectedDay ? (
            <>
              <h3 className="font-semibold text-stone-700 text-sm mb-1 capitalize">
                {format(selectedDay, 'EEEE d MMMM', { locale: it })}
              </h3>
              <div className="space-y-2 mt-3">
                {dispForDay(selectedDay).length === 0 ? (
                  <p className="text-stone-400 text-sm">Nessuna disponibilità segnata</p>
                ) : (
                  dispForDay(selectedDay).map(d => (
                    <div key={d.id} className="flex items-start justify-between gap-2 p-2.5 bg-terracotta-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-terracotta-500" />
                          <span className="text-xs font-semibold text-terracotta-700">{d.unita}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{d.ora} {d.note && `· ${d.note}`}</p>
                      </div>
                      <button onClick={() => handleDelete(d.id)} className="text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 w-full btn-secondary text-xs py-2"
              >
                + Aggiungi per questo giorno
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-stone-200 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">Clicca su un giorno per vedere le disponibilità</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
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

      {/* Modal Form */}
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
    </div>
  )
}
