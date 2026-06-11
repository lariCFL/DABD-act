import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getSessions, startSession, stopSession as apiStop, deleteSession, getGames, getFamily } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15
const PLATFORM_TAG = { Steam: 'tag-green', Xbox: 'tag-blue', PlayStation: 'tag-purple', Nintendo: 'tag-purple' }

export default function PartidesPage() {
  const { openModal, closeModal, showToast } = useApp()
  const [search, setSearch]     = useState('')
  const [memberId, setMemberId] = useState('')
  const [gameId, setGameId]     = useState('')
  const [page, setPage]         = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getSessions({ search, memberId, gameId, page, limit: PAGE_LIMIT }),
    [search, memberId, gameId, page]
  )
  const { data: family }  = useFetch(getFamily, [])
  const { data: gamesRes } = useFetch(getGames, [])

  const sessions   = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  // ── CREATE (manual, sense jugar des de Biblioteca) ────────
  function openAdd() {
    openModal({
      title: 'Registrar partida manual',
      body: (
        <SessionForm
          members={family?.members ?? []}
          games={gamesRes?.data ?? gamesRes ?? []}
          onSubmit={async (formData) => {
            await startSession(formData)
            closeModal(); showToast('Partida registrada'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── STOP ─────────────────────────────────────────────────
  function openStop(session) {
    let endTimeVal = new Date().toISOString().slice(0, 16)
    openModal({
      title: 'Finalitzar partida',
      body: (
        <div>
          <div className="form-group">
            <label>Hora d'inici</label>
            <input type="text" value={session.startedAt} disabled />
          </div>
          <div className="form-group">
            <label>Hora de fi</label>
            <input
              type="datetime-local"
              id="stop-time"
              defaultValue={endTimeVal}
              onChange={(e) => { endTimeVal = e.target.value }}
            />
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            await apiStop(session.id, { endTime: document.getElementById('stop-time')?.value })
            closeModal(); showToast('Partida finalitzada'); reload()
          }}>Finalitzar</button>
        </>
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────
  async function handleDelete(session) {
    if (!confirm('Eliminar aquest registre de partida?')) return
    try {
      await deleteSession(session.id)
      showToast('Partida eliminada', 'error'); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  const active = sessions.filter((s) => s.isLive)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Historial de partides</div>
        <div className="page-sub">Registre de totes les sessions de joc</div>
      </div>

      {active.length > 0 && (
        <div className="playing-bar">
          <span className="pulse" />
          <strong>{active.length} en curs:</strong>
          <span>{active.map((s) => `${s.memberName} (${s.gameName})`).join(' · ')}</span>
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
          {(family?.members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter-select" value={gameId} onChange={applyFilter(setGameId)}>
          <option value="">Tots els jocs</option>
          {(gamesRes?.data ?? gamesRes ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Registrar</button>
      </div>

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
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cap partida trobada</td></tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.gameEmoji} {s.gameName}</strong></td>
                <td>{s.memberName}</td>
                <td><span className={`tag ${PLATFORM_TAG[s.platform] ?? 'tag-gray'}`}>{s.platform}</span></td>
                <td>{s.startedAt}</td>
                <td>
                  {s.isLive
                    ? <span className="session-live"><span className="pulse" />En curs</span>
                    : s.endedAt}
                </td>
                <td style={{ color: s.isLive ? 'var(--green)' : undefined }}>
                  {s.isLive ? `+${s.elapsed}` : s.duration}
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {s.isLive && (
                    <button className="btn btn-danger btn-sm" onClick={() => openStop(s)}>⏹ Aturar</button>
                  )}
                  {!s.isLive && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

function SessionForm({ members, games, onSubmit, onCancel }) {
  const [form, setForm] = useState({ memberId: '', gameId: '', accountId: '', startTime: new Date().toISOString().slice(0, 16) })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <>
      <div className="form-group">
        <label>Membre</label>
        <select value={form.memberId} onChange={set('memberId')}>
          <option value="">Selecciona...</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Joc</label>
        <select value={form.gameId} onChange={set('gameId')}>
          <option value="">Selecciona...</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Inici</label>
        <input type="datetime-local" value={form.startTime} onChange={set('startTime')} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit(form)}>Registrar</button>
      </div>
    </>
  )
}
