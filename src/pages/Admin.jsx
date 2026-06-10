import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  ShieldCheck, Plus, Trash2, Save, Receipt, BarChart2, Users,
  CheckCircle, XCircle, AlertTriangle, Pencil
} from 'lucide-react'
import { useConfirm } from '../components/ConfirmDialog'

const UNITA = ['Interno 1', 'Interno 2', 'Interno 3', 'Interno 4', 'Interno 5', 'Interno 6']
const CATEGORIE = ['Manutenzione', 'Pulizie', 'Assicurazione', 'Utenze', 'Amministrazione', 'Altro']
const TABS = [
  { id: 'spese', label: 'Spese comuni', icon: Receipt },
  { id: 'millesimi', label: 'Millesimi', icon: BarChart2 },
  { id: 'utenti', label: 'Utenti', icon: Users },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function calcQuota(importo, millesimi) {
  return Math.round(parseFloat(importo || 0) * parseFloat(millesimi || 0) / 1000 * 100) / 100
}

// ── Tab Spese ──────────────────────────────────────────────────────────────

function TabSpese({ session }) {
  const confirm = useConfirm()
  const [spese, setSpese] = useState([])
  const [millesimi, setMillesimi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSpesa, setEditSpesa] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    titolo: '', descrizione: '', categoria: 'Manutenzione',
    data_scadenza: '', importo_totale: '', note: ''
  })
  // Per-spesa: quale unità partecipa e con quanti millesimi
  const [quoteConfig, setQuoteConfig] = useState([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: speseData }, { data: millData }] = await Promise.all([
      supabase.from('spese_comuni').select('*, quote_spese(*)').order('data_scadenza', { ascending: false }),
      supabase.from('millesimi_config').select('*').order('unita'),
    ])
    setSpese(speseData || [])
    setMillesimi(millData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => {
    setEditSpesa(null)
    setQuoteConfig(millesimi.map(m => ({ unita: m.unita, millesimi: String(m.valore), inclusa: true })))
    setForm({ titolo: '', descrizione: '', categoria: 'Manutenzione', data_scadenza: '', importo_totale: '', note: '' })
    setShowForm(true)
  }

  const openEdit = (spesa) => {
    setEditSpesa(spesa)
    setForm({
      titolo: spesa.titolo,
      descrizione: spesa.descrizione || '',
      categoria: spesa.categoria,
      data_scadenza: spesa.data_scadenza,
      importo_totale: String(spesa.importo_totale),
      note: spesa.note || '',
    })
    const existingQuote = spesa.quote_spese || []
    setQuoteConfig(millesimi.map(m => {
      const ex = existingQuote.find(q => q.unita === m.unita)
      return { unita: m.unita, millesimi: ex ? String(ex.millesimi) : String(m.valore), inclusa: !!ex }
    }))
    setShowForm(true)
  }

  const setQuota = (unita, field, value) =>
    setQuoteConfig(cfg => cfg.map(q => q.unita === unita ? { ...q, [field]: value } : q))

  const previewRows = quoteConfig.map(q => ({
    ...q,
    importo_quota: q.inclusa ? calcQuota(form.importo_totale, q.millesimi) : 0,
  }))

  const totaleDistribuito = previewRows.reduce((acc, p) => acc + p.importo_quota, 0)
  const importo = parseFloat(form.importo_totale) || 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    const incluse = quoteConfig.filter(q => q.inclusa)
    if (incluse.length === 0) return
    setSubmitting(true)

    if (editSpesa) {
      const { error } = await supabase.from('spese_comuni').update({
        titolo: form.titolo,
        descrizione: form.descrizione || null,
        categoria: form.categoria,
        data_scadenza: form.data_scadenza,
        importo_totale: importo,
        note: form.note || null,
      }).eq('id', editSpesa.id)

      if (!error) {
        const existingQuote = editSpesa.quote_spese || []
        const toInsert = incluse.filter(q => !existingQuote.find(e => e.unita === q.unita))
        const toUpdate = incluse.filter(q => existingQuote.find(e => e.unita === q.unita))
        const toDelete = existingQuote.filter(e => !incluse.find(q => q.unita === e.unita))

        if (toInsert.length > 0) {
          await supabase.from('quote_spese').insert(toInsert.map(q => ({
            spesa_id: editSpesa.id,
            unita: q.unita,
            millesimi: parseFloat(q.millesimi) || 0,
            importo_quota: calcQuota(form.importo_totale, q.millesimi),
          })))
        }
        for (const q of toUpdate) {
          await supabase.from('quote_spese')
            .update({ millesimi: parseFloat(q.millesimi) || 0, importo_quota: calcQuota(form.importo_totale, q.millesimi) })
            .eq('spesa_id', editSpesa.id).eq('unita', q.unita)
        }
        for (const q of toDelete) {
          await supabase.from('quote_spese').delete().eq('spesa_id', editSpesa.id).eq('unita', q.unita)
        }
        setShowForm(false)
        setEditSpesa(null)
        fetchAll()
      }
    } else {
      const { data: spesa, error } = await supabase
        .from('spese_comuni')
        .insert({
          titolo: form.titolo,
          descrizione: form.descrizione || null,
          categoria: form.categoria,
          data_scadenza: form.data_scadenza,
          importo_totale: importo,
          note: form.note || null,
          user_id: session?.user?.id,
        })
        .select()
        .single()

      if (!error && spesa) {
        const quote = incluse.map(q => ({
          spesa_id: spesa.id,
          unita: q.unita,
          millesimi: parseFloat(q.millesimi) || 0,
          importo_quota: calcQuota(form.importo_totale, q.millesimi),
        }))
        await supabase.from('quote_spese').insert(quote)
        setShowForm(false)
        fetchAll()
      }
    }
    setSubmitting(false)
  }

  const handleDelete = async (spesa) => {
    const pagate = spesa.quote_spese?.filter(q => q.completata).length || 0
    const msg = pagate > 0
      ? `Attenzione: ${pagate} quote risultano già pagate. Eliminare comunque la spesa?`
      : `Eliminare "${spesa.titolo}"? L'operazione è irreversibile.`
    if (!await confirm(msg)) return
    await supabase.from('spese_comuni').delete().eq('id', spesa.id)
    fetchAll()
  }

  if (loading) return <div className="card p-8 text-center text-stone-400 text-sm">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-stone-500 text-sm">{spese.length} spese registrate</p>
        <button
          onClick={openCreate}
          disabled={millesimi.length === 0}
          title={millesimi.length === 0 ? 'Configura prima i millesimi' : undefined}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Nuova spesa
        </button>
      </div>

      {millesimi.length === 0 && (
        <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Configura prima i millesimi nella scheda "Millesimi" per poter creare spese.</p>
        </div>
      )}

      {spese.length === 0 && millesimi.length > 0 && (
        <div className="card p-10 text-center">
          <Receipt className="w-8 h-8 text-stone-200 mx-auto mb-2" />
          <p className="text-stone-400 text-sm">Nessuna spesa comune registrata</p>
        </div>
      )}

      {spese.map(spesa => {
        const quote = spesa.quote_spese || []
        const pagate = quote.filter(q => q.completata).length
        return (
          <div key={spesa.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-800 text-sm">{spesa.titolo}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-500">{spesa.categoria}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-stone-400">
                  <span>📅 {format(new Date(spesa.data_scadenza + 'T00:00:00'), 'd MMMM yyyy', { locale: it })}</span>
                  <span>💶 Totale: <strong className="text-stone-600">€{Number(spesa.importo_totale).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong></span>
                  <span>{pagate}/{quote.length} pagate</span>
                </div>
                {spesa.note && <p className="text-xs text-stone-400 mt-0.5">{spesa.note}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0 mt-0.5">
                <button onClick={() => openEdit(spesa)} className="p-1 text-stone-300 hover:text-stone-600 transition-colors" title="Modifica">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(spesa)} className="p-1 text-stone-300 hover:text-red-400 transition-colors" title="Elimina">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stone-100">
              {quote.map(q => (
                <div key={q.id} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
                  q.completata ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-stone-50 text-stone-500 border-stone-200'
                }`}>
                  {q.completata ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3 opacity-40" />}
                  {q.unita}: €{Number(q.importo_quota).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-stone-800 mb-4">{editSpesa ? 'Modifica spesa' : 'Nuova spesa comune'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Titolo</label>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input">
                    {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Data scadenza</label>
                  <input type="date" value={form.data_scadenza} onChange={e => setForm(f => ({ ...f, data_scadenza: e.target.value }))} className="input" required />
                </div>
              </div>
              <div>
                <label className="label">Importo totale (€)</label>
                <input type="number" step="0.01" min="0" value={form.importo_totale} onChange={e => setForm(f => ({ ...f, importo_totale: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="label">Note (opzionale)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" />
              </div>

              {/* Quote per unità — editabili */}
              <div className="rounded-lg border border-stone-200 overflow-hidden">
                <div className="bg-stone-50 px-3 py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Partecipazione per unità
                </div>
                <div className="divide-y divide-stone-100">
                  {/* header */}
                  <div className="grid grid-cols-[auto_1fr_6rem_6rem] items-center gap-2 px-3 py-1.5 text-xs text-stone-400 font-medium">
                    <span className="w-4" />
                    <span>Unità</span>
                    <span className="text-center">Millesimi</span>
                    <span className="text-right">Quota</span>
                  </div>
                  {quoteConfig.map(q => {
                    const quota = q.inclusa ? calcQuota(form.importo_totale, q.millesimi) : 0
                    return (
                      <div key={q.unita} className={`grid grid-cols-[auto_1fr_6rem_6rem] items-center gap-2 px-3 py-2 transition-colors ${!q.inclusa ? 'opacity-40' : ''}`}>
                        <input
                          type="checkbox"
                          checked={q.inclusa}
                          onChange={e => setQuota(q.unita, 'inclusa', e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 accent-terracotta-500"
                        />
                        <span className="text-sm text-stone-700">{q.unita}</span>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="1000"
                          value={q.millesimi}
                          disabled={!q.inclusa}
                          onChange={e => setQuota(q.unita, 'millesimi', e.target.value)}
                          className="input py-1 text-center text-xs disabled:cursor-not-allowed"
                        />
                        <span className={`text-right text-sm font-medium ${q.inclusa ? 'text-stone-800' : 'text-stone-300'}`}>
                          {importo > 0 ? `€${quota.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                      </div>
                    )
                  })}
                  {/* totale distribuito */}
                  {importo > 0 && (
                    <div className="grid grid-cols-[auto_1fr_6rem_6rem] items-center gap-2 px-3 py-2 bg-stone-50 text-xs font-semibold text-stone-600">
                      <span className="w-4" />
                      <span>Totale distribuito</span>
                      <span />
                      <span className={`text-right ${Math.abs(totaleDistribuito - importo) > 0.05 ? 'text-amber-600' : 'text-sage-600'}`}>
                        €{totaleDistribuito.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {importo > 0 && Math.abs(totaleDistribuito - importo) > 0.05 && (
                <p className="text-xs text-amber-600">
                  Il totale distribuito differisce dall'importo totale di €{Math.abs(importo - totaleDistribuito).toLocaleString('it-IT', { minimumFractionDigits: 2 })}.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditSpesa(null) }} className="btn-secondary flex-1">Annulla</button>
                <button
                  type="submit"
                  disabled={submitting || quoteConfig.filter(q => q.inclusa).length === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editSpesa ? 'Salva modifiche' : 'Crea spesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab Millesimi ──────────────────────────────────────────────────────────

function TabMillesimi() {
  const [rows, setRows] = useState([])
  const [localValues, setLocalValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('millesimi_config').select('*').order('unita')
      setRows(data || [])
      const vals = {}
      ;(data || []).forEach(r => { vals[r.unita] = String(r.valore) })
      setLocalValues(vals)
      setLoading(false)
    }
    fetch()
  }, [])

  const total = Object.values(localValues).reduce((acc, v) => acc + parseFloat(v || 0), 0)
  const isValid = Math.abs(total - 1000) <= 0.01

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    const upsertRows = rows.map(r => ({ unita: r.unita, valore: parseFloat(localValues[r.unita] || 0) }))
    await supabase.from('millesimi_config').upsert(upsertRows, { onConflict: 'unita' })
    setSaving(false)
  }

  if (loading) return <div className="card p-8 text-center text-stone-400 text-sm">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="divide-y divide-stone-100">
          <div className="grid grid-cols-3 px-4 py-2 bg-stone-50 text-xs font-medium text-stone-400 uppercase tracking-wide">
            <span>Unità</span>
            <span className="text-center">Millesimi</span>
            <span className="text-right">su 1000</span>
          </div>
          {rows.map(r => (
            <div key={r.unita} className="grid grid-cols-3 items-center px-4 py-3">
              <span className="text-sm text-stone-700 font-medium">{r.unita}</span>
              <div className="flex justify-center">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1000"
                  value={localValues[r.unita] ?? ''}
                  onChange={e => setLocalValues(v => ({ ...v, [r.unita]: e.target.value }))}
                  className="input w-28 text-center"
                />
              </div>
              <span className="text-right text-sm text-stone-400">
                {((parseFloat(localValues[r.unita] || 0) / 1000) * 100).toFixed(2)}%
              </span>
            </div>
          ))}
          <div className={`grid grid-cols-3 px-4 py-3 font-semibold text-sm ${isValid ? 'bg-sage-50 text-sage-700' : 'bg-red-50 text-red-600'}`}>
            <span>Totale</span>
            <span className="text-center">{total.toFixed(3)}</span>
            <span className="text-right">{isValid ? '✓ Valido' : `Mancano ${(1000 - total).toFixed(3)}`}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-400">
        Nota: la modifica dei millesimi non aggiorna retroattivamente le quote già create.
      </p>

      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title={!isValid ? 'I millesimi devono sommare esattamente a 1000' : undefined}
      >
        {saving
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Save className="w-4 h-4" />
        }
        Salva millesimi
      </button>
    </div>
  )
}

// ── Tab Utenti ─────────────────────────────────────────────────────────────

function TabUtenti({ session }) {
  const [profili, setProfili] = useState([])
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const { refetchProfile } = useProfile()

  const fetchProfili = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('email')
    setProfili(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfili() }, [fetchProfili])

  const getEdit = (p) => edits[p.user_id] ?? { is_admin: p.is_admin, unita: p.unita }

  const handleSave = async (p) => {
    setSaving(p.user_id)
    const update = getEdit(p)
    await supabase.from('profiles').update({ is_admin: update.is_admin, unita: update.unita || null }).eq('user_id', p.user_id)
    if (p.user_id === session?.user?.id) refetchProfile()
    setEdits(e => { const n = { ...e }; delete n[p.user_id]; return n })
    await fetchProfili()
    setSaving(null)
  }

  if (loading) return <div className="card p-8 text-center text-stone-400 text-sm">Caricamento...</div>

  return (
    <div className="space-y-3">
      {profili.length === 0 && (
        <div className="card p-8 text-center">
          <Users className="w-7 h-7 text-stone-200 mx-auto mb-2" />
          <p className="text-stone-400 text-sm">Nessun utente registrato</p>
        </div>
      )}
      {profili.map(p => {
        const edit = getEdit(p)
        const isCurrentUser = p.user_id === session?.user?.id
        const isDirty = JSON.stringify(edit) !== JSON.stringify({ is_admin: p.is_admin, unita: p.unita })
        return (
          <div key={p.user_id} className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-stone-600 uppercase">{p.email[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-700 truncate">{p.email}</p>
                {isCurrentUser && <p className="text-xs text-terracotta-500">Tu</p>}
              </div>
              {p.is_admin && (
                <span className="text-xs px-2 py-0.5 rounded bg-terracotta-50 text-terracotta-600 font-medium border border-terracotta-200">
                  Admin
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Unità / Interno</label>
                <select
                  value={edit.unita || ''}
                  onChange={e => setEdits(ed => ({ ...ed, [p.user_id]: { ...getEdit(p), unita: e.target.value || null } }))}
                  className="input"
                >
                  <option value="">— Nessuna —</option>
                  {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Ruolo amministratore</label>
                <button
                  type="button"
                  disabled={isCurrentUser}
                  title={isCurrentUser ? 'Non puoi rimuovere i tuoi privilegi amministrativi' : undefined}
                  onClick={() => setEdits(ed => ({ ...ed, [p.user_id]: { ...getEdit(p), is_admin: !edit.is_admin } }))}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    edit.is_admin
                      ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-200 hover:bg-terracotta-100'
                      : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {edit.is_admin ? 'È admin' : 'Non admin'}
                </button>
              </div>
            </div>
            {isDirty && (
              <button
                onClick={() => handleSave(p)}
                disabled={saving === p.user_id}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {saving === p.user_id
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                Salva modifiche
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────

export default function Admin({ session: sessionProp }) {
  const { isAdmin, loading: profileLoading } = useProfile()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('spese')

  // Recupera la sessione se non passata come prop (il componente viene montato dentro ProfileProvider)
  const [session, setSession] = useState(sessionProp || null)
  useEffect(() => {
    if (!sessionProp) {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    }
  }, [sessionProp])

  useEffect(() => {
    if (!profileLoading && !isAdmin) navigate('/', { replace: true })
  }, [isAdmin, profileLoading, navigate])

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-terracotta-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-terracotta-50 rounded-lg flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-terracotta-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Pannello Amministratore</h1>
          <p className="text-stone-400 text-sm">Gestione spese, millesimi e utenti</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'spese'     && <TabSpese session={session} />}
      {activeTab === 'millesimi' && <TabMillesimi />}
      {activeTab === 'utenti'    && <TabUtenti session={session} />}
    </div>
  )
}
