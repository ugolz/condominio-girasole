import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Wrench, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useConfirm } from '../components/ConfirmDialog'

const CATEGORIE = ['Ascensore', 'Impianto elettrico', 'Idraulica', 'Riscaldamento', 'Tetto/Copertura', 'Scale comuni', 'Cancello/Portone', 'Illuminazione', 'Altro']
const UNITA = ['Interno 1', 'Interno 2', 'Interno 3', 'Interno 4', 'Interno 5', 'Interno 6', 'Parti comuni']

export default function Guasti() {
  const confirm = useConfirm()
  const [guasti, setGuasti] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('aperti')
  const [form, setForm] = useState({ titolo: '', descrizione: '', categoria: 'Altro', priorita: 'media', unita: '', stato: 'aperto' })

  useEffect(() => { fetchGuasti() }, [])

  const fetchGuasti = async () => {
    const { data } = await supabase.from('guasti').select('*').order('created_at', { ascending: false })
    setGuasti(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('guasti').insert({ ...form, user_id: user?.id })
    if (!error) { setShowForm(false); setForm({ titolo: '', descrizione: '', categoria: 'Altro', priorita: 'media', unita: '', stato: 'aperto' }); fetchGuasti() }
  }

  const updateStato = async (id, stato) => {
    await supabase.from('guasti').update({ stato, risolto_il: stato === 'risolto' ? new Date().toISOString() : null }).eq('id', id)
    fetchGuasti()
  }

  const handleDelete = async (id) => {
    if (!await confirm('Eliminare questa segnalazione? L\'operazione è irreversibile.')) return
    await supabase.from('guasti').delete().eq('id', id)
    fetchGuasti()
  }

  const filtered = guasti.filter(g => {
    if (filtro === 'aperti') return g.stato === 'aperto'
    if (filtro === 'in_corso') return g.stato === 'in_corso'
    if (filtro === 'risolti') return g.stato === 'risolto'
    return true
  })

  const prioritaConfig = {
    alta: { cls: 'badge-urgent', label: 'Alta', icon: '🔴' },
    media: { cls: 'badge-pending', label: 'Media', icon: '🟡' },
    bassa: { cls: 'badge-done', label: 'Bassa', icon: '🟢' },
  }

  const statoConfig = {
    aperto: { label: 'Aperto', cls: 'bg-red-50 text-red-600' },
    in_corso: { label: 'In lavorazione', cls: 'bg-amber-50 text-amber-600' },
    risolto: { label: 'Risolto', cls: 'bg-sage-50 text-sage-600' },
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Segnalazioni guasti</h1>
          <p className="text-stone-400 text-sm">Ticketing per problemi e riparazioni</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Segnala guasto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Aperti', count: guasti.filter(g => g.stato === 'aperto').length, color: 'text-red-500' },
          { label: 'In lavorazione', count: guasti.filter(g => g.stato === 'in_corso').length, color: 'text-amber-500' },
          { label: 'Risolti', count: guasti.filter(g => g.stato === 'risolto').length, color: 'text-sage-600' },
        ].map(({ label, count, color }) => (
          <div key={label} className="card p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-stone-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {[['aperti', 'Aperti'], ['in_corso', 'In corso'], ['risolti', 'Risolti'], ['tutti', 'Tutti']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filtro === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="card p-6 text-center text-stone-400 text-sm">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Wrench className="w-8 h-8 text-stone-200 mx-auto mb-2" />
            <p className="text-stone-400 text-sm">Nessuna segnalazione in questa categoria</p>
          </div>
        ) : (
          filtered.map(g => {
            const p = prioritaConfig[g.priorita]
            const s = statoConfig[g.stato]
            return (
              <div key={g.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-stone-800">{g.titolo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>
                      <span className={`text-xs font-medium ${p.cls}`}>{p.icon} {p.label}</span>
                    </div>
                    {g.descrizione && <p className="text-sm text-stone-500 mt-1">{g.descrizione}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-400">
                      <span>🏠 {g.unita || 'Non specificato'}</span>
                      <span>📂 {g.categoria}</span>
                      <span>📅 {format(new Date(g.created_at), 'd MMM yyyy', { locale: it })}</span>
                      {g.risolto_il && <span>✓ Risolto: {format(new Date(g.risolto_il), 'd MMM', { locale: it })}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 text-stone-300 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* State actions */}
                {g.stato !== 'risolto' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                    {g.stato === 'aperto' && (
                      <button onClick={() => updateStato(g.id, 'in_corso')} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Prendi in carico
                      </button>
                    )}
                    <button onClick={() => updateStato(g.id, 'risolto')} className="text-xs py-1.5 px-3 rounded-lg bg-sage-50 hover:bg-sage-100 text-sage-700 font-medium transition-colors flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Segna come risolto
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-stone-800 mb-4">Nuova segnalazione guasto</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Titolo *</label>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" placeholder="es. Ascensore fermo al piano 2" required />
              </div>
              <div>
                <label className="label">Descrizione del problema</label>
                <textarea value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} className="input h-20 resize-none" placeholder="Descrivi il problema in dettaglio..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input">
                    {CATEGORIE.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priorità</label>
                  <select value={form.priorita} onChange={e => setForm(f => ({ ...f, priorita: e.target.value }))} className="input">
                    <option value="bassa">🟢 Bassa</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Posizione / Unità</label>
                <select value={form.unita} onChange={e => setForm(f => ({ ...f, unita: e.target.value }))} className="input">
                  <option value="">Seleziona...</option>
                  {UNITA.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annulla</button>
                <button type="submit" className="btn-primary flex-1">Invia segnalazione</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
