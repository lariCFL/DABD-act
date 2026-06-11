import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getDevices, createDevice, updateDevice, deleteDevice, getFamily } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15

const DEVICE_TYPES = [
  'Windows PC', 'macOS', 'Linux',
  'PlayStation 5', 'PlayStation 4',
  'Xbox Series X', 'Xbox Series S', 'Xbox One',
  'Nintendo Switch', 'Nintendo Switch OLED', 'Nintendo Switch Lite',
  'iPhone', 'iPad', 'Android',
  'Smart TV', 'Steam Deck',
]

export default function DispositiusPage() {
  const { user, openModal, closeModal, showToast } = useApp()
  const [search,   setSearch]   = useState('')
  const [memberId, setMemberId] = useState('')
  const [page,     setPage]     = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getDevices({ search, memberId, page, limit: PAGE_LIMIT }),
    [search, memberId, page]
  )
  const { data: family } = useFetch(getFamily, [])

  const devices    = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const members    = family?.members ?? []

  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  // ── CREATE ────────────────────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir dispositiu',
      body: (
        <DeviceForm
          members={members}
          isAdmin={user?.isAdmin}
          currentUserId={user?.id}
          onSubmit={async (formData) => {
            try {
              await createDevice(formData)
              closeModal(); showToast('Dispositiu afegit'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
  function openEdit(device) {
    openModal({
      title: 'Editar dispositiu',
      body: (
        <DeviceForm
          initial={device}
          members={members}
          isAdmin={user?.isAdmin}
          currentUserId={user?.id}
          onSubmit={async (formData) => {
            try {
              await updateDevice(device.id, formData)
              closeModal(); showToast('Dispositiu actualitzat'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  function handleDelete(device) {
    openModal({
      title: 'Eliminar dispositiu',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols eliminar el dispositiu{' '}
            <strong style={{ color: 'var(--text)' }}>{device.name ?? device.type}</strong>?
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await deleteDevice(device.id)
              closeModal(); showToast('Dispositiu eliminat', 'error'); reload()
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
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Dispositius</div>
          <div className="page-sub">Dispositius físics registrats a la família</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Afegir dispositiu
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text" placeholder="Cercar dispositius..."
            value={search} onChange={applyFilter(setSearch)}
          />
        </div>
        <select className="filter-select" value={memberId} onChange={applyFilter(setMemberId)}>
          <option value="">Tots els membres</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {devices.length === 0 ? (
        <EmptyState icon="devices" title="Cap dispositiu trobat" text="Afegeix dispositius físics de la família." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dispositiu</th>
                <th>Propietari</th>
                <th>Nota</th>
                <th>Accions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const canEdit = user?.isAdmin || String(d.memberId) === String(user?.id)
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <DeviceIcon type={d.type} />
                        <div>
                          <strong>{d.name ?? d.type}</strong>
                          {d.name && <div className="cell-sub">{d.type}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{d.memberName}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{d.notes ?? '—'}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      {canEdit ? (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}>
                            <i className="ti ti-pencil" /> Editar
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>
                            <i className="ti ti-trash" />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)', padding: '5px 0' }}>
                          Dispositiu d'un altre membre
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

// ── Device Icon ───────────────────────────────────────────────────────────────
function DeviceIcon({ type = '' }) {
  const t = type.toLowerCase()
  let icon = 'device-desktop'
  if (t.includes('playstation'))  icon = 'device-gamepad-2'
  else if (t.includes('xbox'))    icon = 'brand-xbox'
  else if (t.includes('nintendo') || t.includes('switch')) icon = 'device-gamepad'
  else if (t.includes('iphone') || t.includes('android'))  icon = 'device-mobile'
  else if (t.includes('ipad'))    icon = 'device-tablet'
  else if (t.includes('macos'))   icon = 'brand-apple'
  else if (t.includes('linux'))   icon = 'brand-ubuntu'
  else if (t.includes('steam deck')) icon = 'device-gamepad-2'
  else if (t.includes('tv'))      icon = 'device-tv'

  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8,
      background: 'var(--bg4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text2)',
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 16 }} />
    </div>
  )
}

// ── Device Form ───────────────────────────────────────────────────────────────
function DeviceForm({ initial = {}, members, isAdmin, currentUserId, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    type:     initial.type     ?? '',
    name:     initial.name     ?? '',
    notes:    initial.notes    ?? '',
    memberId: initial.memberId ?? (isAdmin ? '' : currentUserId ?? ''),
  })
  const [customType, setCustomType] = useState(!DEVICE_TYPES.includes(initial.type ?? ''))
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="form-group">
        <label>Tipus de dispositiu *</label>
        {!customType ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.type} onChange={set('type')} style={{ flex: 1 }}>
              <option value="">Selecciona un tipus...</option>
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCustomType(true)}>
              + Altre
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text" placeholder="p.e. Smart TV Samsung"
              value={form.type} onChange={set('type')} style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCustomType(false)}>
              Llista
            </button>
          </div>
        )}
      </div>
      <div className="form-group">
        <label>Nom personalitzat (opcional)</label>
        <input type="text" placeholder='p.e. "La PlayStation del saló"' value={form.name} onChange={set('name')} />
      </div>
      <div className="form-group">
        <label>Notes (opcional)</label>
        <input type="text" placeholder="p.e. Necessita adaptador HDMI" value={form.notes} onChange={set('notes')} />
      </div>
      {isAdmin ? (
        <div className="form-group">
          <label>Propietari *</label>
          <select value={form.memberId} onChange={set('memberId')}>
            <option value="">Selecciona un membre...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
          El dispositiu s'assignarà al teu perfil.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button
          className="btn btn-primary"
          onClick={() => onSubmit(form)}
          disabled={!form.type || (!isAdmin && !form.memberId && !currentUserId)}
        >
          Guardar
        </button>
      </div>
    </>
  )
}
