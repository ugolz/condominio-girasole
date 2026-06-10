import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { User, Lock, ShieldCheck, Home, CheckCircle } from 'lucide-react'

export default function Impostazioni() {
  const { profile, isAdmin } = useProfile()

  const [pwForm, setPwForm] = useState({ corrente: '', nuova: '', conferma: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState(null) // { type: 'ok' | 'error', text: string }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMsg(null)

    if (pwForm.nuova !== pwForm.conferma) {
      setPwMsg({ type: 'error', text: 'La nuova password e la conferma non coincidono.' })
      return
    }
    if (pwForm.nuova.length < 6) {
      setPwMsg({ type: 'error', text: 'La nuova password deve essere di almeno 6 caratteri.' })
      return
    }

    setPwLoading(true)

    // Verifica la password corrente rieseguendo il login
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: profile?.email,
      password: pwForm.corrente,
    })

    if (signInErr) {
      setPwMsg({ type: 'error', text: 'La password corrente non è corretta.' })
      setPwLoading(false)
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.nuova })

    if (updateErr) {
      setPwMsg({ type: 'error', text: `Errore: ${updateErr.message}` })
    } else {
      setPwMsg({ type: 'ok', text: 'Password aggiornata con successo.' })
      setPwForm({ corrente: '', nuova: '', conferma: '' })
    }

    setPwLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-800">Impostazioni</h1>
        <p className="text-stone-400 text-sm">Gestisci il tuo profilo e le credenziali di accesso</p>
      </div>

      {/* Profilo */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide flex items-center gap-2">
          <User className="w-4 h-4" /> Profilo
        </h2>

        <div className="space-y-3">
          <div>
            <p className="label">Email</p>
            <p className="input bg-stone-50 text-stone-500 cursor-default select-all">{profile?.email ?? '—'}</p>
          </div>

          <div>
            <p className="label">Unità assegnata</p>
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <p className={`text-sm font-medium ${profile?.unita ? 'text-stone-700' : 'text-stone-400 italic'}`}>
                {profile?.unita ?? 'Non ancora assegnata — contatta l\'amministratore'}
              </p>
            </div>
          </div>

          <div>
            <p className="label">Ruolo</p>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-terracotta-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-terracotta-700">Amministratore</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <span className="text-sm text-stone-600">Condomino</span>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-stone-400">
          Email e unità sono gestite dall'amministratore e non modificabili da qui.
        </p>
      </div>

      {/* Cambio password */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-stone-600 uppercase tracking-wide flex items-center gap-2">
          <Lock className="w-4 h-4" /> Cambia password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Password corrente</label>
            <input
              type="password"
              value={pwForm.corrente}
              onChange={e => setPwForm(f => ({ ...f, corrente: e.target.value }))}
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">Nuova password</label>
            <input
              type="password"
              value={pwForm.nuova}
              onChange={e => setPwForm(f => ({ ...f, nuova: e.target.value }))}
              className="input"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Conferma nuova password</label>
            <input
              type="password"
              value={pwForm.conferma}
              onChange={e => setPwForm(f => ({ ...f, conferma: e.target.value }))}
              className="input"
              required
              autoComplete="new-password"
            />
          </div>

          {pwMsg && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              pwMsg.type === 'ok'
                ? 'bg-sage-50 text-sage-700 border border-sage-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {pwMsg.type === 'ok' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {pwMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {pwLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Aggiorna password
          </button>
        </form>
      </div>
    </div>
  )
}
