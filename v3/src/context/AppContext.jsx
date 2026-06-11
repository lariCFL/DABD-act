import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getMe, getToken, clearToken } from '../services/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page,        setPage]        = useState('dashboard')
  const [toasts,      setToasts]      = useState([])
  const [modal,       setModal]       = useState(null)

  // Attempt to restore session on mount
  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) { setAuthLoading(false); return }
      try {
        const me = await getMe()
        setUser(me)
      } catch {
        clearToken()
      } finally {
        setAuthLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = useCallback((userData) => {
    setUser(userData)
    setPage('dashboard')
  }, [])

  const logoutUser = useCallback(() => {
    clearToken()
    setUser(null)
    setPage('dashboard')
    setModal(null)
  }, [])

  const navigate = useCallback((p) => setPage(p), [])

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const openModal  = useCallback((config) => setModal(config), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <AppContext.Provider value={{
      user, setUser, authLoading, login, logoutUser,
      page, navigate,
      toasts, showToast,
      modal, openModal, closeModal,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
