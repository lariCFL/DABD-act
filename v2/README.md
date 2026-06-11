# GameShare — Vite + React

## Iniciar el projecte

```bash
npm run dev
node server.cjs
```

## Estructura

```
src/
├── context/AppContext.jsx       # Estat global: navegació, toasts, modal
├── hooks/useFetch.js            # Hook genèric amb loading/error/reload
├── services/api.js              # Totes les crides HTTP (CRUD complet)
├── components/
│   ├── Sidebar.jsx
│   ├── Pagination.jsx           # Component de paginació reutilitzable
│   └── UI.jsx                   # Toast, Modal, Stars, LoadingState, ErrorState
└── pages/
    ├── DashboardPage.jsx
    ├── BibliotecaPage.jsx        # CRUD Joc + cerca + paginació
    ├── PartidesPage.jsx          # CRUD Partida + filtres + paginació
    ├── FamiliaPage.jsx           # CRUD Persona + cerca + paginació
    ├── ComptesPage.jsx           # CRUD Compte + filtres + paginació
    ├── DistribuïdorsPage.jsx     # CRUD Distribuïdor + cerca + paginació
    ├── ValoracionsPage.jsx       # CRUD Valoració + cerca + paginació
    └── PerfilPage.jsx            # Edició dades pròpies (PATCH /me)
```

## Classes i relacions

| Classe       | Relació        | Descripció                              |
|--------------|----------------|-----------------------------------------|
| Familia      | 1:N → Persona  | Una família té molts membres            |
| Persona      | 1:N → Compte   | Un membre té molts comptes              |
| Compte       | N:N → Joc      | Molts comptes accedeixen a molts jocs   |
| Partida      | Classe assoc.  | Associa Persona + Joc + Compte + temps  |
| Valoració    | Classe assoc.  | Persona valora un Joc o Distribuïdor    |
| Distribuïdor | 1:N → Joc      | Un distribuïdor distribueix molts jocs  |

## Contrat de l'API — Paginació

**TOTES les rutes de llistat han de retornar aquest format:**

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Query params comuns a totes les rutes paginades:**
- `page` (enter, default 1)
- `limit` (enter, default 10-15 segons la ruta)

---

## Endpoints

### PATCH /me
```json
// Request body
{ "name": "Marc Garcia", "birthDate": "1994-04-12", "email": "marc@email.com" }
```

### GET /games?search=&genre=&platform=&page=&limit=
```json
{
  "data": [{
    "id": "g1", "name": "Zelda BotW", "emoji": "🗡️",
    "genre": "Aventura", "ageRating": 12,
    "platforms": ["Nintendo Switch"],
    "available": true,
    "accounts": [{ "id": "a1", "username": "AnnaNintendo", "platform": "Nintendo" }]
  }],
  "total": 24, "page": 1, "limit": 10, "totalPages": 3
}
```

### POST /games
```json
{ "name": "...", "genre": "...", "ageRating": 12, "emoji": "🎮", "distributorId": "d1" }
```

### PATCH /games/:id — mateixa estructura que POST

### DELETE /games/:id → 204 No Content

---

### GET /sessions?search=&memberId=&gameId=&page=&limit=
```json
{
  "data": [{
    "id": "s1", "gameName": "Zelda", "gameEmoji": "🗡️",
    "memberName": "Anna", "platform": "Nintendo",
    "startedAt": "10/06/2026 10:30", "endedAt": null,
    "isLive": true, "elapsed": "1h 23min", "duration": null
  }],
  "total": 87, "page": 1, "limit": 15, "totalPages": 6
}
```

### POST /sessions
```json
{ "gameId": "g1", "memberId": "m1", "accountId": "a1", "startTime": "2026-06-10T10:30" }
```

### PATCH /sessions/:id/stop
```json
{ "endTime": "2026-06-10T12:15" }
```

### DELETE /sessions/:id → 204

---

### GET /family?search=&page=&limit=
```json
{
  "id": "f1", "name": "Família Garcia",
  "members": [{
    "id": "m1", "name": "Marc Garcia", "initials": "MG",
    "isAdmin": true, "age": 32, "birthDate": "1994-04-12", "email": "marc@email.com",
    "avatarColor": "#7c6cff",
    "accountCount": 4, "gameCount": 18, "hoursThisMonth": 34
  }],
  "total": 3, "page": 1, "limit": 12, "totalPages": 1
}
```

### POST /family/members/invite
```json
{ "name": "Laura", "birthDate": "2000-03-15", "email": "laura@email.com", "isAdmin": false }
```

### PATCH /family/members/:id — mateixa estructura

### DELETE /family/members/:id → 204

---

### GET /accounts?search=&memberId=&platform=&page=&limit=
```json
{
  "data": [{
    "id": "a1", "username": "marc_steam", "email": "marc@steam.com",
    "platform": "Steam", "memberId": "m1", "memberName": "Marc Garcia",
    "memberIsAdmin": true, "gameCount": 9, "lastActivity": "Ahir",
    "distributorId": "d1"
  }],
  "total": 8, "page": 1, "limit": 15, "totalPages": 1
}
```

### POST /accounts
```json
{ "memberId": "m1", "distributorId": "d1", "username": "marc_steam", "email": "...", "password": "..." }
```

### PATCH /accounts/:id — mateixa estructura (password buit = no canviar)

### DELETE /accounts/:id → 204

---

### GET /distributors?search=&page=&limit=
```json
{
  "data": [{
    "id": "d1", "name": "Steam", "description": "...",
    "devices": ["Windows PC", "macOS"],
    "gameCount": 9, "avgRating": 4.8
  }],
  "total": 5, "page": 1, "limit": 10, "totalPages": 1
}
```

### POST /distributors
```json
{ "name": "Epic Games", "description": "...", "devices": ["Windows PC"] }
```

### PATCH /distributors/:id — mateixa estructura

### DELETE /distributors/:id → 204

---

### GET /ratings?type=game|distributor&search=&page=&limit=
```json
{
  "data": [{
    "id": "r1", "targetId": "g1", "targetName": "Zelda BotW", "targetEmoji": "🗡️",
    "memberName": "Marc", "score": 5,
    "comment": "Imprescindible", "date": "10/06/2026"
  }],
  "total": 12, "page": 1, "limit": 15, "totalPages": 1
}
```

### POST /ratings
```json
{ "targetId": "g1", "targetType": "game", "score": 5, "comment": "..." }
```

### PATCH /ratings/:id — mateixa estructura

### DELETE /ratings/:id → 204

---

## Seguretat (SQL Injection)

El frontend envia **tots els inputs** com a JSON o query params via `fetch`.
**El backend ÉS RESPONSABLE** d'usar queries parametritzades (prepared statements):

```python
# ✅ Correcte (SQLAlchemy / psycopg2 / mysql-connector)
cursor.execute("SELECT * FROM jocs WHERE nom = %s", (nom,))

# ❌ Incorrecte — vulnerabilitat d'injecció SQL
cursor.execute(f"SELECT * FROM jocs WHERE nom = '{nom}'")
```

Cap valor de l'usuari s'ha de concatenar directament a cap query SQL.
