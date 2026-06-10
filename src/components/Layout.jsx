import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  LayoutDashboard, Calendar, ClipboardList, CreditCard,
  Wrench, FileText, LogOut, Building2, Menu, ShieldCheck,
  Settings, Bell, BookUser, X,
} from 'lucide-react'

const navItems = [
  { to: '/',           label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/calendario', label: 'Calendario',       icon: Calendar },
  { to: '/obblighi',   label: 'Obblighi comuni',  icon: ClipboardList },
  { to: '/scadenze',   label: 'Pagamenti',        icon: CreditCard },
  { to: '/guasti',     label: 'Segnalazioni',     icon: Wrench },
  { to: '/verbali',    label: 'Verbali',          icon: FileText },
  { to: '/contatti',   label: 'Contatti',         icon: BookUser },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifiche, setShowNotifiche] = useState(false)
  const [notifiche, setNotifiche] = useState([])
  const { isAdmin, profile } = useProfile()

  const fetchNotifiche = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifiche').select('*')
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
  const nomeDisplay = [profile?.nome, profile?.cognome].filter(Boolean).join(' ') || userEmail.split('@')[0]
  const userInitial = nomeDisplay[0]?.toUpperCase() || '?'

  const NavItem = ({ to, label, icon: Icon, end, onClick }) => (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
          isActive
            ? 'bg-terracotta-500 text-white shadow-sm'
            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`} />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )

  const Sidebar = ({ onClose }) => (
    <div className="flex flex-col h-full bg-white border-r border-stone-100">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-terracotta-400 to-terracotta-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-stone-800 text-sm leading-tight tracking-tight">Condominio</p>
            <p className="text-[11px] text-stone-400 leading-tight">Girasole</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mx-4 h-px bg-stone-100 mb-1" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon, end }) => (
          <NavItem key={to} to={to} label={label} icon={icon} end={end} onClick={() => setMobileOpen(false)} />
        ))}
        {isAdmin && (
          <>
            <div className="mx-1 my-2 h-px bg-stone-100" />
            <NavItem to="/admin" label="Pannello Admin" icon={ShieldCheck} onClick={() => setMobileOpen(false)} />
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5">
        <div className="mx-1 mb-2 h-px bg-stone-100" />

        {/* Notifiche */}
        <div className="relative">
          <button
            onClick={() => setShowNotifiche(v => !v)}
            className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
              showNotifiche ? 'bg-stone-100 text-stone-800' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-terracotta-500" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-terracotta-500 animate-ping opacity-75" />
                  </>
                )}
              </div>
              Notifiche
            </div>
            {unreadCount > 0 && (
              <span className="bg-terracotta-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifiche && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifiche(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Notifiche</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-terracotta-600 font-semibold hover:underline">
                      Segna tutte lette
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-stone-50">
                  {notifiche.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-6 h-6 text-stone-200 mx-auto mb-2" />
                      <p className="text-xs text-stone-400">Nessuna notifica</p>
                    </div>
                  ) : notifiche.map(n => (
                    <div key={n.id} className={`px-4 py-3 transition-colors ${!n.letta ? 'bg-terracotta-50/60' : 'hover:bg-stone-50'}`}>
                      <div className="flex items-start gap-2.5">
                        {!n.letta && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 mt-1.5 flex-shrink-0" />}
                        <div className={!n.letta ? '' : 'pl-4'}>
                          <p className="text-xs font-semibold text-stone-700 leading-snug">{n.titolo}</p>
                          {n.messaggio && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{n.messaggio}</p>}
                          <p className="text-[10px] text-stone-400 mt-1">{format(new Date(n.created_at), 'd MMM · HH:mm', { locale: it })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Impostazioni */}
        <NavLink to="/impostazioni" onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
              isActive ? 'bg-terracotta-500 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 ${isActive ? '' : 'group-hover:scale-110'}`} />
              Impostazioni
            </>
          )}
        </NavLink>

        {/* User card */}
        <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-terracotta-400 to-terracotta-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-white">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-700 truncate">{nomeDisplay}</p>
            <p className="text-[10px] text-stone-400 truncate">{userEmail}</p>
          </div>
          <button onClick={handleLogout} title="Esci"
            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-50 transition-all duration-150 flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-col fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      >
        <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      </div>
      <aside className={`fixed left-0 inset-y-0 z-50 w-56 lg:hidden shadow-2xl transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-56">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 bg-gradient-to-br from-terracotta-400 to-terracotta-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-stone-800 text-sm tracking-tight">Condominio Girasole</span>
          </div>
          <button onClick={() => setShowNotifiche(v => !v)} className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-terracotta-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-terracotta-500 animate-ping opacity-75" />
              </>
            )}
          </button>
        </div>

        {/* Mobile notifiche */}
        {showNotifiche && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifiche(false)} />
            <div className="relative z-50 bg-white border-b border-stone-200 shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Notifiche</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-terracotta-600 font-semibold hover:underline">
                    Segna tutte lette
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-stone-50">
                {notifiche.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-6">Nessuna notifica</p>
                ) : notifiche.map(n => (
                  <div key={n.id} className={`px-4 py-3 ${!n.letta ? 'bg-terracotta-50/60' : ''}`}>
                    <div className="flex items-start gap-2.5">
                      {!n.letta && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-500 mt-1.5 flex-shrink-0" />}
                      <div className={!n.letta ? '' : 'pl-4'}>
                        <p className="text-xs font-semibold text-stone-700">{n.titolo}</p>
                        {n.messaggio && <p className="text-xs text-stone-500 mt-0.5">{n.messaggio}</p>}
                        <p className="text-[10px] text-stone-400 mt-1">{format(new Date(n.created_at), 'd MMM · HH:mm', { locale: it })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
