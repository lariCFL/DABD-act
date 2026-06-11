import { useFetch } from '../hooks/useFetch'
import { getDashboard } from '../services/api'
import { LoadingState, ErrorState } from '../components/UI'
import { useApp } from '../context/AppContext'

export default function DashboardPage() {
  const { user } = useApp()
  const { data, loading, error, reload } = useFetch(getDashboard, [])

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  const { stats, activeSessions, recentSessions, popularGames } = data

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Bon dia, {data.currentUserName ?? user?.name} 👋</div>
        <div className="page-sub">
          {new Date().toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {activeSessions?.length > 0 && (
        <div className="playing-bar">
          <span className="pulse" />
          <strong>En joc ara:</strong>
          <span>
            {activeSessions.map((s, i) => (
              <span key={s.id}>
                {s.memberName} juga a <strong style={{ color: 'var(--text)' }}>{s.gameName}</strong> · {s.platform}
                {i < activeSessions.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="label">Jocs totals</div>
          <div className="value">{stats.totalGames}</div>
          <div className="sub">{stats.totalPlatforms} plataformes</div>
        </div>
        <div className="stat-card green-c">
          <div className="label">Disponibles ara</div>
          <div className="value">{stats.availableGames}</div>
          <div className="sub">{stats.inUseGames} en ús</div>
        </div>
        <div className="stat-card">
          <div className="label">Membres</div>
          <div className="value">{stats.memberCount}</div>
          <div className="sub">{stats.familyName}</div>
        </div>
        <div className="stat-card">
          <div className="label">Hores aquest mes</div>
          <div className="value">{stats.hoursThisMonth}h</div>
          <div className="sub">{stats.hoursVsLastMonth}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            Partides recents
          </div>
          <div className="detail-panel" style={{ padding: 16 }}>
            {!recentSessions?.length && (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                Encara no hi ha partides registrades.
              </div>
            )}
            {recentSessions?.map((s) => (
              <div className="session-item" key={s.id}>
                <div className="game-icon">{s.gameEmoji}</div>
                <div className="session-info">
                  <strong>{s.gameName}</strong>
                  <span>{s.memberName} · {s.platform}</span>
                </div>
                {s.isLive
                  ? <div className="session-live"><span className="pulse" />En curs</div>
                  : <div className="session-duration">{s.duration}</div>
                }
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            Jocs populars
          </div>
          <div className="detail-panel" style={{ padding: 16 }}>
            {!popularGames?.length && (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                Sense dades de joc encara.
              </div>
            )}
            {popularGames?.map((g) => (
              <div className="session-item" key={g.id}>
                <div className="game-icon">{g.emoji}</div>
                <div className="session-info">
                  <strong>{g.name}</strong>
                </div>
                <span className="session-duration">{g.totalHours}h totals</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
