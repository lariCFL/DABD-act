import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getFamily, inviteMember, updateMember, removeMember } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 12

export default function FamiliaPage() {
  // Extraiem 'user' del context per comprovar si qui accedeix és administrador
  const { user, openModal, closeModal, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  //if (authLoading) return <LoadingState />
  console.log(user)

  // Variable que controla el permís per veure les accions
  const currentUserIsAdmin = user?.isAdmin || false

  const { data, loading, error, reload } = useFetch(
    () => getFamily({ search, page, limit: PAGE_LIMIT }),
    [search, page]
  )

  const members = data?.members ?? []
  const totalPages = data?.totalPages ?? 1
  const familyName = data?.name ?? ''

  function applySearch(e) { setSearch(e.target.value); setPage(1) }

  // ── CREATE / INVITE ───────────────────────────────────────
  function openInvite() {
    openModal({
      title: 'Convidar membre',
      body: (
        <MemberForm
          onSubmit={async (formData) => {
            try {
              // 1. Espera la resposta del backend
              await inviteMember(formData)

              // 2. Si la petició ha anat bé (persona afegida):
              closeModal()
              showToast('Membre afegit amb èxit!')
              reload()

            } catch (error) {
              // 3. Si el backend retorna un error (ex: persona ja en una altra família):
              // error.message mostrarà el missatge exacte que el backend ha enviat
              showToast(error.message || 'Error en afegir el membre', 'error')
            }
          }}
          onCancel={closeModal}
        />
      ),
    })
  }

  // ── CHANGE ADMIN ──────────────────────────────────────────
  async function handleChangeAdmin(member) {
    if (!confirm(`Fer de ${member.name} el nou administrador?`)) return
    try {
      await updateMember(user.id, { isAdmin: false })
      await updateMember(member.id, { isAdmin: true })
      showToast(`Permisos d'administrador actualitzats`); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  // ── DELETE ────────────────────────────────────────────────
  async function handleRemove(member) {
    if (!confirm(`Eliminar ${member.name} de la família?`)) return
    try {
      await removeMember(member.id)
      showToast(`${member.name} eliminat/da`, 'error'); reload()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">{familyName}</div>
        <div className="page-sub">Gestiona els membres i els permisos de la família</div>
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
        {/* Mostra el botó de convidar NOMÉS si és administrador */}
        {currentUserIsAdmin && (
          <button className="btn btn-primary" onClick={openInvite}>+ Convidar membre</button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rol</th>
              <th>Edat</th>
              <th>Comptes</th>
              <th>Jocs jugats</th>
              <th>Hores (mes)</th>
              {/* Mostra la columna d'accions NOMÉS si és administrador */}
              {currentUserIsAdmin && <th>Accions</th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={currentUserIsAdmin ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>
                  Cap membre trobat
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>
                    {m.name}
                    {m.isAdmin && <span className="admin-crown"> 👑</span>}
                  </strong>
                </td>
                <td>
                  <span className={`tag ${m.isAdmin ? 'tag-amber' : 'tag-gray'}`}>
                    {m.isAdmin ? 'Admin' : 'Membre'}
                  </span>
                </td>
                <td>{m.age} anys</td>
                <td>{m.accountCount}</td>
                <td>{m.gameCount}</td>
                <td>{m.hoursThisMonth}h</td>

                {/* Mostra les opcions de botó NOMÉS si és administrador */}
                {currentUserIsAdmin && (
                  <td style={{ display: 'flex', gap: 4 }}>
                    {!m.isAdmin && (
                      <>
                        <button className="btn btn-warning btn-sm" onClick={() => handleChangeAdmin(m)}>
                          👑 Tornar Admin
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemove(m)}>
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

function MemberForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    email: '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }))

  return (
    <>

      <div className="form-row">
        <div className="form-group">
          <label>Correu electrònic</label>
          <input type="email" placeholder="correu@exemple.com" value={form.email} onChange={set('email')} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
          <button className="btn btn-primary" onClick={() => onSubmit(form)}>Guardar</button>
        </div>
      </div>
    </>
  )
}