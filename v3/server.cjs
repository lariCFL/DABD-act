const jsonServer = require('json-server')
const server     = jsonServer.create()
const router     = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(jsonServer.bodyParser)

// ── Auth mock ──────────────────────────────────────────────────────────────────
// POST /api/auth/login  →  { token, user }
server.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const db = router.db.getState()
  const authEntry = (db.auth ?? []).find(
    (a) => a.email === email && a.password === password
  )
  if (!authEntry) {
    return res.status(401).json({ message: 'Correu o contrasenya incorrectes.' })
  }
  // Find the matching user (we just use /me for simplicity)
  const user = db.me
  res.json({ token: `mock-token-${authEntry.userId}`, user })
})

// POST /api/auth/logout  → 204
server.post('/api/auth/logout', (_req, res) => res.status(204).end())

// ── /me ────────────────────────────────────────────────────────────────────────
server.get('/api/me', (_req, res) => {
  const db = router.db.getState()
  res.json(db.me)
})

server.patch('/api/me', (req, res) => {
  const db = router.db.getState()
  const updated = { ...db.me, ...req.body }
  router.db.set('me', updated).write()
  res.json(updated)
})

// ── /dashboard ─────────────────────────────────────────────────────────────────
server.get('/api/dashboard', (_req, res) => {
  const db = router.db.getState()
  res.json(db.dashboard)
})

// ── /family ────────────────────────────────────────────────────────────────────
server.get('/api/family', (_req, res) => {
  const db = router.db.getState()
  const family = db.family
  if (!family) return res.status(404).json({ message: 'Sense família' })
  res.json(family)
})

// POST /api/family  →  create family
server.post('/api/family', (req, res) => {
  const { name } = req.body ?? {}
  if (!name) return res.status(400).json({ message: 'El nom és obligatori.' })
  const db = router.db.getState()
  // Check uniqueness (mock: only one family in db)
  if (db.family?.name === name) {
    return res.status(409).json({ message: `Ja existeix una família amb el nom "${name}".` })
  }
  const newFamily = {
    id: 'f_new', name,
    memberCount: 1, total: 1, page: 1, limit: 12, totalPages: 1,
    members: [{ ...db.me, isAdmin: true }]
  }
  router.db.set('family', newFamily).write()
  router.db.set('me', { ...db.me, isAdmin: true, familyName: name }).write()
  res.status(201).json(newFamily)
})

// DELETE /api/family/leave
server.delete('/api/family/leave', (_req, res) => {
  const db = router.db.getState()
  const me = db.me
  if (me.isAdmin) {
    return res.status(400).json({ message: "L'administrador no pot sortir de la família sense transferir primer l'administració." })
  }
  // Remove member from family
  const family = db.family
  if (family) {
    const members = (family.members ?? []).filter((m) => String(m.id) !== String(me.id))
    router.db.set('family.members', members).write()
    router.db.set('family.memberCount', members.length).write()
  }
  router.db.set('me', { ...me, familyId: null, isAdmin: false }).write()
  res.status(204).end()
})

// GET /api/family/members/:id/accounts
server.get('/api/family/members/:id/accounts', (req, res) => {
  const db = router.db.getState()
  const accounts = (db.accounts?.data ?? []).filter(
    (a) => String(a.memberId) === String(req.params.id)
  )
  res.json(accounts)
})

// POST /api/family/members  → add member by email
server.post('/api/family/members', (req, res) => {
  const { email } = req.body ?? {}
  if (!email) return res.status(400).json({ message: 'El correu electrònic és obligatori.' })
  const db = router.db.getState()
  const family = db.family
  const members = family?.members ?? []

  // Check member limit
  if (members.length >= 5) {
    return res.status(400).json({ message: 'La família ja ha arribat al límit de 5 membres.' })
  }
  // Check if email already in family
  if (members.some((m) => m.email === email)) {
    return res.status(409).json({ message: 'Aquesta persona ja és membre de la família.' })
  }
  // Mock: pretend the user exists and create them
  const newId = `m_${Date.now()}`
  const newMember = {
    id: newId, name: email.split('@')[0], email,
    isAdmin: false, age: 0, birthDate: '',
    avatarColor: '#888888', avatarTextColor: '#fff',
    accountCount: 0, gameCount: 0, hoursThisMonth: 0
  }
  router.db.set('family.members', [...members, newMember]).write()
  router.db.set('family.memberCount', members.length + 1).write()
  res.status(201).json(newMember)
})

