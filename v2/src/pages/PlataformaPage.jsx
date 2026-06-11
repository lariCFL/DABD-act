import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import {
    getAccounts,
    createAccount,
    deleteAccount,
    getFamily
} from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'
import Pagination from '../components/Pagination'

const PAGE_LIMIT = 12

export default function DispositiusPage() {
    const { user, openModal, closeModal, showToast } = useApp()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    // Filtre de membre: per defecte, comença amb l'ID de l'usuari connectat (els "meus")
    // Però pot ser canviat per veure els dels altres o de tots
    const [memberFilter, setMemberFilter] = useState(user?.id || '')

    // 1. Busquem la llista de membres per al filtre (Select)
    const { data: familyData } = useFetch(() => getFamily({ limit: 100 }), [])
    const familyMembers = familyData?.members ?? []

    // 2. Busquem els dispositius/comptes basant-nos en el filtre
    const { data, loading, error, reload } = useFetch(
        () => getAccounts({
            search,
            page,
            limit: PAGE_LIMIT,
            memberId: memberFilter // Filtra per membre si està seleccionat
        }),
        [search, page, memberFilter]
    )

    const accounts = data?.accounts ?? []
    const totalPages = data?.totalPages ?? 1

    // ── ACTIONS ────────────────────────────────────────────────

    function openAddDevice() {
        openModal({
            title: 'Afegir nou dispositiu',
            body: (
                <DeviceForm
                    members={familyMembers}
                    initialMemberId={user?.id}
                    isAdmin={user?.isAdmin}
                    onSubmit={async (formData) => {
                        try {
                            await createAccount(formData)
                            closeModal()
                            showToast('Dispositiu afegit')
                            reload()
                        } catch (e) {
                            showToast(e.message, 'error')
                        }
                    }}
                    onCancel={closeModal}
                />
            ),
        })
    }

    async function handleDelete(account) {
        if (!confirm(`Eliminar el dispositiu ${account.platform} de ${account.memberName}?`)) return
        try {
            await deleteAccount(account.id)
            showToast('Dispositiu eliminat', 'error')
            reload()
        } catch (e) {
            showToast(e.message, 'error')
        }
    }

    if (loading) return <LoadingState />
    if (error) return <ErrorState message={error} onRetry={reload} />

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-title">Gestió de Dispositius</div>
                <div className="page-sub">Controla els comptes i plataformes de la teva família</div>
            </div>

            <div className="toolbar">
                <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                    <div className="search-box">
                        <i className="ti ti-search" />
                        <input
                            type="text"
                            placeholder="Cercar plataforma..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Selector per veure els meus o els d'altres membres */}
                    <select
                        className="btn btn-ghost"
                        value={memberFilter}
                        onChange={(e) => { setMemberFilter(e.target.value); setPage(1); }}
                        style={{ padding: '0 10px', minWidth: 180 }}
                    >
                        <option value="">Família completa (Tots)</option>
                        <optgroup label="Membres">
                            {familyMembers.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.id === user?.id ? "Els meus dispositius" : `Dispositius de ${m.name}`}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <button className="btn btn-primary" onClick={openAddDevice}>
                    + Afegir dispositiu
                </button>
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Plataforma / Dispositiu</th>
                            <th>Propietari</th>
                            <th>Usuari (In-game)</th>
                            <th style={{ textAlign: 'right' }}>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
                                    Cap dispositiu trobat.
                                </td>
                            </tr>
                        )}
                        {accounts.map((acc) => (
                            <tr key={acc.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="tag tag-gray">{acc.platform}</div>
                                    </div>
                                </td>
                                <td>{acc.memberName}</td>
                                <td><code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4 }}>{acc.username}</code></td>
                                <td style={{ textAlign: 'right' }}>
                                    {/* Només pot eliminar si n'és el propietari o si és l'administrador de la família */}
                                    {(user?.isAdmin || acc.memberId === user?.id) && (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(acc)}>
                                            ✕ Retirar
                                        </button>
                                    )}
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

// ── FORM COMPONENT ──────────────────────────────────────────

function DeviceForm({ members, initialMemberId, isAdmin, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        platform: '',
        username: '',
        memberId: initialMemberId || ''
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
                <label>Plataforma (ex: PS5, Steam, Switch)</label>
                <input
                    type="text"
                    placeholder="Ex: PlayStation 5"
                    value={form.platform}
                    onChange={e => setForm({ ...form, platform: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label>ID d'usuari / Nickname</label>
                <input
                    type="text"
                    placeholder="Ex: PlayerOne_99"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                />
            </div>

            {/* Si és administrador, pot afegir dispositius per a qualsevol membre. 
          Si no, el dispositiu és automàticament per a ell mateix */}
            {isAdmin ? (
                <div className="form-group">
                    <label>Assignar a un membre</label>
                    <select
                        value={form.memberId}
                        onChange={e => setForm({ ...form, memberId: e.target.value })}
                    >
                        {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            ) : (
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Aquest dispositiu s'assignarà al teu perfil.
                </p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
                <button
                    className="btn btn-primary"
                    disabled={!form.platform || !form.username}
                    onClick={() => onSubmit(form)}
                >
                    Guardar dispositiu
                </button>
            </div>
        </div>
    )
}