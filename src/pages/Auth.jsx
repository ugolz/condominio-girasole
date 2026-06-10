import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Controlla la tua email per confermare la registrazione.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-terracotta-500 rounded-2xl items-center justify-center mb-4 shadow-sm">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-stone-800">Condominio</h1>
          <p className="text-stone-400 text-sm mt-1">Gestionale condominiale</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="font-semibold text-stone-700 mb-5 text-sm">
            {mode === 'login' ? 'Accedi al tuo account' : 'Crea un nuovo account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="nome@esempio.it"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-sage-50 rounded-lg text-sage-700 text-xs">
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 flex items-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-stone-100 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              className="text-xs text-stone-500 hover:text-terracotta-600 transition-colors"
            >
              {mode === 'login' ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Riservato ai residenti del condominio
        </p>
      </div>
    </div>
  )
}
