import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Check, Trash2, RotateCcw, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const CATEGORIE = ['Pulizie', 'Manutenzione', 'Giardino', 'Parcheggio', 'Altro']
const UNITA = ['Interno 1', 'Interno 2', 'Interno 3', 'Interno 4', 'Interno 5', 'Interno 6', 'Tutti']

export default function Obblighi() {
  const [obblighi, setObblighi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('tutti') // 'tutti' | 'pendenti' | 'completati'
  const [form, setForm] = useState({ titolo: '', descrizione: '', categoria: 'Pulizie', assegnato_a: '', ricorrenza: 'mensile', data_inizio: '' })

  useEffect(() => { fetchObblighi() }, [])

  const fetchObblighi = async () => {
    const { data } = await supabase.from('obblighi').select('*').order('completato').order('created_at', { ascending: false })
    setObblighi(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('obblighi').insert({ ...form, completato: false })
    if (!error) { setShowForm(false); setForm({ titolo: '', descrizione: '', categoria: 'Pulizie', assegnato_a: '', ricorrenza: 'mensile', data_inizio: '' }); fetchObblighi() }
  }

  const toggleCompletato = async (id, completato) => {
    await supabase.from('obblighi').update({ completato: !completato, completato_il: !completato ? new Date().toISOString() : null }).eq('id', id)
    fetchObblighi()
  }

  const handleDelete = async (id) => {
    if (confirm('Eliminare questo obbligo?')) {
      await supabase.from('obblighi').delete().eq('id', id)
      fetchObblighi()
    }
  }

  const filtered = obblighi.filter(o => {
    if (filtro === 'pendenti') return !o.completato
    if (filtro === 'completati') return o.completato
    return true
  })

  const ricorrenzaLabel = { giornaliera: 'Ogni giorno', settimanale: 'Ogni settimana', mensile: 'Ogni mese', trimestrale: 'Ogni trimestre', annuale: 'Annuale', unica: 'Una tantum' }
  const catColors = { Pulizie: 'bg-blue-50 text-blue-700', Manutenzione: 'bg-amber-50 text-amber-700', Giardino: 'bg-sage-50 text-sage-700', Parcheggio: 'bg-stone-100 text-stone-600', Altro: 'bg-purple-50 text-purple-700' }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Obblighi comuni</h1>
          <p className="text-stone-400 text-sm">Turni, pulizie e manutenzioni condivise</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo obbligo
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {[['tutti', 'Tutti'], ['pendenti', 'Pendenti'], ['completati', 'Completati']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filtro === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="card p-6 text-center text-stone-400 text-sm">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <ClipboardList className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-stone-400 text-sm">Nessun obbligo trovato</p>
          </div>
        ) : (
          filtered.map(o => (
            <div key={o.id} className={`card p-4 flex items-start gap-3 transition-opacity ${o.completato ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleCompletato(o.id, o.completato)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${o.completato ? 'bg-sage-500 border-sage-500' : 'border-stone-300 hover:border-sage-400'}`}>
                {o.completato && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${o.completato ? 'line-through text-stone-400' : 'text-stone-800'}`}>{o.titolo}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColors[o.categoria] || 'bg-stone-100 text-stone-600'}`}>{o.categoria}</span>
                </div>
                {o.descrizione && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{o.descrizione}</p>}
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-stone-400">
                  {o.assegnato_a && <span>📍 {o.assegnato_a}</span>}
                  <span>🔄 {ricorrenzaLabel[o.ricorrenza]}</span>
                  {o.completato_il && <span>✓ {format(new Date(o.completato_il), 'd MMM', { locale: it })}</span>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {o.completato && (
                  <button onClick={() => toggleCompletato(o.id, o.completato)} className="p-1.5 text-stone-300 hover:text-amber-500 transition-colors" title="Riapri">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => handleDelete(o.id)} className="p-1.5 text-stone-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-stone-800 mb-4">Nuovo obbligo comune</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Titolo *</label>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" placeholder="es. Pulizia scale" required />
              </div>
              <div>
                <label className="label">Descrizione</label>
                <textarea value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} className="input h-20 resize-none" placeholder="Dettagli dell'obbligo..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input">
                    {CATEGORIE.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Assegnato a</label>
                  <select value={form.assegnato_a} onChange={e => setForm(f => ({ ...f, assegnato_a: e.target.value }))} className="input">
                    <option value="">—</option>
                    {UNITA.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Ricorrenza</label>
                <select value={form.ricorrenza} onChange={e => setForm(f => ({ ...f, ricorrenza: e.target.value }))} className="input">
                  {Object.entries({ giornaliera: 'Giornaliera', settimanale: 'Settimanale', mensile: 'Mensile', trimestrale: 'Trimestrale', annuale: 'Annuale', unica: 'Una tantum' }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
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
