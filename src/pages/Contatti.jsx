import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { Search, Mail, Users } from 'lucide-react'

export default function Contatti() {
  const { isAdmin } = useProfile()
  const [contatti, setContatti] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    const fetchContatti = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome, cognome, email, is_admin, telefono')
        .order('nome')
      if (error) {
        setErrore(error.message)
      } else {
        setContatti(data || [])
      }
      setLoading(false)
    }
    fetchContatti()
  }, [])

  const nomeCompleto = (c) => {
    const full = [c.nome, c.cognome].filter(Boolean).join(' ')
    return full || c.email
  }

  const iniziali = (c) => {
    if (c.nome) return c.nome[0].toUpperCase()
    return c.email?.[0]?.toUpperCase() || '?'
  }

  const filtered = contatti.filter(c => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      nomeCompleto(c).toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  const admins    = filtered.filter(c => c.is_admin)
  const condomini = filtered.filter(c => !c.is_admin)

  const avatarColors = [
    'bg-terracotta-100 text-terracotta-700',
    'bg-sage-100 text-sage-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
  ]

  const colorForIndex = (i) => avatarColors[i % avatarColors.length]

  const ContactCard = ({ c, idx }) => (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colorForIndex(idx)}`}>
        {iniziali(c)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-stone-800 truncate">{nomeCompleto(c)}</p>
          {c.is_admin && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-terracotta-50 text-terracotta-700 font-medium">Admin</span>
          )}
        </div>
        <div className="mt-1 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <a href={`mailto:${c.email}`} className="hover:text-terracotta-600 hover:underline truncate transition-colors">
              {c.email}
            </a>
          </div>
          {c.telefono && (
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="text-[10px]">📞</span>
              <a href={`tel:${c.telefono}`} className="hover:text-terracotta-600 hover:underline transition-colors">
                {c.telefono}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-800">Contatti condomini</h1>
        <p className="text-stone-400 text-sm">Recapiti degli abitanti del condominio</p>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca per nome, email o interno..."
          className="input pl-9"
        />
      </div>

      {loading ? (
        <div className="card p-6 text-center text-stone-400 text-sm">Caricamento...</div>
      ) : errore ? (
        <div className="card p-6 text-center">
          <p className="text-red-500 text-sm font-medium">Errore di caricamento</p>
          <p className="text-red-400 text-xs mt-1 font-mono">{errore}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <Users className="w-8 h-8 text-stone-200 mx-auto mb-2" />
          <p className="text-stone-400 text-sm">Nessun contatto trovato</p>
        </div>
      ) : (
        <>
          {/* Amministrazione */}
          {admins.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Amministrazione</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {admins.map((c, i) => <ContactCard key={c.user_id} c={c} idx={i} />)}
              </div>
            </section>
          )}

          {/* Condomini */}
          {condomini.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Condomini ({condomini.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {condomini.map((c, i) => <ContactCard key={c.user_id} c={c} idx={i + admins.length} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
