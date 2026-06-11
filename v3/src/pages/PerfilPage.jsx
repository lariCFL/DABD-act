import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { getMe, updateMe } from '../services/api'
import { useApp } from '../context/AppContext'
import { LoadingState, ErrorState } from '../components/UI'

export default function PerfilPage() {
  const { showToast, setUser } = useApp()
  const { data: me, loading, error, reload } = useFetch(getMe, [])
  const [editing, setEditing] = useState(false)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={reload} />

  const initials = me?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">El meu perfil</div>
        <div className="page-sub">Gestiona les teves dades personals</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 700 }}>
        <div>
          <div className="detail-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                className="avatar"
                style={{ width: 56, height: 56, fontSize: 20, background: me?.avatarColor ?? 'var(--accent)' }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>{me?.name}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>
                  {me?.isAdmin ? 'Administrador 👑' : 'Membre'} · {me?.familyName}
                </div>
              </div>
            </div>

            {!editing ? (
              <>
                <div className="info-row"><span className="key">Nom complet</span><span className="val">{me?.name}</span></div>
                <div className="info-row"><span className="key">Data de naixement</span><span className="val">{me?.birthDate ?? '—'}</span></div>
                <div className="info-row"><span className="key">Correu</span><span className="val">{me?.email ?? '—'}</span></div>
                <div className="info-row"><span className="key">Família</span><span className="val">{me?.familyName ?? '—'}</span></div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={() => setEditing(true)}
                >
                  <i className="ti ti-pencil" /> Editar les meves dades
                </button>
              </>
            ) : (
              <EditProfileForm
                me={me}
                onSubmit={async (formData) => {
                  try {
                    const updated = await updateMe(formData)
                    showToast('Perfil actualitzat')
                    setEditing(false)
                    // Sync name change to context so sidebar updates
                    if (updated?.name) setUser((u) => ({ ...u, name: updated.name }))
                    reload()
                  } catch (e) {
                    showToast(e.message, 'error')
                  }
                }}
                onCancel={() => setEditing(false)}
              />
            )}
          </div>
        </div>

        <div>
          <div className="stats-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="stat-card accent">
              <div className="label">Hores totals</div>
              <div className="value">{me?.stats?.totalHours ?? 0}h</div>
            </div>
            <div className="stat-card green-c">
              <div className="label">Jocs jugats</div>
              <div className="value">{me?.stats?.gamesPlayed ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="label">Valoracions</div>
              <div className="value">{me?.stats?.ratings ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="label">Comptes</div>
              <div className="value">{me?.stats?.accounts ?? 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditProfileForm({ me, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name:      me?.name      ?? '',
    birthDate: me?.birthDate ?? '',
    email:     me?.email     ?? '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="form-group">
        <label>Nom complet</label>
        <input type="text" value={form.name} onChange={set('name')} />
      </div>
      <div className="form-group">
        <label>Data de naixement</label>
        <input type="date" value={form.birthDate} onChange={set('birthDate')} />
      </div>
      <div className="form-group">
        <label>Correu electrònic</label>
        <input type="email" value={form.email} onChange={set('email')} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={() => onSubmit(form)}>Guardar canvis</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel·lar</button>
      </div>
    </>
  )
}
