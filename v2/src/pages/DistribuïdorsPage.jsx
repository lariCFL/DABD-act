import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getDistributors, createDistributor, updateDistributor, deleteDistributor } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 10
const ALL_DEVICES = ['Windows PC', 'macOS', 'Linux', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch']

export default function DistribuïdorsPage() {
  const { openModal, closeModal, showToast, user } = useApp()
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getDistributors({ search, page, limit: PAGE_LIMIT }),
    [search, page]
  )

  const distributors = data?.data ?? data ?? []
  const totalPages   = data?.totalPages ?? 1

  function applySearch(e) { setSearch(e.target.value); setPage(1) }

  function openAdd() {
    openModal({
      title: 'Afegir distribuïdor',
      body: (
        <DistributorForm
          onSubmit={async (formData) => {
            await createDistributor(formData)
            closeModal(); showToast('Distribuïdor afegit'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  function openEdit(dist) {
    openModal({
      title: 'Editar distribuïdor',
      body: (
        <DistributorForm
          initial={dist}
          onSubmit={async (formData) => {
            await updateDistributor(dist.id, formData)
            closeModal(); showToast('Distribuïdor actualitzat'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  async function handleDelete(dist) {
    if (!confirm(`Eliminar "${dist.name}"?`)) return
    try {
      await deleteDistributor(dist.id)
      showToast('Distribuïdor eliminat', 'error'); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Distribuïdors</div>
        <div className="page-sub">Plataformes de distribució digital configurades</div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Cercar distribuïdors..."
            value={search}
            onChange={applySearch}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Afegir distribuïdor</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Descripció</th>
              <th>Dispositius</th>
              <th>Jocs</th>
              <th>Valoració</th>
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(distributors) ? distributors : []).length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cap distribuïdor trobat</td></tr>
            )}
            {(Array.isArray(distributors) ? distributors : []).map((d) => {
              // Verifica se o usuário atual é o dono ou administrador
              const isOwner = user?.id === d.userId || user?.isAdmin;

              return (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{d.description}</td>
                  <td>
                    {(d.devices ?? []).map((dev) => (
                      <span key={dev} className="tag tag-gray" style={{ marginRight: 3 }}>{dev}</span>
                    ))}
                  </td>
                  <td>{d.gameCount}</td>
                  <td>{'★'.repeat(Math.round(d.avgRating ?? 0))} {d.avgRating}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => openEdit(d)}
                      disabled={!isOwner}
                      title={!isOwner ? "Només el propietari o l'administrador pot editar" : ""}
                    >
                      ✏ Editar
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDelete(d)}
                      disabled={!isOwner}
                      title={!isOwner ? "Només el propietari o l'administrador pot esborrar" : ""}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

function DistributorForm({ initial = {}, onSubmit, onCancel }) {
  const [name, setName]           = useState(initial.name ?? '')
  const [description, setDesc]    = useState(initial.description ?? '')
  const [devices, setDevices]     = useState(initial.devices ?? [])

  function toggleDevice(dev) {
    setDevices((d) => d.includes(dev) ? d.filter((x) => x !== dev) : [...d, dev])
  }

  return (
    <>
      <div className="form-group">
        <label>Nom</label>
        <input type="text" placeholder="p.e. Epic Games Store" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Descripció</label>
        <input type="text" placeholder="Breu descripció..." value={description} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Dispositius compatibles</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {ALL_DEVICES.map((dev) => (
            <label key={dev} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text)', fontWeight: 400 }}>
              <input type="checkbox" checked={devices.includes(dev)} onChange={() => toggleDevice(dev)} />
              {dev}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit({ name, description, devices })}>Guardar</button>
      </div>
    </>
  )
}
