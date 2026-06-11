import { useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import { ToastContainer, Modal } from './components/UI'

import DashboardPage from './pages/DashboardPage'
import BibliotecaPage from './pages/BibliotecaPage'
import PartidesPage from './pages/PartidesPage'
import FamiliaPage from './pages/FamiliaPage'
import ComptesPage from './pages/ComptesPage'
import DistribuïdorsPage from './pages/DistribuïdorsPage'
import PlataformaPage from './pages/PlataformaPage'
import ValoracionsPage from './pages/ValoracionsPage'
import PerfilPage from './pages/PerfilPage'

const PAGES = {
  dashboard: DashboardPage,
  biblioteca: BibliotecaPage,
  partides: PartidesPage,
  familia: FamiliaPage,
  comptes: ComptesPage,
  distribuidors: DistribuïdorsPage,
  plataformas: PlataformaPage,
  valoracions: ValoracionsPage,
  perfil: PerfilPage,
}

export default function App() {
  const { page } = useApp()
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
