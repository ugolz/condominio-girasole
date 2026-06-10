import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
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
  X,
  ShieldCheck
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calendario', label: 'Calendario', icon: Calendar },
  { to: '/obblighi', label: 'Obblighi comuni', icon: ClipboardList },
  { to: '/scadenze', label: 'Scadenze', icon: Clock },
  { to: '/guasti', label: 'Segnalazioni guasti', icon: Wrench },
  { to: '/verbali', label: 'Verbali assemblee', icon: FileText },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAdmin, unita } = useProfile()

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
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-terracotta-500" />
            <span className="font-semibold text-stone-800 text-sm">Condominio</span>
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
