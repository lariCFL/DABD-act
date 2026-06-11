import { useApp } from '../context/AppContext'
import { useFetch } from '../hooks/useFetch'
import { getFamily, logout as apiLogout } from '../services/api'
import logoImg from '../assets/logo_icon_v2.svg'

const NAV_ITEMS = [
  { id: 'dashboard',   icon: 'layout-dashboard', label: 'Inici',       section: 'Principal' },
  { id: 'biblioteca',  icon: 'device-gamepad-2', label: 'Biblioteca',  section: null },
  { id: 'partides',    icon: 'player-play',      label: 'Partides',    section: null },
  { id: 'familia',     icon: 'users',            label: 'Família',     section: 'Gestió' },
  { id: 'comptes',     icon: 'brand-steam',      label: 'Comptes',     section: null },
  { id: 'dispositius', icon: 'devices',          label: 'Dispositius', section: null },
  { id: 'plataformes', icon: 'app-window',       label: 'Plataformes', section: null },
  { id: 'valoracions', icon: 'star',             label: 'Valoracions', section: null },
]

export default function Sidebar() {
  const { user, page, navigate, logoutUser, showToast } = useApp()
  const { data: family } = useFetch(getFamily, [])

  const initials = user
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  async function handleLogout() {
    try { await apiLogout() } catch { /* ignore */ }
    logoutUser()
    showToast('Sessió tancada', 'success')
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <img src={logoImg} alt="Ícone GameShare" className="logo-icon" />
        <span className="logo-text">Game<span>Share</span></span>
      </div>

      {family ? (
        <div className="family-badge">
          <strong>{family.name}</strong>
          {family.memberCount} membres · {user?.isAdmin ? 'Tu ets admin' : 'Membre'}
        </div>
      ) : (
        <div className="family-badge" style={{ borderColor: 'var(--amber)', background: 'var(--amber-bg)' }}>
          <strong style={{ color: 'var(--amber)' }}>Sense família</strong>
          <span style={{ color: 'var(--text2)', fontSize: 11 }}>Ves a Família per crear-ne una</span>
        </div>
      )}

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            {item.section && <div className="nav-section">{item.section}</div>}
            <button
              className={`nav-item${page === item.id ? ' active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <i className={`ti ti-${item.icon}`} />
              {item.label}
            </button>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-row" onClick={() => navigate('perfil')} title="El meu perfil">
          <div className="avatar" style={{ background: user?.avatarColor ?? 'var(--accent)' }}>{initials}</div>
          <div className="user-info">
            <strong>{user?.name ?? '—'}</strong>
            <span>{user?.isAdmin ? 'Administrador' : 'Membre'}</span>
          </div>
          <i className="ti ti-settings" style={{ color: 'var(--text3)', fontSize: 14 }} />
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={handleLogout}
        >
          <i className="ti ti-logout" /> Tancar sessió
        </button>
      </div>
    </aside>
  )
}