// PATCH /api/family/members/:id
server.patch('/api/family/members/:id', (req, res) => {
  const db = router.db.getState()
  const members = (db.family?.members ?? []).map((m) =>
    String(m.id) === String(req.params.id) ? { ...m, ...req.body } : m
  )
  router.db.set('family.members', members).write()
  res.json(members.find((m) => String(m.id) === String(req.params.id)))
})

// DELETE /api/family/members/:id
server.delete('/api/family/members/:id', (req, res) => {
  const db = router.db.getState()
  const members = (db.family?.members ?? []).filter(
    (m) => String(m.id) !== String(req.params.id)
  )
  router.db.set('family.members', members).write()
  router.db.set('family.memberCount', members.length).write()
  res.status(204).end()
})

// ── /games ─────────────────────────────────────────────────────────────────────
server.get('/api/games', (req, res) => {
  const db = router.db.getState()
  let games = db.games?.data ?? []
  if (req.query.search) {
    const s = req.query.search.toLowerCase()
    games = games.filter((g) => g.name.toLowerCase().includes(s))
  }
  if (req.query.genre) {
    games = games.filter((g) => g.genre === req.query.genre)
  }
  if (req.query.platform) {
    games = games.filter((g) => (g.platforms ?? []).includes(req.query.platform))
  }
  if (req.query.ownedByMe === 'true') {
    const me = db.me
    games = games.filter((g) => String(g.ownerId) === String(me.id) || me.isAdmin)
  }
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 12
  res.json({ data: games, total: games.length, page, limit, totalPages: Math.ceil(games.length / limit) || 1 })
})

server.get('/api/games/:id', (req, res) => {
  const db = router.db.getState()
  const game = (db.games?.data ?? []).find((g) => g.id === req.params.id)
  if (!game) return res.status(404).json({ message: 'Joc no trobat' })
  res.json(game)
})

// GET /api/games/:id/accounts
server.get('/api/games/:id/accounts', (req, res) => {
  const db = router.db.getState()
  const game = (db.games?.data ?? []).find((g) => g.id === req.params.id)
  if (!game) return res.status(404).json({ message: 'Joc no trobat' })
  res.json(game.accounts ?? [])
})

server.post('/api/games', (req, res) => {
  const db = router.db.getState()
  const newGame = { id: `g_${Date.now()}`, available: true, accounts: [], ...req.body, ownerId: db.me.id }
  const games = [...(db.games?.data ?? []), newGame]
  router.db.set('games.data', games).write()
  res.status(201).json(newGame)
})

server.patch('/api/games/:id', (req, res) => {
  const db = router.db.getState()
  const games = (db.games?.data ?? []).map((g) =>
    g.id === req.params.id ? { ...g, ...req.body } : g
  )
  router.db.set('games.data', games).write()
  res.json(games.find((g) => g.id === req.params.id))
})

server.delete('/api/games/:id', (req, res) => {
  const db = router.db.getState()
  const games = (db.games?.data ?? []).filter((g) => g.id !== req.params.id)
  router.db.set('games.data', games).write()
  res.status(204).end()
})

// ── /sessions ──────────────────────────────────────────────────────────────────
server.get('/api/sessions', (req, res) => {
  const db = router.db.getState()
  let sessions = db.sessions?.data ?? []
  if (req.query.search) {
    const s = req.query.search.toLowerCase()
    sessions = sessions.filter((s2) =>
      s2.gameName?.toLowerCase().includes(s) || s2.memberName?.toLowerCase().includes(s)
    )
  }
  if (req.query.memberId) sessions = sessions.filter((s) => String(s.memberId) === String(req.query.memberId))
  if (req.query.gameId)   sessions = sessions.filter((s) => String(s.gameId)   === String(req.query.gameId))
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 15
  res.json({ data: sessions, total: sessions.length, page, limit, totalPages: Math.ceil(sessions.length / limit) || 1 })
})

