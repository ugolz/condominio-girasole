import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Download, Trash2, FileText, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Verbali() {
  const [verbali, setVerbali] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titolo: '', data_assemblea: '', note: '' })
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchVerbali() }, [])

  const fetchVerbali = async () => {
    const { data } = await supabase.from('verbali').select('*').order('data_assemblea', { ascending: false })
    setVerbali(data || [])
    setLoading(false)
  }

  const handleFileChange = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f)
    } else {
      alert('Carica solo file PDF')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { alert('Seleziona un file PDF'); return }
    setUploading(true)

    const fileName = `verbali/${Date.now()}_${file.name.replace(/\s/g, '_')}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('documenti').upload(fileName, file, { contentType: 'application/pdf' })

    if (uploadError) {
      alert('Errore nel caricamento: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('documenti').getPublicUrl(fileName)

    const { error } = await supabase.from('verbali').insert({
      titolo: form.titolo,
      data_assemblea: form.data_assemblea,
      note: form.note,
      file_path: fileName,
      file_url: urlData.publicUrl,
      file_nome: file.name,
      file_size: file.size,
    })

    if (!error) {
      setShowForm(false)
      setForm({ titolo: '', data_assemblea: '', note: '' })
      setFile(null)
      fetchVerbali()
    }
    setUploading(false)
  }

  const handleDelete = async (id, file_path) => {
    if (!confirm('Eliminare questo verbale?')) return
    await supabase.storage.from('documenti').remove([file_path])
    await supabase.from('verbali').delete().eq('id', id)
    fetchVerbali()
  }

  const handleDownload = async (v) => {
    const { data } = await supabase.storage.from('documenti').download(v.file_path)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = v.file_nome
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) return `${Math.round(kb)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Verbali assemblee</h1>
          <p className="text-stone-400 text-sm">Archivio PDF dei verbali delle assemblee condominiali</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Carica verbale
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-6 text-center text-stone-400 text-sm">Caricamento...</div>
      ) : verbali.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-500 font-medium text-sm">Nessun verbale caricato</p>
          <p className="text-stone-400 text-xs mt-1">Carica il primo verbale dell'assemblea condominiale</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto flex items-center gap-2">
            <Upload className="w-4 h-4" /> Carica verbale
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {verbali.map(v => (
            <div key={v.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 text-sm">{v.titolo}</p>
                <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-stone-400">
                  {v.data_assemblea && <span>📅 {format(new Date(v.data_assemblea), 'd MMMM yyyy', { locale: it })}</span>}
                  <span>📄 {v.file_nome}</span>
                  {v.file_size && <span>{formatFileSize(v.file_size)}</span>}
                </div>
                {v.note && <p className="text-xs text-stone-400 mt-1 italic">{v.note}</p>}
                <p className="text-xs text-stone-300 mt-1">Caricato il {format(new Date(v.created_at), 'd MMM yyyy', { locale: it })}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <a
                  href={v.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-stone-400 hover:text-terracotta-500 hover:bg-terracotta-50 rounded-lg transition-colors"
                  title="Visualizza"
                >
                  <Eye className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDownload(v)}
                  className="p-2 text-stone-400 hover:text-sage-600 hover:bg-sage-50 rounded-lg transition-colors"
                  title="Scarica"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(v.id, v.file_path)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-stone-800 mb-4">Carica verbale assemblea</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Titolo *</label>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} className="input" placeholder="es. Assemblea ordinaria 2024" required />
              </div>
              <div>
                <label className="label">Data assemblea *</label>
                <input type="date" value={form.data_assemblea} onChange={e => setForm(f => ({ ...f, data_assemblea: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="label">Note</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" placeholder="es. Approvazione bilancio, nomina amministratore" />
              </div>

              {/* Drop zone */}
              <div>
                <label className="label">File PDF *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]) }}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${dragOver ? 'border-terracotta-400 bg-terracotta-50' : 'border-stone-200 hover:border-terracotta-300 hover:bg-stone-50'}
                    ${file ? 'border-sage-300 bg-sage-50' : ''}
                  `}
                >
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFileChange(e.target.files[0])} />
                  {file ? (
                    <>
                      <FileText className="w-6 h-6 text-sage-500 mx-auto mb-1" />
                      <p className="text-sm font-medium text-sage-700">{file.name}</p>
                      <p className="text-xs text-stone-400">{formatFileSize(file.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-stone-300 mx-auto mb-1" />
                      <p className="text-sm text-stone-400">Trascina qui il PDF o <span className="text-terracotta-500 font-medium">clicca per selezionare</span></p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setFile(null) }} className="btn-secondary flex-1">Annulla</button>
                <button type="submit" disabled={uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {uploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {uploading ? 'Caricamento...' : 'Carica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
