import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getGames, getDistributors, createGame, updateGame, deleteGame, startSession } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 10

const PLATFORM_TAG = { Steam: 'tag-green', Xbox: 'tag-blue', PlayStation: 'tag-purple', Nintendo: 'tag-purple' }

export default function BibliotecaPage() {
  const { openModal, closeModal, showToast } = useApp()
  const [search, setSearch]       = useState('')
  const [genre, setGenre]         = useState('')
  const [platform, setPlatform]   = useState('')
  const [page, setPage]           = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getGames({ search, genre, platform, page, limit: PAGE_LIMIT }),
    [search, genre, platform, page]
  )
  const { data: distributors } = useFetch(getDistributors, [])

  const games      = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  // Reset to page 1 when filters change
  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  // ── CREATE ────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir joc',
      body: (
        <GameForm
          distributors={distributors ?? []}
          onSubmit={async (formData) => {
            await createGame(formData)
            closeModal(); showToast('Joc afegit'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── UPDATE ────────────────────────────────────────────────
  function openEdit(game) {
    openModal({
      title: 'Editar joc',
      body: (
        <GameForm
          initial={game}
          distributors={distributors ?? []}
          onSubmit={async (formData) => {
            await updateGame(game.id, formData)
            closeModal(); showToast('Joc actualitzat'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────
  async function handleDelete(game) {
    if (!confirm(`Eliminar "${game.name}"?`)) return
    try {
      await deleteGame(game.id)
      showToast('Joc eliminat', 'error'); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  // ── PLAY ─────────────────────────────────────────────────
  function openPlay(game) {
    openModal({
      title: 'Iniciar partida',
      body: <PlayGameForm game={game} />,
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-primary" onClick={async () => {
            const sel = document.getElementById('play-account')?.value
            await startSession({ gameId: game.id, accountId: sel })
            closeModal(); showToast('Partida iniciada! Bon joc 🎮'); reload()
          }}>
            Iniciar partida
          </button>
        </>
      ),
    })
  }

  const allGenres    = [...new Set(games.map((g) => g.genre).filter(Boolean))]
  const allPlatforms = [...new Set(games.flatMap((g) => g.platforms ?? []))]

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Biblioteca de jocs</div>
        <div className="page-sub">Tots els jocs disponibles a la família</div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Cercar jocs..."
            value={search}
            onChange={applyFilter(setSearch)}
          />
        </div>
        <select className="filter-select" value={genre} onChange={applyFilter(setGenre)}>
          <option value="">Tots els gèneres</option>
          {allGenres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-select" value={platform} onChange={applyFilter(setPlatform)}>
          <option value="">Totes les plataformes</option>
          {allPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>
          + Afegir joc
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Joc</th>
              <th>Gènere</th>
              <th>Plataformes</th>
              <th>+Edat</th>
              <th>Estat</th>
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cap joc trobat</td></tr>
            )}
            {games.map((g) => (
              <tr key={g.id}>
                <td><strong>{g.emoji} {g.name}</strong></td>
                <td>{g.genre}</td>
                <td>
                  {(g.platforms ?? []).map((p) => (
                    <span key={p} className={`tag ${PLATFORM_TAG[p] ?? 'tag-gray'}`} style={{ marginRight: 4 }}>{p}</span>
                  ))}
                </td>
                <td>+{g.ageRating}</td>
                <td>
                  <span className={`tag ${g.available ? 'tag-green' : 'tag-red'}`}>
                    {g.available ? 'Disponible' : 'En ús'}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {g.available && (
                    <button className="btn btn-primary btn-sm" onClick={() => openPlay(g)}>▶ Jugar</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}>✏ Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g)}>✕</button>
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

function PlayGameForm({ game }) {
  return (
    <>
      <div className="form-group">
        <label>Compte a utilitzar</label>
        <select id="play-account">
          {(game.accounts ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.username} ({a.platform})</option>
          ))}
        </select>
      </div>
    </>
  )
}

function GameForm({ initial = {}, distributors, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name:          initial.name          ?? '',
    genre:         initial.genre         ?? '',
    ageRating:     initial.ageRating     ?? 0,
    emoji:         initial.emoji         ?? '🎮',
    distributorId: initial.distributorId ?? '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="form-group">
        <label>Nom del joc</label>
        <input type="text" value={form.name} onChange={set('name')} placeholder="p.e. The Legend of Zelda" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Gènere</label>
          <input type="text" value={form.genre} onChange={set('genre')} placeholder="p.e. Aventura" />
        </div>
        <div className="form-group">
          <label>Edat mínima</label>
          <input type="number" value={form.ageRating} onChange={set('ageRating')} min={0} max={18} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Emoji</label>
          <input type="text" value={form.emoji} onChange={set('emoji')} maxLength={2} />
        </div>
        <div className="form-group">
          <label>Distribuïdor</label>
          <select value={form.distributorId} onChange={set('distributorId')}>
            <option value="">Selecciona...</option>
            {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit(form)}>Guardar</button>
      </div>
    </>
  )
}
