import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import {
  getFamily, createFamily, leaveFamily,
  addMember, updateMember, removeMember, getMemberAccounts,
} from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState, EmptyState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 12
const MAX_MEMBERS = 5

export default function FamiliaPage() {
  const { user, setUser, openModal, closeModal, showToast, logoutUser } = useApp()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => getFamily({ search, page, limit: PAGE_LIMIT }),
    [search, page]
  )

  const isAdmin      = user?.isAdmin ?? false
  const members      = data?.members ?? []
  const totalPages   = data?.totalPages ?? 1
  const familyName   = data?.name ?? ''
  const memberCount  = data?.memberCount ?? members.length
  const familyExists = !!data?.id   // null/undefined means user has no family

  function applySearch(e) { setSearch(e.target.value); setPage(1) }

  // ── No family ────────────────────────────────────────────────────────────────
  if (!loading && !error && !familyExists) {
    return <NoFamilyView onCreated={() => { reload(); }} />
  }

  // ── ADD MEMBER ───────────────────────────────────────────────────────────────
  function openAddMember() {
    if (memberCount >= MAX_MEMBERS) {
      showToast(`La família ja té el màxim de ${MAX_MEMBERS} membres.`, 'error')
      return
    }
    openModal({
      title: 'Afegir membre',
      body: (
        <MemberForm
          onSubmit={async (formData) => {
            try {
              await addMember(formData)
              closeModal(); showToast('Membre afegit correctament!'); reload()
            } catch (err) {
              showToast(err.message || "Error en afegir el membre", 'error')
            }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── CHANGE ADMIN ──────────────────────────────────────────────────────────────
  async function handleChangeAdmin(member) {
    openModal({
      title: 'Transferir administració',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Vols fer de <strong style={{ color: 'var(--text)' }}>{member.name}</strong> el nou administrador de la família?
            Tu perdràs els permisos d'administrador.
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-warning" onClick={async () => {
            try {
              await updateMember(user.id,   { isAdmin: false })
              await updateMember(member.id, { isAdmin: true })
              closeModal()
              showToast(`${member.name} és ara l'administrador`)
              // Update local user state to reflect demotion
              setUser((u) => ({ ...u, isAdmin: false }))
              reload()
            } catch (e) { closeModal(); showToast(e.message, 'error') }
          }}>
            Confirmar transferència
          </button>
        </>
      ),
    })
  }

  // ── REMOVE MEMBER ─────────────────────────────────────────────────────────────
  async function handleRemove(member) {
    openModal({
      title: 'Eliminar membre',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols eliminar <strong style={{ color: 'var(--text)' }}>{member.name}</strong> de la família?
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await removeMember(member.id)
              closeModal(); showToast(`${member.name} eliminat/da`, 'error'); reload()
            } catch (e) { closeModal(); showToast(e.message, 'error') }
          }}>
            <i className="ti ti-trash" /> Eliminar
          </button>
        </>
      ),
    })
  }

  // ── LEAVE FAMILY ──────────────────────────────────────────────────────────────
  function handleLeave() {
    openModal({
      title: 'Sortir de la família',
      body: (
        <div>
          <p style={{ color: 'var(--text2)', marginBottom: 16 }}>
            Estàs segur/a que vols sortir de <strong style={{ color: 'var(--text)' }}>{familyName}</strong>?
            {isAdmin && (
              <span style={{ display: 'block', marginTop: 8, color: 'var(--amber)' }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
                Ets l'administrador. El backend decidirà si pots sortir o si primer cal transferir l'administració.
              </span>
            )}
          </p>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-ghost" onClick={closeModal}>Cancel·lar</button>
          <button className="btn btn-danger" onClick={async () => {
            try {
              await leaveFamily()
              closeModal()
              showToast('Has sortit de la família', 'error')
              // Clear family from user context — reload will show NoFamilyView
              setUser((u) => ({ ...u, familyId: null, isAdmin: false }))
              reload()
            } catch (e) {
              closeModal(); showToast(e.message, 'error')
            }
          }}>
            <i className="ti ti-door-exit" /> Sortir de la família
          </button>
        </>
      ),
    })
  }

  // ── MEMBER DETAIL ────────────────────────────────────────────────────────────
  async function openMemberDetail(member) {
    openModal({
      title: `${member.name}`,
      body: <MemberDetail member={member} />,
    })
  }

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  const isFull = memberCount >= MAX_MEMBERS

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">{familyName}</div>
          <div className="page-sub">
            Gestiona els membres i els permisos de la família
            <span style={{
              marginLeft: 10, fontSize: 12, fontWeight: 600,
              color: isFull ? 'var(--red)' : 'var(--text3)',
            }}>
              {memberCount}/{MAX_MEMBERS} membres
              {isFull && ' · Família plena'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && !isFull && (
            <button className="btn btn-primary" onClick={openAddMember}>
              <i className="ti ti-user-plus" /> Afegir membre
            </button>
          )}
          {isAdmin && isFull && (
            <button className="btn btn-ghost" disabled title="La família ja és plena (màxim 5 membres)">
              <i className="ti ti-user-plus" /> Família plena
            </button>
          )}
          <button className="btn btn-ghost" onClick={handleLeave}>
            <i className="ti ti-door-exit" /> Sortir
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Cercar membres..."
            value={search}
            onChange={applySearch}
          />
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState icon="users" title="Cap membre trobat" />
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              isSelf={String(m.id) === String(user?.id)}
              onDetail={() => openMemberDetail(m)}
              onChangeAdmin={() => handleChangeAdmin(m)}
              onRemove={() => handleRemove(m)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

// ── No Family View ────────────────────────────────────────────────────────────
function NoFamilyView({ onCreated }) {
  const { showToast, setUser, user } = useApp()
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) { showToast('El nom de la família és obligatori', 'error'); return }
    setLoading(true)
    try {
      const family = await createFamily({ name: name.trim() })
      showToast(`Família "${family.name}" creada! Ara ets l'administrador.`)
      // Backend should return updated user info or we flag isAdmin locally
      setUser((u) => ({ ...u, isAdmin: true, familyName: family.name }))
      onCreated()
    } catch (e) {
      showToast(e.message || 'Error en crear la família', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Família</div>
        <div className="page-sub">No pertanys a cap família</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-lg)', padding: '40px 36px', maxWidth: 420, width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧‍👦</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Crea la teva família
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.6 }}>
            No pertanys a cap família. Crea-ne una per compartir jocs, comptes i dispositius amb els teus familiars.
            En crear-la, passaràs a ser l'administrador automàticament.
          </p>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
            <label>Nom de la família *</label>
            <input
              type="text"
              placeholder="p.e. Família García"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Creant...</>
              : <><i className="ti ti-users" /> Crear família</>
            }
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({ member: m, isAdmin, isSelf, onDetail, onChangeAdmin, onRemove }) {
  const initials = m.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="person-card">
      <div className="person-top">
        <div
          className="person-avatar"
          style={{ background: m.avatarColor ?? 'var(--accent)', color: m.avatarTextColor ?? '#fff' }}
        >
          {initials}
        </div>
        <div className="person-info" style={{ flex: 1 }}>
          <h3>
            {m.name}
            {m.isAdmin && <span className="admin-crown"> 👑</span>}
            {isSelf && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>(tu)</span>}
          </h3>
          <p>{m.isAdmin ? 'Administrador' : 'Membre'} · {m.age} anys</p>
        </div>
      </div>

      <div className="person-stats">
        <div className="person-stat">
          <div className="n">{m.accountCount}</div>
          <div className="l">Comptes</div>
        </div>
        <div className="person-stat">
          <div className="n">{m.gameCount}</div>
          <div className="l">Jocs</div>
        </div>
        <div className="person-stat">
          <div className="n">{m.hoursThisMonth}h</div>
          <div className="l">Hores/mes</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={onDetail}>
          <i className="ti ti-user" /> Veure comptes
        </button>
        {isAdmin && !isSelf && !m.isAdmin && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={onChangeAdmin} title="Fer administrador">
              <i className="ti ti-crown" />
            </button>
            <button className="btn btn-danger btn-sm" onClick={onRemove}>
              <i className="ti ti-trash" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Member Detail Modal ───────────────────────────────────────────────────────
function MemberDetail({ member }) {
  const { data: accounts, loading, error } = useFetch(
    () => getMemberAccounts(member.id), [member.id]
  )
  const accs = accounts ?? []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          className="person-avatar"
          style={{
            width: 48, height: 48, fontSize: 18,
            background: member.avatarColor ?? 'var(--accent)',
            color: member.avatarTextColor ?? '#fff',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700,
          }}
        >
          {member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <strong style={{ fontSize: 15 }}>{member.name}</strong>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{member.email}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 10 }}>
        Comptes de plataforma
      </div>

      {loading && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Carregant comptes...</div>}
      {error   && <div style={{ color: 'var(--red)', fontSize: 13 }}>Error en carregar els comptes.</div>}
      {!loading && !error && accs.length === 0 && (
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>Aquest membre no té comptes registrats.</div>
      )}
      {accs.map((a) => (
        <div key={a.id} style={{
          background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 12px',
          marginBottom: 8, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <strong>{a.platformName ?? a.platform}</strong>
            <span className="tag tag-gray" style={{ fontSize: 11 }}>{a.platformName ?? a.platform}</span>
          </div>
          {a.email    && <div style={{ color: 'var(--text2)', fontSize: 12 }}>📧 {a.email}</div>}
          {a.password && <div style={{ color: 'var(--text2)', fontSize: 12 }}>🔑 {a.password}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Add Member Form ───────────────────────────────────────────────────────────
function MemberForm({ onSubmit, onCancel }) {
  const [email, setEmail] = useState('')
  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
        Introdueix el correu electrònic de la persona que vols afegir a la família.
        El backend verificarà si l'usuari existeix i si pot ser afegit.
      </p>
      <div className="form-group">
        <label>Correu electrònic *</label>
        <input
          type="email"
          placeholder="correu@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
        <button className="btn btn-primary" onClick={() => onSubmit({ email })} disabled={!email.trim()}>
          <i className="ti ti-user-plus" /> Afegir membre
        </button>
      </div>
    </>
  )
}
