// Base API URL — set via environment variable
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// Builds query string, stripping empty/null values so the backend never
// receives empty params like search= (avoids accidental full-table scans).
function qs(params) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const s = new URLSearchParams(clean).toString()
  return s ? `?${s}` : ''
}

// Auth / Me
export const getMe     = ()       => request('GET',   '/me')
export const updateMe  = (data)   => request('PATCH', '/me', data)

// Dashboard
export const getDashboard = () => request('GET', '/dashboard')

// Games — GET /games?search=&genre=&platform=&page=&limit=
export const getGames       = (params = {}) => request('GET',    `/games${qs(params)}`)
export const getGame        = (id)          => request('GET',    `/games/${id}`)
export const createGame     = (data)        => request('POST',   '/games', data)
export const updateGame     = (id, data)    => request('PATCH',  `/games/${id}`, data)
export const deleteGame     = (id)          => request('DELETE', `/games/${id}`)

// Sessions — GET /sessions?search=&memberId=&gameId=&page=&limit=
export const getSessions    = (params = {}) => request('GET',    `/sessions${qs(params)}`)
export const startSession   = (data)        => request('POST',   '/sessions', data)
export const stopSession    = (id, data)    => request('PATCH',  `/sessions/${id}/stop`, data)
export const deleteSession  = (id)          => request('DELETE', `/sessions/${id}`)

// Family — GET /family?page=&limit=
export const getFamily      = (params = {}) => request('GET',    `/family${qs(params)}`)
export const getMember      = (id)          => request('GET',    `/family/members/${id}`)
export const inviteMember   = (data)        => request('POST',   '/family/members/invite', data)
export const updateMember   = (id, data)    => request('PATCH',  `/family/members/${id}`, data)
export const removeMember   = (id)          => request('DELETE', `/family/members/${id}`)

// Accounts — GET /accounts?search=&memberId=&platform=&page=&limit=
export const getAccounts = async (params = {}) => {
  const data = await request('GET', `/accounts${qs(params)}`)
  if (Array.isArray(data)) return { accounts: data, data: data, totalPages: 1 }
  return { ...data, accounts: data.data }
}
export const createAccount = async (data) => {
  if (data.memberId) {
    try {
      const family = await request('GET', '/family')
      const member = family.members?.find(m => String(m.id) === String(data.memberId))
      if (member) {
        data.memberName = member.name
        data.memberIsAdmin = member.isAdmin
      }
    } catch (e) {}
  }
  return request('POST', '/accounts', data)
}
export const updateAccount  = (id, data)    => request('PATCH',  `/accounts/${id}`, data)
export const deleteAccount  = (id)          => request('DELETE', `/accounts/${id}`)

// Distributors — GET /distributors?page=&limit=
export const getDistributors   = (params = {}) => request('GET',    `/distributors${qs(params)}`)
export const createDistributor = (data)         => request('POST',   '/distributors', data)
export const updateDistributor = (id, data)     => request('PATCH',  `/distributors/${id}`, data)
export const deleteDistributor = (id)           => request('DELETE', `/distributors/${id}`)

// Ratings — GET /ratings?type=game|distributor&page=&limit=
export const getRatings    = (params = {}) => request('GET',    `/ratings${qs(params)}`)
export const createRating  = (data)        => request('POST',   '/ratings', data)
export const updateRating  = (id, data)    => request('PATCH',  `/ratings/${id}`, data)
export const deleteRating  = (id)          => request('DELETE', `/ratings/${id}`)