server.post('/api/sessions', (req, res) => {
  const db = router.db.getState()
  const { gameId, accountId } = req.body
  // Mark game as unavailable
  const games = (db.games?.data ?? []).map((g) =>
    g.id === gameId ? { ...g, available: false } : g
  )
  router.db.set('games.data', games).write()
  const game    = games.find((g) => g.id === gameId)
  const account = (db.accounts?.data ?? []).find((a) => a.id === accountId)
  const newSession = {
    id: `s_${Date.now()}`,
    gameId, accountId,
    gameName: game?.name ?? '', gameEmoji: game?.emoji ?? '🎮',
    memberId: db.me.id, memberName: db.me.name,
    platform: account?.platformName ?? '',
    startedAt: new Date().toLocaleString('ca-ES'),
    endedAt: null, isLive: true, duration: null, elapsed: '0min',
    ...req.body
  }
  const sessions = [...(db.sessions?.data ?? []), newSession]
  router.db.set('sessions.data', sessions).write()
  res.status(201).json(newSession)
})

// ── /platforms ─────────────────────────────────────────────────────────────────
server.get('/api/platforms', (req, res) => {
  const db = router.db.getState()
  let platforms = db.platforms?.data ?? []
  if (req.query.search) {
    const s = req.query.search.toLowerCase()
    platforms = platforms.filter((p) => p.name.toLowerCase().includes(s))
  }
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 10
  res.json({ data: platforms, total: platforms.length, page, limit, totalPages: Math.ceil(platforms.length / limit) || 1 })
})

server.get('/api/platforms/:id', (req, res) => {
  const db = router.db.getState()
  const p = (db.platforms?.data ?? []).find((x) => x.id === req.params.id)
  if (!p) return res.status(404).json({ message: 'Plataforma no trobada' })
  res.json(p)
})

server.post('/api/platforms', (req, res) => {
  const db = router.db.getState()
  const newP = { id: `p_${Date.now()}`, gameCount: 0, avgRating: null, ...req.body }
  router.db.set('platforms.data', [...(db.platforms?.data ?? []), newP]).write()
  res.status(201).json(newP)
})

server.patch('/api/platforms/:id', (req, res) => {
  const db = router.db.getState()
  const platforms = (db.platforms?.data ?? []).map((p) =>
    p.id === req.params.id ? { ...p, ...req.body } : p
  )
  router.db.set('platforms.data', platforms).write()
  res.json(platforms.find((p) => p.id === req.params.id))
})

server.delete('/api/platforms/:id', (req, res) => {
  const db = router.db.getState()
  router.db.set('platforms.data', (db.platforms?.data ?? []).filter((p) => p.id !== req.params.id)).write()
  res.status(204).end()
})

// ── /accounts ──────────────────────────────────────────────────────────────────
server.get('/api/accounts', (req, res) => {
  const db = router.db.getState()
  let accounts = db.accounts?.data ?? []
  if (req.query.search) {
    const s = req.query.search.toLowerCase()
    accounts = accounts.filter((a) =>
      (a.username ?? '').toLowerCase().includes(s) ||
      (a.email    ?? '').toLowerCase().includes(s)
    )
  }
  if (req.query.memberId)   accounts = accounts.filter((a) => String(a.memberId)   === String(req.query.memberId))
  if (req.query.platformId) accounts = accounts.filter((a) => String(a.platformId) === String(req.query.platformId))
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 15
  res.json({ data: accounts, total: accounts.length, page, limit, totalPages: Math.ceil(accounts.length / limit) || 1 })
})

server.get('/api/accounts/:id', (req, res) => {
  const db = router.db.getState()
  const a = (db.accounts?.data ?? []).find((x) => x.id === req.params.id)
  if (!a) return res.status(404).json({ message: 'Compte no trobat' })
  res.json(a)
})

server.post('/api/accounts', (req, res) => {
  const db = router.db.getState()
  const member   = (db.family?.members ?? []).find((m) => String(m.id) === String(req.body.memberId))
  const platform = (db.platforms?.data ?? []).find((p) => String(p.id) === String(req.body.platformId))
  const newAcc = {
    id: `a_${Date.now()}`,
    memberName:   member?.name     ?? '',
    platformName: platform?.name   ?? req.body.platform ?? '',
    gameCount: 0, lastActivity: 'Avui',
    ...req.body,
  }
  router.db.set('accounts.data', [...(db.accounts?.data ?? []), newAcc]).write()
  res.status(201).json(newAcc)
})

server.patch('/api/accounts/:id', (req, res) => {
  const db = router.db.getState()
  const accounts = (db.accounts?.data ?? []).map((a) =>
    a.id === req.params.id ? { ...a, ...req.body } : a
  )
  router.db.set('accounts.data', accounts).write()
  res.json(accounts.find((a) => a.id === req.params.id))
})

