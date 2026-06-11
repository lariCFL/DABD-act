import { createContext, useContext, useState, useCallback, useEffect } from 'react'
// Importe a função getMe do seu arquivo api.js (ajuste o caminho se necessário)
import { getMe } from '../services/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // Novos estados para o usuário e para o carregamento
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Estados que você já tinha
  const [page, setPage] = useState('dashboard')
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null)

  // Busca o usuário logado assim que o aplicativo carrega
  useEffect(() => {
    async function carregarUsuario() {
      try {
        const dadosDoUsuario = await getMe()
        setUser(dadosDoUsuario)
      } catch (erro) {
        console.error("Nenhum usuário logado ou erro na sessão:", erro)
      } finally {
        setAuthLoading(false)
      }
    }
    carregarUsuario()
  }, [])

  const navigate = useCallback((p) => setPage(p), [])

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const openModal = useCallback((config) => setModal(config), [])
  const closeModal = useCallback(() => setModal(null), [])

  return (
    <AppContext.Provider
      // Adicionamos user e authLoading aqui no value!
      value={{
        user,
        authLoading,
        page,
        navigate,
        toasts,
        showToast,
        modal,
        openModal,
        closeModal
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)