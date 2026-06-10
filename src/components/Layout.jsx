import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Clock,
  Wrench,
  FileText,
  LogOut,
  Building2,
  Menu,
  ShieldCheck,
  Settings,
  Bell,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calendario', label: 'Calendario', icon: Calendar },
  { to: '/obblighi', label: 'Obblighi comuni', icon: ClipboardList },
  { to: '/scadenze', label: 'Pagamenti', icon: Clock },
  { to: '/guasti', label: 'Segnalazioni guasti', icon: Wrench },
  { to: '/verbali', label: 'Verbali assemblee', icon: FileText },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifiche, setShowNotifiche] = useState(false)
  const [notifiche, setNotifiche] = useState([])
  const { isAdmin, unita } = useProfile()

  const fetchNotifiche = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifiche')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15)
    setNotifiche(data || [])
  }, [])

  useEffect(() => {
    fetchNotifiche()
    const onFocus = () => fetchNotifiche()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchNotifiche])

  const unreadCount = notifiche.filter(n => !n.letta).length

  const markAllRead = async () => {
    await supabase.from('notifiche').update({ letta: true }).eq('letta', false)
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const userEmail = session?.user?.email || ''
  const userName = userEmail.split('@')[0]

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-terracotta-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-display font-semibold text-stone-800 leading-tight text-sm">Condominio</p>
            <p className="text-xs text-stone-400 leading-tight">Gestionale</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-terracotta-50 text-terracotta-700'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-1 border-t border-stone-100 pt-3 ${
                isActive
                  ? 'bg-terracotta-50 text-terracotta-700'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
              }`
            }
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            Pannello Admin
          </NavLink>
        )}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-stone-100 pt-3">
        {/* Notifiche */}
        <div className="relative mb-1">
          <button
            onClick={() => setShowNotifiche(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 flex-shrink-0" />
              Notifiche
            </div>
            {unreadCount > 0 && (
              <span className="bg-terracotta-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifiche && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifiche(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Notifiche</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-terracotta-600 hover:underline">
                      Segna tutte come lette
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-stone-50">
                  {notifiche.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-6">Nessuna notifica</p>
                  ) : (
                    notifiche.map(n => (
                      <div key={n.id} className={`px-3 py-2.5 ${!n.letta ? 'bg-terracotta-50/60' : ''}`}>
                        <div className="flex items-start gap-2">
                          {!n.letta && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 mt-1.5 flex-shrink-0" />}
                          <div className={!n.letta ? '' : 'pl-3.5'}>
                            <p className="text-xs font-semibold text-stone-700">{n.titolo}</p>
                            {n.messaggio && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{n.messaggio}</p>}
                            <p className="text-[10px] text-stone-400 mt-1">
                              {format(new Date(n.created_at), 'd MMM yyyy, HH:mm', { locale: it })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <NavLink
          to="/impostazioni"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
              isActive
                ? 'bg-terracotta-50 text-terracotta-700'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
            }`
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Impostazioni
        </NavLink>
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-stone-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-stone-600 uppercase">{userName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-stone-700 truncate">{userEmail}</p>
            {unita && <p className="text-xs text-stone-400">{unita}</p>}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Esci
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-white border-r border-stone-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-56 flex flex-col bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-56">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-stone-100">
            <Menu className="w-5 h-5 text-stone-600" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Building2 className="w-4 h-4 text-terracotta-500" />
            <span className="font-semibold text-stone-800 text-sm">Condominio</span>
          </div>
          <button
            onClick={() => setShowNotifiche(v => !v)}
            className="relative p-1.5 rounded-lg hover:bg-stone-100"
          >
            <Bell className="w-5 h-5 text-stone-600" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-terracotta-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Pannello notifiche mobile */}
        {showNotifiche && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifiche(false)} />
            <div className="relative z-50 bg-white border-b border-stone-200 shadow-md">
              <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100">
                <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Notifiche</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-terracotta-600 hover:underline">
                    Segna tutte come lette
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-stone-50">
                {notifiche.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-5">Nessuna notifica</p>
                ) : (
                  notifiche.map(n => (
                    <div key={n.id} className={`px-4 py-2.5 ${!n.letta ? 'bg-terracotta-50/60' : ''}`}>
                      <div className="flex items-start gap-2">
                        {!n.letta && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 mt-1.5 flex-shrink-0" />}
                        <div className={!n.letta ? '' : 'pl-3.5'}>
                          <p className="text-xs font-semibold text-stone-700">{n.titolo}</p>
                          {n.messaggio && <p className="text-xs text-stone-500 mt-0.5">{n.messaggio}</p>}
                          <p className="text-[10px] text-stone-400 mt-1">
                            {format(new Date(n.created_at), 'd MMM yyyy, HH:mm', { locale: it })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-5">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
