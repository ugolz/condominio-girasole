import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { message, resolveRef }

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve })
    })
  }, [])

  const handle = (result) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-stone-900/50 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-stone-700 pt-1.5 leading-relaxed">{state.message}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handle(false)}
                className="btn-secondary flex-1"
              >
                Annulla
              </button>
              <button
                onClick={() => handle(true)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm deve essere usato dentro ConfirmProvider')
  return ctx
}
