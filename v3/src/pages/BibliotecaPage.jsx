import { useState, useMemo } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getGames, getPlatforms, createGame, updateGame, deleteGame, startSession, stopSession, getGameAccounts, getAccounts, getSessions } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 12

const PLATFORM_TAG = {
  Steam: 'tag-green', 'Xbox Game Pass': 'tag-blue', 'Xbox': 'tag-blue',
  PlayStation: 'tag-purple', 'PlayStation Store': 'tag-purple',
  'Nintendo eShop': 'tag-amber', Nintendo: 'tag-amber',
}
function platformTag(p) { return PLATFORM_TAG[p] ?? 'tag-gray' }

export default function BibliotecaPage() {
  const { user, openModal, closeModal, showToast } = useApp()

  // Browse filters
  const [search,   setSearch]   = useState('')
  const [genre,    setGenre]    = useState('')
  const [platform, setPlatform] = useState('')
  const [page,     setPage]     = useState(1)

  // Edit mode
  const [editMode,      setEditMode]      = useState(false)
  const [editSearch,    setEditSearch]    = useState('')
  const [editPlatform,  setEditPlatform]  = useState('')

  const browseParams = { search, genre, platform, page, limit: PAGE_LIMIT }
  const editParams   = { search: editSearch, platform: editPlatform, ownedByMe: true, page: 1, limit: 100 }

  const { data, loading, error, reload } = useFetch(
    () => getGames(editMode ? editParams : browseParams),
    [editMode, search, genre, platform, editSearch, editPlatform, page]
  )
  const { data: platformsData } = useFetch(() => getPlatforms({ limit: 100 }), [])

  // Family-wide accounts (for owner names) and live sessions (for per-account availability)
  const { data: accountsData } = useFetch(() => getAccounts({ limit: 100 }), [])
  const { data: sessionsData } = useFetch(() => getSessions({ limit: 100 }), [])

  const games      = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const platforms  = platformsData?.data ?? platformsData ?? []
  const allAccounts = accountsData?.data ?? []
  const liveSessions = (sessionsData?.data ?? []).filter((s) => s.isLive)

  const accountsById = useMemo(
    () => new Map(allAccounts.map((a) => [String(a.id), a])),
    [allAccounts]
  )
  const liveSessionsByKey = useMemo(
    () => new Map(liveSessions.map((s) => [`${s.gameId}::${s.accountId}`, s])),
    [liveSessions]
  )

  // Enrich a game's accounts with owner name and per-account availability
  function enrichAccounts(gameId, rawAccounts) {
    return (rawAccounts ?? []).map((a) => {
      const full    = accountsById.get(String(a.id))
      const session = liveSessionsByKey.get(`${gameId}::${a.id}`)
      return {
        ...a,
        memberName: a.memberName ?? full?.memberName ?? '—',
        platform:   a.platform   ?? full?.platformName,
        username:   a.username   ?? full?.username,
        email:      a.email      ?? full?.email,
        password:   a.password   ?? full?.password,
        available:        !session,
        activeMemberId:   session?.memberId   ?? null,
        activeMemberName: session?.memberName ?? null,
        activeSessionId:  session?.id         ?? null,
      }
    })
  }

  // A game is only unavailable if ALL of its accounts are currently in use
  function enrichGame(g) {
    const accounts = enrichAccounts(g.id, g.accounts)
    if (!accounts.length) return g
    const available    = accounts.some((a) => a.available)
    const inUseAccount = accounts.find((a) => !a.available)
    const myAccount    = accounts.find((a) => String(a.activeMemberId) === String(user?.id))
    return {
      ...g,
      accounts,
      available,
      activeMemberId:    inUseAccount?.activeMemberId   ?? g.activeMemberId   ?? null,
      activeMemberName:  inUseAccount?.activeMemberName ?? g.activeMemberName ?? null,
      myActiveSessionId: myAccount?.activeSessionId ?? null,
    }
  }

  const enrichedGames = useMemo(
    () => games.map(enrichGame),
    [games, accountsById, liveSessionsByKey, user]
  )

  // All genre options from current result set
  const allGenres = useMemo(() => [...new Set(games.map((g) => g.genre).filter(Boolean))], [games])

  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }
  function toggleEditMode() {
    setEditMode((m) => !m)
    setEditSearch(''); setEditPlatform('')
  }

  // ── STOP ────────────────────────────────────────────────────────────────────
  async function handleStop(game) {
    try {
      await stopSession(game.myActiveSessionId ?? game.activeSessionId)
      showToast(`Partida de ${game.name} finalitzada`); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  // ── PLAY ────────────────────────────────────────────────────────────────────
  async function openPlay(game) {
    let accounts = game.accounts
    // If not embedded, fetch from dedicated endpoint and enrich locally
    if (!accounts?.length) {
      try { accounts = enrichAccounts(game.id, await getGameAccounts(game.id)) } catch { accounts = [] }
    }
    const availableAccounts = accounts.filter((a) => a.available)
    openModal({
      title: `▶ Jugar a ${game.name}`,
      body: <PlayGameForm game={game} accounts={accounts} />,
      footer: availableAccounts.length === 0 ? (
        <button className="btn btn-ghost" onClick={closeModal}>Tancar</button>
      ) : (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-primary" onClick={async () => {
            const accountId = document.getElementById('play-account')?.value
            if (!accountId) { showToast('Selecciona un compte', 'error'); return }
            try {
              await startSession({ gameId: game.id, accountId })
              closeModal(); showToast('Partida iniciada! Bon joc 🎮'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}>
            <i className="ti ti-player-play" /> Iniciar partida
          </button>
        </>
      ),
    })
  }

  // ── CREATE ───────────────────────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir joc',
      body: (
        <GameForm
          platforms={platforms}
          onSubmit={async (formData) => {
            try {
              await createGame(formData)
              closeModal(); showToast('Joc afegit correctament'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  function openEdit(game) {
    openModal({
      title: 'Editar joc',
      body: (
        <GameForm
          initial={game}
          platforms={platforms}
          onSubmit={async (formData) => {
            try {
              await updateGame(game.id, formData)
              closeModal(); showToast('Joc actualitzat'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  async function handleDelete(game) {
    openModal({
      title: 'Eliminar joc',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols eliminar <strong style={{ color: 'var(--text)' }}>{game.emoji} {game.name}</strong>?
            Aquesta acció no es pot desfer.
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await deleteGame(game.id)
              closeModal(); showToast('Joc eliminat', 'error'); reload()
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

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  if (editMode) {
    // Group games by platform
    const grouped = {}
    enrichedGames.forEach((g) => {
      const pls = g.platforms?.length ? g.platforms : ['Sense plataforma']
      pls.forEach((p) => {
        if (!grouped[p]) grouped[p] = []
        grouped[p].push(g)
      })
    })

    return (
      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Editar biblioteca</div>
            <div className="page-sub">Només es mostren els teus jocs. Agrupa per plataforma.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={openAdd}>
              <i className="ti ti-plus" /> Afegir joc
            </button>
            <button className="btn btn-ghost" onClick={toggleEditMode}>
              <i className="ti ti-x" /> Sortir de l'edició
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <i className="ti ti-search" />
            <input
              type="text" placeholder="Cercar els teus jocs..."
              value={editSearch} onChange={(e) => setEditSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={editPlatform} onChange={(e) => setEditPlatform(e.target.value)}>
            <option value="">Totes les plataformes</option>
            {platforms.map((p) => <option key={p.id ?? p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        {Object.keys(grouped).length === 0 && (
          <EmptyState icon="device-gamepad-2" title="Cap joc teu" text="Afegeix un joc per veure'l aquí." />
        )}

        {Object.entries(grouped).map(([plat, gList]) => (
          <div key={plat} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className={`tag ${platformTag(plat)}`} style={{ fontSize: 12, padding: '4px 10px' }}>{plat}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{gList.length} jocs</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Joc</th><th>Gènere</th><th>+Edat</th><th>Estat</th><th>Accions</th>
                  </tr>
                </thead>
                <tbody>
                  {gList.map((g) => {
                    const isOwner = String(g.ownerId) === String(user?.id)
                    return (
                      <tr key={g.id}>
                        <td><strong>{g.emoji} {g.name}</strong></td>
                        <td style={{ color: 'var(--text2)' }}>{g.genre}</td>
                        <td>+{g.ageRating}</td>
                        <td>
                          <span className={`tag ${g.available ? 'tag-green' : 'tag-red'}`}>
                            {g.available ? 'Disponible' : 'En ús'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          {isOwner ? (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}>
                                <i className="ti ti-pencil" /> Editar
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g)}>
                                <i className="ti ti-trash" />
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text3)', padding: '5px 0' }}>
                              Joc d'un altre membre
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── BROWSE MODE ───────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Biblioteca de jocs</div>
          <div className="page-sub">Tots els jocs disponibles a la família</div>
        </div>
        <button className="btn btn-ghost" onClick={toggleEditMode}>
          <i className="ti ti-pencil" /> Editar biblioteca
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text" placeholder="Cercar jocs..."
            value={search} onChange={applyFilter(setSearch)}
          />
        </div>
        <select className="filter-select" value={genre} onChange={applyFilter(setGenre)}>
          <option value="">Tots els gèneres</option>
          {allGenres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="filter-select" value={platform} onChange={applyFilter(setPlatform)}>
          <option value="">Totes les plataformes</option>
          {platforms.map((p) => <option key={p.id ?? p.name} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      {enrichedGames.length === 0 ? (
        <EmptyState icon="device-gamepad-2" title="Cap joc trobat" text="Prova a canviar els filtres de cerca." />
      ) : (
        <div className="cards-grid">
          {enrichedGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              onPlay={() => openPlay(g)}
              onStop={g.myActiveSessionId ? () => handleStop(g) : null}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function GameCard({ game: g, onPlay, onStop }) {
  return (
    <div className="game-card">
      <div className="game-card-cover">
        <span style={{ fontSize: 44 }}>{g.emoji}</span>
        <span className={`available-tag${g.available ? '' : ' taken-tag'}`}>
          {g.available ? 'Disponible' : 'En ús'}
        </span>
      </div>
      <div className="game-card-body">
        <h3>{g.name}</h3>
        <p>{g.genre} · +{g.ageRating}</p>
        <div className="card-meta">
          {(g.platforms ?? []).map((p) => (
            <span key={p} className={`tag ${platformTag(p)}`}>{p}</span>
          ))}
        </div>
        {!g.available && g.activeMemberName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', margin: '8px 0 4px' }}>
            <span className="pulse" style={{ flexShrink: 0 }} />
            <span>{g.activeMemberName} jugant ara</span>
          </div>
        )}
        <div className="card-actions">
          {g.available && (
            <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onPlay}>
              <i className="ti ti-player-play" /> Jugar
            </button>
          )}
          {onStop && (
            <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onStop}>
              <i className="ti ti-player-stop" /> Aturar partida
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayGameForm({ game, accounts }) {
  const availableAccounts = useMemo(() => accounts.filter((a) => a.available), [accounts])
  const unavailableAccounts = useMemo(() => accounts.filter((a) => !a.available), [accounts])
  const [selectedId, setSelectedId] = useState(availableAccounts[0]?.id ?? '')
  const selected = accounts.find((a) => String(a.id) === String(selectedId))

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ color: 'var(--text2)', fontSize: 14, padding: '8px 0' }}>
        <i className="ti ti-alert-circle" style={{ color: 'var(--amber)', marginRight: 6 }} />
        No hi ha comptes disponibles per a <strong>{game.name}</strong>.
        Assegura't que el joc té comptes assignats a la secció de Comptes.
      </div>
    )
  }

  if (availableAccounts.length === 0) {
    return (
      <div style={{ color: 'var(--text2)', fontSize: 14, padding: '8px 0' }}>
        <i className="ti ti-alert-circle" style={{ color: 'var(--amber)', marginRight: 6 }} />
        Tots els comptes de <strong>{game.name}</strong> estan actualment en ús.
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
          {unavailableAccounts.map((a) => (
            <div key={a.id}>{a.memberName} — {a.platform} (en ús{a.activeMemberName ? ` per ${a.activeMemberName}` : ''})</div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
        Selecciona el compte amb el qual vols jugar a <strong style={{ color: 'var(--text)' }}>{game.emoji} {game.name}</strong>.
      </p>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Compte a utilitzar</label>
        <select id="play-account" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {availableAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.memberName} — {a.platform}
            </option>
          ))}
        </select>
      </div>
      {unavailableAccounts.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
          No disponibles: {unavailableAccounts.map((a) => `${a.memberName} — ${a.platform}${a.activeMemberName ? ` (en ús per ${a.activeMemberName})` : ' (en ús)'}`).join(', ')}
        </div>
      )}
      {selected && (
        <div className="play-account-detail" style={{ marginTop: 16 }}>
          <div className="info-row">
            <span className="key">Propietari</span>
            <span className="val">{selected.memberName}</span>
          </div>
          {selected.email && (
            <div className="info-row">
              <span className="key">Correu electrònic</span>
              <span className="val">{selected.email}</span>
            </div>
          )}
          {selected.username && (
            <div className="info-row">
              <span className="key">Nom d'usuari</span>
              <span className="val">{selected.username}</span>
            </div>
          )}
          {selected.password && (
            <div className="info-row">
              <span className="key">Contrasenya</span>
              <span className="val">{selected.password}</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function GameForm({ initial = {}, platforms, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name:        initial.name        ?? '',
    genre:       initial.genre       ?? '',
    ageRating:   initial.ageRating   ?? 0,
    emoji:       initial.emoji       ?? '🎮',
    platformIds: initial.platformIds ?? [],
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function togglePlatform(id) {
    setForm((f) => ({
      ...f,
      platformIds: f.platformIds.includes(id)
        ? f.platformIds.filter((x) => x !== id)
        : [...f.platformIds, id],
    }))
  }

  function handleSubmit() {
    if (!form.name.trim()) return
    onSubmit(form)
  }

  return (
    <>
      <div className="form-group">
        <label>Nom del joc *</label>
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
      <div className="form-group">
        <label>Emoji</label>
        <input type="text" value={form.emoji} onChange={set('emoji')} maxLength={2} style={{ maxWidth: 80 }} />
      </div>
      <div className="form-group">
        <label>Plataformes</label>
        {platforms.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>No hi ha plataformes disponibles. Afegeix-ne a la secció Plataformes.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {platforms.map((p) => {
              const pid = p.id ?? p.name
              const checked = form.platformIds.includes(pid)
              return (
                <label key={pid} style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
                  color: checked ? 'var(--accent2)' : 'var(--text2)',
                  cursor: 'pointer', padding: '4px 8px',
                  background: checked ? 'var(--accent-bg)' : 'var(--bg4)',
                  borderRadius: 'var(--radius)', border: `1px solid ${checked ? 'var(--accent)' : 'transparent'}`,
                }}>
                  <input type="checkbox" checked={checked} onChange={() => togglePlatform(pid)} style={{ display: 'none' }} />
                  {p.name}
                </label>
              )
            })}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.name.trim()}>
          Guardar
        </button>
      </div>
    </>
  )
}
