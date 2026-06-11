import { useApp } from '../context/AppContext'
import { useFetch } from '../hooks/useFetch'
import { getMe, getFamily } from '../services/api'
import logoImg from '../assets/logo_icon_v2.svg'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Inici', section: 'Principal' },
  { id: 'biblioteca', icon: 'device-gamepad-2', label: 'Biblioteca', section: null },
  { id: 'partides', icon: 'player-play', label: 'Partides', section: null },
  { id: 'familia', icon: 'users', label: 'Família', section: 'Gestió' },
  { id: 'comptes', icon: 'brand-steam', label: 'Comptes', section: null },
  { id: 'plataformas', icon: 'BsPcDisplay', label: 'Plataformes', section: null },
  { id: 'valoracions', icon: 'star', label: 'Valoracions', section: null },
]

export default function Sidebar() {
  const { page, navigate } = useApp()
  const { data: me } = useFetch(getMe, [])
  const { data: family } = useFetch(getFamily, [])

  const initials = me
    ? me.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <aside className="sidebar">
      <div className="logo">
        {/* <div className="logo-icon">🎮</div> */}
        <img src={logoImg} alt="Ícone GameShare" className="logo-icon" />
        <span className="logo-text">Game<span>Share</span></span>
        {/* Game<span>Share</span> */}
      </div>

      {family && (
        <div className="family-badge">
          <strong>{family.name}</strong>
          {family.memberCount} membres · {me?.isAdmin ? 'Tu ets admin' : 'Membre'}
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
              {item.badge != null && <span className="badge">{item.badge}</span>}
            </button>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-row" onClick={() => navigate('perfil')}>
          <div className="avatar" style={{ background: 'var(--accent)' }}>{initials}</div>
          <div className="user-info">
            <strong>{me?.name ?? '—'}</strong>
            <span>{me?.isAdmin ? 'Administrador' : 'Membre'}</span>
          </div>
          <i className="ti ti-settings" style={{ color: 'var(--text3)', fontSize: 14 }} />
        </div>
      </div>
    </aside>
  )
}
