import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ProfileProvider } from './context/ProfileContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Calendario from './pages/Calendario'
import Obblighi from './pages/Obblighi'
import Scadenze from './pages/Scadenze'
import Guasti from './pages/Guasti'
import Verbali from './pages/Verbali'
import Admin from './pages/Admin'
import Auth from './pages/Auth'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-terracotta-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" replace />} />
        <Route
          path="/"
          element={
            session
              ? <ProfileProvider session={session}><Layout session={session} /></ProfileProvider>
              : <Navigate to="/auth" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="obblighi" element={<Obblighi />} />
          <Route path="scadenze" element={<Scadenze />} />
          <Route path="guasti" element={<Guasti />} />
          <Route path="verbali" element={<Verbali />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
