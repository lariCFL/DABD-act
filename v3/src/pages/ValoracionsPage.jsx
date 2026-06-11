import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getRatings, getGames, getPlatforms, createRating, updateRating, deleteRating } from '../services/api'
import { useApp } from '../context/AppContext'
import { Stars, LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15

export default function ValoracionsPage() {
  const { user, openModal, closeModal, showToast } = useApp()
  const [tab,    setTab]    = useState('game')
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getRatings({ type: tab, search, page, limit: PAGE_LIMIT }),
    [tab, search, page]
  )
  const { data: gamesRes  } = useFetch(() => getGames({ limit: 200 }), [])
  const { data: platData  } = useFetch(() => getPlatforms({ limit: 100 }), [])

  const ratings    = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const games      = gamesRes?.data ?? gamesRes ?? []
  const platforms  = platData?.data ?? platData ?? []

  function applySearch(e) { setSearch(e.target.value); setPage(1) }
  function switchTab(t)   { setTab(t); setSearch(''); setPage(1) }

  // ── CREATE ────────────────────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir valoració',
      body: (
        <RatingForm
          targetType={tab}
          games={games}
          platforms={platforms}
          onSubmit={async (formData) => {
            try {
              await createRating({ ...formData, targetType: tab })
              closeModal(); showToast('Valoració guardada'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── UPDATE (only own ratings) ─────────────────────────────────────────────
  function openEdit(rating) {
    openModal({
      title: 'Editar valoració',
      body: (
        <RatingForm
          initial={rating}
          targetType={tab}
          games={games}
          platforms={platforms}
          onSubmit={async (formData) => {
            try {
              await updateRating(rating.id, formData)
              closeModal(); showToast('Valoració actualitzada'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE (only own ratings) ─────────────────────────────────────────────
  function handleDelete(rating) {
    openModal({
      title: 'Eliminar valoració',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols eliminar la teva valoració de{' '}
            <strong style={{ color: 'var(--text)' }}>{rating.targetName}</strong>?
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await deleteRating(rating.id)
              closeModal(); showToast('Valoració eliminada', 'error'); reload()
            } catch (e) { closeModal(); showToast(e.message, 'error') }
          }}>
            <i className="ti ti-trash" /> Eliminar
          </button>
        </>
      ),
    })
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Valoracions</div>
        <div className="page-sub">Puntuacions de la família als jocs i plataformes</div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'game'     ? ' active' : ''}`} onClick={() => switchTab('game')}>
          <i className="ti ti-device-gamepad-2" /> Jocs
        </div>
        <div className={`tab${tab === 'platform' ? ' active' : ''}`} onClick={() => switchTab('platform')}>
          <i className="ti ti-app-window" /> Plataformes
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder={`Cercar valoracions de ${tab === 'game' ? 'jocs' : 'plataformes'}...`}
            value={search}
            onChange={applySearch}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Afegir valoració
        </button>
      </div>

      {ratings.length === 0 ? (
        <EmptyState icon="star" title="Cap valoració trobada" text="Sigues el primer en valorar!" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tab === 'game' ? 'Joc' : 'Plataforma'}</th>
                <th>Membre</th>
                <th>Puntuació</th>
                <th>Comentari</th>
                <th>Data</th>
                <th>Accions</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((r) => {
                const isOwn = user?.isAdmin || String(r.memberId) === String(user?.id)
                return (
                  <tr key={r.id}>
                    <td><strong>{r.targetEmoji ? `${r.targetEmoji} ` : ''}{r.targetName}</strong></td>
                    <td>{r.memberName}</td>
                    <td><Stars value={r.score} /></td>
                    <td style={{ color: 'var(--text2)', fontSize: 12, maxWidth: 220 }}>{r.comment}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{r.date}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      {isOwn ? (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>
                            <i className="ti ti-trash" />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)', padding: '5px 0' }}>
                          Valoració d'un altre membre
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

// ── Rating Form ───────────────────────────────────────────────────────────────
function RatingForm({ initial = {}, targetType, games, platforms, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    targetId: initial.targetId ?? '',
    score:    initial.score    ?? 0,
    comment:  initial.comment  ?? '',
  })
  const set     = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const options = targetType === 'game' ? games : platforms

  return (
    <>
      <div className="form-group">
        <label>{targetType === 'game' ? 'Joc' : 'Plataforma'} *</label>
        <select value={form.targetId} onChange={set('targetId')}>
          <option value="">Selecciona...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.emoji ? `${o.emoji} ` : ''}{o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Puntuació *</label>
        <Stars
          value={form.score}
          interactive
          onChange={(v) => setForm((f) => ({ ...f, score: v }))}
        />
      </div>
      <div className="form-group">
        <label>Comentari (opcional)</label>
        <textarea
          rows={3}
          placeholder="Afegeix un comentari..."
          value={form.comment}
          onChange={set('comment')}
          style={{
            width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
            fontFamily: 'DM Sans, sans-serif', resize: 'vertical',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit(form)} disabled={!form.targetId || !form.score}>
          Guardar
        </button>
      </div>
    </>
  )
}
