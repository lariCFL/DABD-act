import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getSessions, getFamily, getGames } from '../services/api'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15

const PLATFORM_TAG = {
  Steam: 'tag-green', Xbox: 'tag-blue', 'Xbox Game Pass': 'tag-blue',
  PlayStation: 'tag-purple', 'PlayStation Store': 'tag-purple',
  Nintendo: 'tag-amber', 'Nintendo eShop': 'tag-amber',
}
function platformTag(p) { return PLATFORM_TAG[p] ?? 'tag-gray' }

export default function PartidesPage() {
  const [search,   setSearch]   = useState('')
  const [memberId, setMemberId] = useState('')
  const [gameId,   setGameId]   = useState('')
  const [page,     setPage]     = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getSessions({ search, memberId, gameId, page, limit: PAGE_LIMIT }),
    [search, memberId, gameId, page]
  )
  const { data: family   } = useFetch(getFamily, [])
  const { data: gamesRes } = useFetch(() => getGames({ limit: 200 }), [])

  const sessions   = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const members    = family?.members ?? []
  const games      = gamesRes?.data ?? gamesRes ?? []

  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  const activeSessions = sessions.filter((s) => s.isLive)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Historial de partides</div>
        <div className="page-sub">Registre complet de totes les sessions de joc de la família</div>
      </div>

      {activeSessions.length > 0 && (
        <div className="playing-bar">
          <span className="pulse" />
          <strong>{activeSessions.length} en curs ara:</strong>
          <span>{activeSessions.map((s) => `${s.memberName} (${s.gameName})`).join(' · ')}</span>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Cercar per joc o jugador..."
            value={search}
            onChange={applyFilter(setSearch)}
          />
        </div>
        <select className="filter-select" value={memberId} onChange={applyFilter(setMemberId)}>
          <option value="">Tots els membres</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter-select" value={gameId} onChange={applyFilter(setGameId)}>
          <option value="">Tots els jocs</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
        </select>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="player-play" title="Cap partida trobada" text="Juga des de la Biblioteca per registrar partides." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Joc</th>
                <th>Jugador</th>
                <th>Plataforma</th>
                <th>Inici</th>
                <th>Fi</th>
                <th>Durada</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.gameEmoji} {s.gameName}</strong></td>
                  <td>{s.memberName}</td>
                  <td>
                    <span className={`tag ${platformTag(s.platform)}`}>{s.platform}</span>
                  </td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{s.startedAt}</td>
                  <td>
                    {s.isLive
                      ? <span className="session-live"><span className="pulse" />En curs</span>
                      : <span style={{ color: 'var(--text2)', fontSize: 12 }}>{s.endedAt}</span>
                    }
                  </td>
                  <td>
                    {s.isLive
                      ? <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>+{s.elapsed}</span>
                      : <span className="session-duration">{s.duration}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
