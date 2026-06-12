// ── API Layer ────────────────────────────────────────────────────────────────
// All HTTP communication with the backend lives here.
// Token is read from localStorage on every call so it is always current.

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken  = ()      => localStorage.getItem('token')
export const setToken  = (t)     => localStorage.setItem('token', t)
export const clearToken = ()     => localStorage.removeItem('token')

// ── Core request ─────────────────────────────────────────────────────────────
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  // 204 No Content — nothing to parse
  if (res.status === 204) return null

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`)
  return json
}

// ── Query string builder ──────────────────────────────────────────────────────
// Strips empty/null values so the backend never receives ?search= accidentally.
function qs(params) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const s = new URLSearchParams(clean).toString()
  return s ? `?${s}` : ''
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login  = (data)  => request('POST', '/auth/login', data)
export const logout = ()      => request('POST', '/auth/logout')

// ── Current user ─────────────────────────────────────────────────────────────
export const getMe    = ()      => request('GET',   '/me')
export const updateMe = (data)  => request('PATCH', '/me', data)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = () => request('GET', '/dashboard')

// ── Games ─────────────────────────────────────────────────────────────────────
// GET /games?search=&genre=&platform=&ownedByMe=&page=&limit=
export const getGames   = (params = {}) => request('GET',    `/games${qs(params)}`)
export const getGame    = (id)          => request('GET',    `/games/${id}`)
export const createGame = (data)        => request('POST',   '/games', data)
export const updateGame = (id, data)    => request('PATCH',  `/games/${id}`, data)
export const deleteGame = (id)          => request('DELETE', `/games/${id}`)

// GET /games/:id/accounts — accounts that can play this game
export const getGameAccounts = (id) => request('GET', `/games/${id}/accounts`)

// ── Sessions ──────────────────────────────────────────────────────────────────
// GET /sessions?search=&memberId=&gameId=&page=&limit=
export const getSessions  = (params = {}) => request('GET',   `/sessions${qs(params)}`)
export const startSession = (data)        => request('POST',  '/sessions', data)
export const stopSession  = (id)          => request('PATCH', `/sessions/${id}/stop`)

// ── Family ────────────────────────────────────────────────────────────────────
// GET /family?search=&page=&limit=
export const getFamily    = (params = {}) => request('GET',    `/family${qs(params)}`)
export const createFamily = (data)        => request('POST',   '/family', data)
export const leaveFamily  = ()            => request('DELETE', '/family/leave')
export const getMember    = (id)          => request('GET',    `/family/members/${id}`)
export const addMember    = (data)        => request('POST',   '/family/members', data)
export const updateMember = (id, data)    => request('PATCH',  `/family/members/${id}`, data)
export const removeMember = (id)          => request('DELETE', `/family/members/${id}`)

// GET /family/members/:id/accounts — all accounts belonging to a member
export const getMemberAccounts = (id) => request('GET', `/family/members/${id}/accounts`)

// ── Accounts ─────────────────────────────────────────────────────────────────
// GET /accounts?search=&memberId=&platformId=&page=&limit=
export const getAccounts   = (params = {}) => request('GET',    `/accounts${qs(params)}`)
export const getAccount    = (id)          => request('GET',    `/accounts/${id}`)
export const createAccount = (data)        => request('POST',   '/accounts', data)
export const updateAccount = (id, data)    => request('PATCH',  `/accounts/${id}`, data)
export const deleteAccount = (id)          => request('DELETE', `/accounts/${id}`)

// ── Platforms ─────────────────────────────────────────────────────────────────
// GET /platforms?search=&page=&limit=
export const getPlatforms   = (params = {}) => request('GET',    `/platforms${qs(params)}`)
export const createPlatform = (data)        => request('POST',   '/platforms', data)
export const updatePlatform = (id, data)    => request('PATCH',  `/platforms/${id}`, data)
export const deletePlatform = (id)          => request('DELETE', `/platforms/${id}`)

// ── Devices ───────────────────────────────────────────────────────────────────
// GET /devices?search=&memberId=&page=&limit=
export const getDevices   = (params = {}) => request('GET',    `/devices${qs(params)}`)
export const createDevice = (data)        => request('POST',   '/devices', data)
export const updateDevice = (id, data)    => request('PATCH',  `/devices/${id}`, data)
export const deleteDevice = (id)          => request('DELETE', `/devices/${id}`)

// ── Reviews ───────────────────────────────────────────────────────────────────
// GET /ratings?type=game|platform&search=&page=&limit=
export const getRatings   = (params = {}) => request('GET',    `/ratings${qs(params)}`)
export const createRating = (data)        => request('POST',   '/ratings', data)
export const updateRating = (id, data)    => request('PATCH',  `/ratings/${id}`, data)
export const deleteRating = (id)          => request('DELETE', `/ratings/${id}`)
