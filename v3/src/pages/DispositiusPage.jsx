import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getDevices, createDevice, updateDevice, deleteDevice, getFamily } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15

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
          isAdmin={false}
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
                const canEdit = String(d.memberId) === String(user?.id)
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <DeviceIcon tipo={d.tipo} fabricant={d.fabricant} />
                        <div>
                          <strong>{d.nom ?? d.name}</strong>
                          <div className="cell-sub">
                            {d.tipo === 'Consola'
                              ? `${d.fabricant} · Gen. ${d.generacio}`
                              : d.sit_ope}
                          </div>
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
function DeviceIcon({ tipo = '', fabricant = '' }) {
  let icon = 'device-desktop'
  if (tipo === 'Consola') {
    const f = fabricant.toLowerCase()
    if (f.includes('sony'))      icon = 'device-gamepad-2'
    else if (f.includes('microsoft')) icon = 'brand-xbox'
    else if (f.includes('nintendo')) icon = 'device-gamepad'
    else icon = 'device-gamepad'
  }
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
    tipo:      initial.tipo      ?? '',
    nom:       initial.nom       ?? initial.name ?? '',
    fabricant: initial.fabricant ?? '',
    generacio: initial.generacio ?? '',
    sit_ope:   initial.sit_ope   ?? '',
    notes:     initial.notes     ?? '',
    memberId:  initial.memberId  ?? (isAdmin ? '' : currentUserId ?? ''),
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const isConsola   = form.tipo === 'Consola'
  const isOrdinador = form.tipo === 'Ordinador'

  const canSave =
    form.tipo && form.nom &&
    (isConsola   ? (form.fabricant && form.generacio) : true) &&
    (isOrdinador ? form.sit_ope                       : true) &&
    (isAdmin ? form.memberId : true)

  return (
    <>
      <div className="form-group">
        <label>Categoria *</label>
        <select value={form.tipo} onChange={set('tipo')}>
          <option value="">Selecciona...</option>
          <option value="Consola">Consola</option>
          <option value="Ordinador">Ordinador / PC</option>
        </select>
      </div>
      <div className="form-group">
        <label>Nom del dispositiu *</label>
        <input type="text" placeholder='p.e. "PS5 del saló"' value={form.nom} onChange={set('nom')} />
      </div>
      {isConsola && (
        <div className="form-row">
          <div className="form-group">
            <label>Fabricant *</label>
            <input type="text" placeholder="p.e. Sony, Microsoft, Nintendo" value={form.fabricant} onChange={set('fabricant')} />
          </div>
          <div className="form-group">
            <label>Generació *</label>
            <input type="number" min={1} placeholder="p.e. 5" value={form.generacio} onChange={set('generacio')} />
          </div>
        </div>
      )}
      {isOrdinador && (
        <div className="form-group">
          <label>Sistema operatiu *</label>
          <input type="text" placeholder="p.e. Windows, macOS, Linux, SteamOS" value={form.sit_ope} onChange={set('sit_ope')} />
        </div>
      )}
      <div className="form-group">
        <label>Notes (opcional)</label>
        <input type="text" placeholder="p.e. 4K HDR, 32GB RAM…" value={form.notes} onChange={set('notes')} />
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
        <button className="btn btn-primary" onClick={() => onSubmit(form)} disabled={!canSave}>
          Guardar
        </button>
      </div>
    </>
  )
}
