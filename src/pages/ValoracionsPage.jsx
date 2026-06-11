import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getRatings, getGames, getDistributors, createRating, updateRating, deleteRating } from '../services/api'
import { useApp } from '../context/AppContext'
import { Stars, LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15

export default function ValoracionsPage() {
  const { openModal, closeModal, showToast } = useApp()
  const [tab, setTab]       = useState('game')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getRatings({ type: tab, search, page, limit: PAGE_LIMIT }),
    [tab, search, page]
  )
  const { data: gamesRes }     = useFetch(getGames, [])
  const { data: distributors } = useFetch(getDistributors, [])

  const ratings    = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const games      = gamesRes?.data ?? gamesRes ?? []

  function applySearch(e) { setSearch(e.target.value); setPage(1) }
  function switchTab(t)   { setTab(t); setSearch(''); setPage(1) }

  // ── CREATE ────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir valoració',
      body: (
        <RatingForm
          targetType={tab}
          games={games}
          distributors={Array.isArray(distributors) ? distributors : []}
          onSubmit={async (formData) => {
            await createRating({ ...formData, targetType: tab })
            closeModal(); showToast('Valoració guardada'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── UPDATE ────────────────────────────────────────────────
  function openEdit(rating) {
    openModal({
      title: 'Editar valoració',
      body: (
        <RatingForm
          initial={rating}
          targetType={tab}
          games={games}
          distributors={Array.isArray(distributors) ? distributors : []}
          onSubmit={async (formData) => {
            await updateRating(rating.id, formData)
            closeModal(); showToast('Valoració actualitzada'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────
  async function handleDelete(rating) {
    if (!confirm('Eliminar aquesta valoració?')) return
    try {
      await deleteRating(rating.id)
      showToast('Valoració eliminada', 'error'); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Valoracions</div>
        <div className="page-sub">Puntuacions de la família als jocs i distribuïdors</div>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'game' ? ' active' : ''}`} onClick={() => switchTab('game')}>Jocs</div>
        <div className={`tab${tab === 'distributor' ? ' active' : ''}`} onClick={() => switchTab('distributor')}>Distribuïdors</div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Cercar valoracions..."
            value={search}
            onChange={applySearch}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Afegir valoració</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tab === 'game' ? 'Joc' : 'Distribuïdor'}</th>
              <th>Membre</th>
              <th>Puntuació</th>
              <th>Comentari</th>
              <th>Data</th>
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            {ratings.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cap valoració trobada</td></tr>
            )}
            {ratings.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.targetEmoji} {r.targetName}</strong></td>
                <td>{r.memberName}</td>
                <td><Stars value={r.score} /></td>
                <td style={{ color: 'var(--text2)', fontSize: 12, maxWidth: 220 }}>{r.comment}</td>
                <td style={{ color: 'var(--text3)', fontSize: 12 }}>{r.date}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>✏ Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>✕</button>
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

function RatingForm({ initial = {}, targetType, games, distributors, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    targetId: initial.targetId ?? '',
    score:    initial.score    ?? 0,
    comment:  initial.comment  ?? '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const options = targetType === 'game' ? games : distributors

  return (
    <>
      <div className="form-group">
        <label>{targetType === 'game' ? 'Joc' : 'Distribuïdor'}</label>
        <select value={form.targetId} onChange={set('targetId')}>
          <option value="">Selecciona...</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.emoji ? `${o.emoji} ` : ''}{o.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Puntuació</label>
        <Stars
          value={form.score}
          interactive
          onChange={(v) => setForm((f) => ({ ...f, score: v }))}
        />
      </div>
      <div className="form-group">
        <label>Comentari (opcional)</label>
        <textarea rows={3} placeholder="Afegeix un comentari..." value={form.comment} onChange={set('comment')}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit(form)}>Guardar</button>
      </div>
    </>
  )
}
