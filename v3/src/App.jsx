import { useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import { ToastContainer, Modal, LoadingState } from './components/UI'

import LoginPage        from './pages/LoginPage'
import DashboardPage    from './pages/DashboardPage'
import BibliotecaPage   from './pages/BibliotecaPage'
import PartidesPage     from './pages/PartidesPage'
import FamiliaPage      from './pages/FamiliaPage'
import ComptesPage      from './pages/ComptesPage'
import DispositiusPage  from './pages/DispositiusPage'
import PlataformesPage  from './pages/PlataformesPage'
import ValoracionsPage  from './pages/ValoracionsPage'
import PerfilPage       from './pages/PerfilPage'

const PAGES = {
  dashboard:   DashboardPage,
  biblioteca:  BibliotecaPage,
  partides:    PartidesPage,
  familia:     FamiliaPage,
  comptes:     ComptesPage,
  dispositius: DispositiusPage,
  plataformes: PlataformesPage,
  valoracions: ValoracionsPage,
  perfil:      PerfilPage,
}

export default function App() {
  const { user, authLoading, page } = useApp()

  // While checking the stored token, show a full-screen loader
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState text="Verificant sessió..." />
      </div>
    )
  }

  // No authenticated user → show login
  if (!user) return <LoginPage />

  const PageComponent = PAGES[page] ?? DashboardPage

  return (
    <div className="app">
      <ToastContainer />
      <Modal />
      <Sidebar />
      <main className="main">
        <PageComponent />
      </main>
    </div>
  )
}
