import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((type, text) => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, type, text }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(x => x.id !== id))
  }, [])

  const toast = useMemo(() => ({
    success: (text) => push('success', text),
    error:   (text) => push('error',   text),
    warning: (text) => push('warning', text),
  }), [push])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 pl-3.5 pr-2.5 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs pointer-events-auto ${
              t.type === 'success' ? 'bg-sage-600 text-white' :
              t.type === 'error'   ? 'bg-red-500 text-white' :
                                     'bg-amber-500 text-white'
            }`}
          >
            {t.type === 'success' && <CheckCircle  className="w-4 h-4 flex-shrink-0" />}
            {t.type === 'error'   && <XCircle      className="w-4 h-4 flex-shrink-0" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{t.text}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve essere usato dentro ToastProvider')
  return ctx
}
