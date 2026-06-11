import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getPlatforms, createPlatform, updatePlatform, deletePlatform } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 10

// Known device types for the platform compatibility selector
const ALL_DEVICE_TYPES = [
  'Windows PC', 'macOS', 'Linux',
  'PlayStation 5', 'PlayStation 4',
  'Xbox Series X', 'Xbox Series S', 'Xbox One',
  'Nintendo Switch', 'Nintendo Switch OLED',
  'iPhone', 'iPad', 'Android',
  'Smart TV', 'Steam Deck',
]

export default function PlataformesPage() {
  const { user, openModal, closeModal, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getPlatforms({ search, page, limit: PAGE_LIMIT }),
    [search, page]
  )

  const platforms  = data?.data ?? data ?? []
  const totalPages = data?.totalPages ?? 1

  function applySearch(e) { setSearch(e.target.value); setPage(1) }

  // ── CREATE ────────────────────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir plataforma',
      body: (
        <PlatformForm
          onSubmit={async (formData) => {
            try {
              await createPlatform(formData)
              closeModal(); showToast('Plataforma afegida'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
  function openEdit(platform) {
    openModal({
      title: 'Editar plataforma',
      body: (
        <PlatformForm
          initial={platform}
          onSubmit={async (formData) => {
            try {
              await updatePlatform(platform.id, formData)
              closeModal(); showToast('Plataforma actualitzada'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  function handleDelete(platform) {
    openModal({
      title: 'Eliminar plataforma',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols eliminar la plataforma <strong style={{ color: 'var(--text)' }}>{platform.name}</strong>?
            Això pot afectar els comptes i jocs associats.
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await deletePlatform(platform.id)
              closeModal(); showToast('Plataforma eliminada', 'error'); reload()
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

  const isAdmin = user?.isAdmin ?? false

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Plataformes</div>
          <div className="page-sub">Plataformes de distribució digital configurades</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openAdd}>
            <i className="ti ti-plus" /> Afegir plataforma
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text" placeholder="Cercar plataformes..."
            value={search} onChange={applySearch}
          />
        </div>
      </div>

      {(Array.isArray(platforms) ? platforms : []).length === 0 ? (
        <EmptyState icon="app-window" title="Cap plataforma trobada" text="Les plataformes s'utilitzen per als comptes i jocs." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Descripció</th>
                <th>Dispositius compatibles</th>
                <th>Jocs</th>
                <th>Valoració avg.</th>
                {isAdmin && <th>Accions</th>}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(platforms) ? platforms : []).map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td style={{ color: 'var(--text2)', fontSize: 12, maxWidth: 200 }}>{p.description}</td>
                  <td>
                    {(p.devices ?? []).map((dev) => (
                      <span key={dev} className="tag tag-gray" style={{ marginRight: 3 }}>{dev}</span>
                    ))}
                  </td>
                  <td>{p.gameCount ?? '—'}</td>
                  <td>
                    {p.avgRating
                      ? <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                          {'★'.repeat(Math.round(p.avgRating))} {p.avgRating}
                        </span>
                      : '—'}
                  </td>
                  {isAdmin && (
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                        <i className="ti ti-pencil" /> Editar
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  )}
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

// ── Platform Form ─────────────────────────────────────────────────────────────
function PlatformForm({ initial = {}, onSubmit, onCancel }) {
  const [name,        setName]    = useState(initial.name        ?? '')
  const [description, setDesc]    = useState(initial.description ?? '')
  const [devices,     setDevices] = useState(initial.devices     ?? [])

  function toggleDevice(dev) {
    setDevices((d) => d.includes(dev) ? d.filter((x) => x !== dev) : [...d, dev])
  }

  return (
    <>
      <div className="form-group">
        <label>Nom *</label>
        <input type="text" placeholder="p.e. Epic Games Store" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Descripció</label>
        <input type="text" placeholder="Breu descripció..." value={description} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Dispositius compatibles</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {ALL_DEVICE_TYPES.map((dev) => {
            const checked = devices.includes(dev)
            return (
              <label key={dev} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                color: checked ? 'var(--accent2)' : 'var(--text2)',
                cursor: 'pointer', padding: '4px 8px',
                background: checked ? 'var(--accent-bg)' : 'var(--bg4)',
                borderRadius: 'var(--radius)', border: `1px solid ${checked ? 'var(--accent)' : 'transparent'}`,
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggleDevice(dev)} style={{ display: 'none' }} />
                {dev}
              </label>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit({ name, description, devices })} disabled={!name.trim()}>
          Guardar
        </button>
      </div>
    </>
  )
}
