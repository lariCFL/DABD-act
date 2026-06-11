import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getAccounts, getFamily, getPlatforms, createAccount, updateAccount, deleteAccount, getAccount } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 15

const PLATFORM_TAG = {
  Steam: 'tag-green', Xbox: 'tag-blue', 'Xbox Game Pass': 'tag-blue',
  PlayStation: 'tag-purple', 'PlayStation Store': 'tag-purple',
  Nintendo: 'tag-amber', 'Nintendo eShop': 'tag-amber',
}
function platformTag(p) { return PLATFORM_TAG[p] ?? 'tag-gray' }

export default function ComptesPage() {
  const { openModal, closeModal, showToast } = useApp()
  const [search,     setSearch]     = useState('')
  const [memberId,   setMemberId]   = useState('')
  const [platformId, setPlatformId] = useState('')
  const [page,       setPage]       = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getAccounts({ search, memberId, platformId, page, limit: PAGE_LIMIT }),
    [search, memberId, platformId, page]
  )
  const { data: family    } = useFetch(getFamily, [])
  const { data: platData  } = useFetch(() => getPlatforms({ limit: 100 }), [])

  const accounts   = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const members    = family?.members ?? []
  const platforms  = platData?.data ?? platData ?? []

  function applyFilter(setter) {
    return (e) => { setter(e.target.value); setPage(1) }
  }

  // ── DETAIL (reveal email + password) ─────────────────────────────────────
  async function openDetail(account) {
    openModal({
      title: `Detalls del compte`,
      body: <AccountDetail accountId={account.id} />,
    })
  }

  // ── CREATE ────────────────────────────────────────────────────────────────
  function openAdd() {
    openModal({
      title: 'Afegir compte',
      body: (
        <AccountForm
          members={members}
          platforms={platforms}
          onSubmit={async (formData) => {
            try {
              await createAccount(formData)
              closeModal(); showToast('Compte afegit'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
  function openEdit(account) {
    openModal({
      title: 'Editar compte',
      body: (
        <AccountForm
          initial={account}
          members={members}
          platforms={platforms}
          onSubmit={async (formData) => {
            try {
              await updateAccount(account.id, formData)
              closeModal(); showToast('Compte actualitzat'); reload()
            } catch (e) { showToast(e.message, 'error') }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  function handleDelete(account) {
    openModal({
      title: 'Eliminar compte',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols eliminar el compte <strong style={{ color: 'var(--text)' }}>{account.email ?? account.username}</strong>?
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await deleteAccount(account.id)
              closeModal(); showToast('Compte eliminat', 'error'); reload()
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
          <div className="page-title">Comptes de plataforma</div>
          <div className="page-sub">Gestiona els comptes de tots els membres de la família</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="ti ti-plus" /> Afegir compte
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text" placeholder="Cercar comptes..."
            value={search} onChange={applyFilter(setSearch)}
          />
        </div>
        <select className="filter-select" value={memberId} onChange={applyFilter(setMemberId)}>
          <option value="">Tots els membres</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="filter-select" value={platformId} onChange={applyFilter(setPlatformId)}>
          <option value="">Totes les plataformes</option>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon="brand-steam" title="Cap compte trobat" text="Afegeix un compte de plataforma per als membres de la família." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Correu / Usuari</th>
                <th>Plataforma</th>
                <th>Membre</th>
                <th>Jocs</th>
                <th>Última activitat</th>
                <th>Accions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.email ?? a.username}</strong>
                    {a.email && a.username && <div className="cell-sub">{a.username}</div>}
                  </td>
                  <td>
                    <span className={`tag ${platformTag(a.platformName ?? a.platform)}`}>
                      {a.platformName ?? a.platform}
                    </span>
                  </td>
                  <td>{a.memberName}</td>
                  <td>{a.gameCount ?? '—'} jocs</td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{a.lastActivity ?? '—'}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openDetail(a)} title="Veure credencials">
                      <i className="ti ti-eye" />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>
                      <i className="ti ti-pencil" /> Editar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>
                      <i className="ti ti-trash" />
                    </button>
                  </td>
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

// ── Account Detail (fetches full record with password) ────────────────────────
function AccountDetail({ accountId }) {
  const { data, loading, error } = useFetch(() => getAccount(accountId), [accountId])
  const [showPass, setShowPass] = useState(false)

  if (loading) return <div style={{ color: 'var(--text3)', fontSize: 13 }}>Carregant...</div>
  if (error)   return <div style={{ color: 'var(--red)', fontSize: 13 }}>Error en carregar el compte.</div>
  if (!data)   return null

  return (
    <div>
      <div className="info-row">
        <span className="key">Plataforma</span>
        <span className="val">{data.platformName ?? data.platform}</span>
      </div>
      <div className="info-row">
        <span className="key">Membre</span>
        <span className="val">{data.memberName}</span>
      </div>
      {data.username && (
        <div className="info-row">
          <span className="key">Nom d'usuari</span>
          <span className="val">{data.username}</span>
        </div>
      )}
      {data.email && (
        <div className="info-row">
          <span className="key">Correu electrònic</span>
          <span className="val">{data.email}</span>
        </div>
      )}
      {data.password && (
        <div className="info-row">
          <span className="key">Contrasenya</span>
          <span className="val" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', letterSpacing: showPass ? 0 : 3 }}>
              {showPass ? data.password : '••••••••'}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPass((v) => !v)}
              style={{ padding: '2px 6px' }}
            >
              <i className={`ti ti-eye${showPass ? '-off' : ''}`} />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Account Form ──────────────────────────────────────────────────────────────
function AccountForm({ initial = {}, members, platforms, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    memberId:   initial.memberId   ?? '',
    platformId: initial.platformId ?? '',
    username:   initial.username   ?? '',
    email:      initial.email      ?? '',
    password:   '',
  })
  const set    = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const isEdit = !!initial.id
  const [showPass, setShowPass] = useState(false)

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Membre *</label>
          <select value={form.memberId} onChange={set('memberId')}>
            <option value="">Selecciona...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Plataforma *</label>
          <select value={form.platformId} onChange={set('platformId')}>
            <option value="">Selecciona...</option>
            {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
        <label>{isEdit ? 'Nova contrasenya (buit = no canviar)' : 'Contrasenya'}</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4,
            }}
          >
            <i className={`ti ti-eye${showPass ? '-off' : ''}`} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit(form)}>Guardar</button>
      </div>
    </>
  )
}
