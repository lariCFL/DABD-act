import { useState } from 'react'
import { login as apiLogin, setToken } from '../services/api'
import { useApp } from '../context/AppContext'
import logoImg from '../assets/logo_icon_v2.svg'

export default function LoginPage() {
  const { login } = useApp()
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Omple tots els camps.'); return }
    setError(''); setLoading(true)
    try {
      const res = await apiLogin(form)
      // Backend must return { token, user }
      setToken(res.token)
      login(res.user)
    } catch (err) {
      setError(err.message || 'Credencials incorrectes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src={logoImg} alt="GameShare" className="login-logo-img" />
          <span className="login-logo-text">Game<span>Share</span></span>
        </div>

        <div className="login-heading">
          <h2>Benvingut/da de nou</h2>
          <p>Inicia sessió per accedir a la teva família</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Correu electrònic</label>
            <input
              type="email"
              placeholder="correu@exemple.com"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Contrasenya</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <i className="ti ti-alert-circle" />
              {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Iniciant sessió...</>
              : 'Iniciar sessió'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-page {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .login-card {
          background: var(--bg2);
          border: 1px solid var(--border2);
          border-radius: var(--radius-lg);
          padding: 40px 36px;
          width: 100%;
          max-width: 400px;
        }
        .login-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
        }
        .login-logo-img { width: 140px; height: auto; }
        .login-logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
        }
        .login-logo-text span { color: var(--accent2); }
        .login-heading { margin-bottom: 24px; }
        .login-heading h2 {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .login-heading p { font-size: 13px; color: var(--text2); }
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--red-bg);
          border: 1px solid #3a1010;
          color: var(--red);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-size: 13px;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  )
}