server.delete('/api/accounts/:id', (req, res) => {
  const db = router.db.getState()
  router.db.set('accounts.data', (db.accounts?.data ?? []).filter((a) => a.id !== req.params.id)).write()
  res.status(204).end()
})

// ── /devices ───────────────────────────────────────────────────────────────────
server.get('/api/devices', (req, res) => {
  const db = router.db.getState()
  let devices = db.devices?.data ?? []
  if (req.query.search) {
    const s = req.query.search.toLowerCase()
    devices = devices.filter((d) =>
      (d.type ?? '').toLowerCase().includes(s) ||
      (d.name ?? '').toLowerCase().includes(s)
    )
  }
  if (req.query.memberId) devices = devices.filter((d) => String(d.memberId) === String(req.query.memberId))
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 15
  res.json({ data: devices, total: devices.length, page, limit, totalPages: Math.ceil(devices.length / limit) || 1 })
})

server.post('/api/devices', (req, res) => {
  const db = router.db.getState()
  const member = (db.family?.members ?? []).find((m) => String(m.id) === String(req.body.memberId))
  const newDev = {
    id: `dev_${Date.now()}`,
    memberName: member?.name ?? '',
    createdAt: new Date().toISOString().slice(0, 10),
    ...req.body,
  }
  router.db.set('devices.data', [...(db.devices?.data ?? []), newDev]).write()
  res.status(201).json(newDev)
})

server.patch('/api/devices/:id', (req, res) => {
  const db = router.db.getState()
  const devices = (db.devices?.data ?? []).map((d) =>
    d.id === req.params.id ? { ...d, ...req.body } : d
  )
  router.db.set('devices.data', devices).write()
  res.json(devices.find((d) => d.id === req.params.id))
})

server.delete('/api/devices/:id', (req, res) => {
  const db = router.db.getState()
  router.db.set('devices.data', (db.devices?.data ?? []).filter((d) => d.id !== req.params.id)).write()
  res.status(204).end()
})

// ── /ratings ───────────────────────────────────────────────────────────────────
server.get('/api/ratings', (req, res) => {
  const db = router.db.getState()
  let ratings = db.ratings?.data ?? []
  if (req.query.type)   ratings = ratings.filter((r) => r.targetType === req.query.type)
  if (req.query.search) {
    const s = req.query.search.toLowerCase()
    ratings = ratings.filter((r) => (r.targetName ?? '').toLowerCase().includes(s))
  }
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 15
  res.json({ data: ratings, total: ratings.length, page, limit, totalPages: Math.ceil(ratings.length / limit) || 1 })
})

server.post('/api/ratings', (req, res) => {
  const db = router.db.getState()
  const { targetId, targetType } = req.body
  let target = null
  if (targetType === 'game')     target = (db.games?.data ?? []).find((g) => g.id === targetId)
  if (targetType === 'platform') target = (db.platforms?.data ?? []).find((p) => p.id === targetId)
  const newRating = {
    id: `r_${Date.now()}`,
    targetName:  target?.name  ?? '',
    targetEmoji: target?.emoji ?? null,
    memberId:    db.me.id,
    memberName:  db.me.name,
    date: new Date().toLocaleDateString('ca-ES'),
    ...req.body,
  }
  router.db.set('ratings.data', [...(db.ratings?.data ?? []), newRating]).write()
  res.status(201).json(newRating)
})

server.patch('/api/ratings/:id', (req, res) => {
  const db = router.db.getState()
  const ratings = (db.ratings?.data ?? []).map((r) =>
    r.id === req.params.id ? { ...r, ...req.body } : r
  )
  router.db.set('ratings.data', ratings).write()
  res.json(ratings.find((r) => r.id === req.params.id))
})

server.delete('/api/ratings/:id', (req, res) => {
  const db = router.db.getState()
  router.db.set('ratings.data', (db.ratings?.data ?? []).filter((r) => r.id !== req.params.id)).write()
  res.status(204).end()
})

// ── Start ──────────────────────────────────────────────────────────────────────
server.use('/api', router)
server.listen(3001, () => {
  console.log('GameShare mock server running on http://localhost:3001')
  console.log('Login: marc.puig@email.com / demo1234')
})
