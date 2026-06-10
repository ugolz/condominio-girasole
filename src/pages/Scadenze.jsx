import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'

const CATEGORIE = ['Rate condominiali', 'Assicurazione', 'Revisione ascensore', 'Caldaia', 'Antincendio', 'Bollette', 'Tasse', 'Altro']

export default function Scadenze() {
  const [scadenze, setScadenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('future')
  const [form, setForm] = useState({ titolo: '', descrizione: '', categoria: 'Rate condominiali', data_scadenza: '', importo: '', completata: false })

  useEffect(() => { fetchScadenze() }, [])

  const fetchScadenze = async () => {
    const { data } = await supabase.from('scadenze').select('*').order('data_scadenza')
    setScadenze(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('scadenze').insert({ ...form, importo: form.importo ? parseFloat(form.importo) : null })
    if (!error) { setShowForm(false); setForm({ titolo: '', descrizione: '', categoria: 'Rate condominiali', data_scadenza: '', importo: '', completata: false }); fetchScadenze() }
  }

  const toggleCompletata = async (id, completata) => {
    await supabase.from('scadenze').update({ completata: !completata }).eq('id', id)
    fetchScadenze()
  }

  const handleDelete = async (id) => {
    if (confirm('Eliminare questa scadenza?')) { await supabase.from('scadenze').delete().eq('id', id); fetchScadenze() }
  }

  const getStatus = (s) => {
    const today = new Date()
    const scad = new Date(s.data_scadenza)
    if (s.completata) return { label: 'Completata', cls: 'badge-done', icon: CheckCircle, iconCls: 'text-sage-500' }
    if (isBefore(scad, today)) return { label: 'Scaduta', cls: 'badge-urgent', icon: AlertTriangle, iconCls: 'text-red-500' }
    const diff = differenceInDays(scad, today)
    if (diff <= 7) return { label: `${diff}gg`, cls: 'badge-urgent', icon: AlertTriangle, iconCls: 'text-amber-500' }
    if (diff <= 30) return { label: `${diff}gg`, cls: 'badge-pending', icon: Clock, iconCls: 'text-amber-400' }
    return { label: `${diff}gg`, cls: '', icon: Clock, iconCls: 'text-stone-300' }
  }

  const filtered = scadenze.filter(s => {
    const today = new Date()
    if (filtro === 'future') return !s.completata && isAfter(new Date(s.data_scadenza), today)
    if (filtro === 'scadute') return !s.completata && isBefore(new Date(s.data_scadenza), today)
    if (filtro === 'completate') return s.completata
    return true
  })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Scadenze</h1>
          <p className="text-stone-400 text-sm">Rate, revisioni e pagamenti condominiali</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuova scadenza
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In scadenza (30gg)', count: scadenze.filter(s => !s.completata && differenceInDays(new Date(s.data_scadenza), new Date()) <= 30 && differenceInDays(new Date(s.data_scadenza), new Date()) >= 0).length, color: 'text-amber-600' },
          { label: 'Scadute', count: scadenze.filter(s => !s.completata && isBefore(new Date(s.data_scadenza), new Date())).length, color: 'text-red-500' },
          { label: 'Completate', count: scadenze.filter(s => s.completata).length, color: 'text-sage-600' },
        ].map(({ label, count, color }) => (
          <div key={label} className="card p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-stone-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {[['future', 'Future'], ['scadute', 'Scadute'], ['completate', 'Completate'], ['tutte', 'Tutte']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filtro === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="card p-6 text-center text-stone-400 text-sm">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Clock className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-stone-400 text-sm">Nessuna scadenza in questa categoria</p>
          </div>
        ) : (
          filtered.map(s => {
            const status = getStatus(s)
            const StatusIcon = status.icon
            return (
              <div key={s.id} className={`card p-4 flex items-start gap-3 ${s.completata ? 'opacity-60' : ''}`}>
                <button onClick={() => toggleCompletata(s.id, s.completata)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${s.completata ? 'bg-sage-500 border-sage-500' : 'border-stone-300 hover:border-sage-400'}`}>
                  {s.completata && <CheckCircle className="w-3 h-3 text-white fill-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${s.completata ? 'line-through text-stone-400' : 'text-stone-800'}`}>{s.titolo}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">{s.categoria}</span>
                  </div>
                  {s.descrizione && <p className="text-xs text-stone-400 mt-0.5">{s.descrizione}</p>}
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-stone-400">
                    <span>📅 {format(new Date(s.data_scadenza), 'd MMMM yyyy', { locale: it })}</span>
                    {s.importo && <span>💶 €{s.importo.toLocaleString('it-IT')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {status.cls && <span className={status.cls}>{status.label}</span>}
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-stone-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-stone-800 mb-4">Nuova scadenza</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Titolo *</label>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" placeholder="es. Revisione ascensore" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input">
                    {CATEGORIE.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Data scadenza *</label>
                  <input type="date" value={form.data_scadenza} onChange={e => setForm(f => ({ ...f, data_scadenza: e.target.value }))} className="input" required />
                </div>
              </div>
              <div>
                <label className="label">Importo (€)</label>
                <input type="number" step="0.01" value={form.importo} onChange={e => setForm(f => ({ ...f, importo: e.target.value }))} className="input" placeholder="0.00" />
              </div>
              <div>
                <label className="label">Note</label>
                <textarea value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} className="input h-16 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annulla</button>
                <button type="submit" className="btn-primary flex-1">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
