import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getAccounts, getFamily, getDistributors, createAccount, updateAccount, deleteAccount } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15
const PLATFORM_TAG = { Steam: 'tag-green', Xbox: 'tag-blue', PlayStation: 'tag-purple', Nintendo: 'tag-purple' }

export default function ComptesPage() {
  const { openModal, closeModal, showToast } = useApp()
  const [search, setSearch]     = useState('')
  const [memberId, setMemberId] = useState('')
  const [platform, setPlatform] = useState('')
  const [page, setPage]         = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getAccounts({ search, memberId, platform, page, limit: PAGE_LIMIT }),
    [search, memberId, platform, page]
  )
  const { data: family }       = useFetch(getFamily, [])
  const { data: distributors } = useFetch(getDistributors, [])

  const accounts   = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  // ── CREATE ────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir compte',
      body: (
        <AccountForm
          members={family?.members ?? []}
          distributors={distributors ?? []}
          onSubmit={async (formData) => {
            await createAccount(formData)
            closeModal(); showToast('Compte afegit'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── UPDATE ────────────────────────────────────────────────
  function openEdit(account) {
    openModal({
      title: 'Editar compte',
      body: (
        <AccountForm
          initial={account}
          members={family?.members ?? []}
          distributors={distributors ?? []}
          onSubmit={async (formData) => {
            await updateAccount(account.id, formData)
            closeModal(); showToast('Compte actualitzat'); reload()
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────
  async function handleDelete(account) {
    if (!confirm(`Eliminar el compte "${account.username}"?`)) return
    try {
      await deleteAccount(account.id)
      showToast('Compte eliminat', 'error'); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  const allPlatforms = [...new Set(accounts.map((a) => a.platform).filter(Boolean))]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Comptes de plataforma</div>
        <div className="page-sub">Gestiona els comptes dels membres de la família</div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Cercar comptes..."
            value={search}
            onChange={applyFilter(setSearch)}
          />
        </div>
        <select className="filter-select" value={memberId} onChange={applyFilter(setMemberId)}>
          <option value="">Tots els membres</option>
          {(family?.members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter-select" value={platform} onChange={applyFilter(setPlatform)}>
          <option value="">Totes les plataformes</option>
          {allPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Afegir compte</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuari</th>
              <th>Plataforma</th>
              <th>Membre</th>
              <th>Jocs</th>
              <th>Última activitat</th>
              <th>Accions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cap compte trobat</td></tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.username}</strong>
                  {a.email && <div className="cell-sub">{a.email}</div>}
                </td>
                <td><span className={`tag ${PLATFORM_TAG[a.platform] ?? 'tag-gray'}`}>{a.platform}</span></td>
                <td>{a.memberName}</td>
                <td>{a.gameCount} jocs</td>
                <td>{a.lastActivity}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>✏ Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>✕</button>
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

function AccountForm({ initial = {}, members, distributors, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    memberId:      initial.memberId      ?? '',
    distributorId: initial.distributorId ?? '',
    username:      initial.username      ?? '',
    email:         initial.email         ?? '',
    password:      '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const isEdit = !!initial.id

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Membre</label>
          <select value={form.memberId} onChange={set('memberId')}>
            <option value="">Selecciona...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Distribuïdor</label>
          <select value={form.distributorId} onChange={set('distributorId')}>
            <option value="">Selecciona...</option>
            {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Nom d'usuari</label>
        <input type="text" placeholder="nom_usuari" value={form.username} onChange={set('username')} />
      </div>
      <div className="form-group">
        <label>Correu electrònic</label>
        <input type="email" placeholder="correu@exemple.com" value={form.email} onChange={set('email')} />
      </div>
      <div className="form-group">
        <label>{isEdit ? 'Nova contrasenya (deixa buit per no canviar)' : 'Contrasenya'}</label>
        <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit(form)}>Guardar</button>
      </div>
    </>
  )
}
