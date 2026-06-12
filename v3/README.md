# GameShare — Backend Developer Specification

> **Audience:** Backend developers implementing the real API.  
> **Frontend stack:** React 18 + Vite, SPA, no routing library.  
> **Mock server:** `server.cjs` (json-server based) runs on port 3001 for local development.  
> **Language of the UI:** Catalan.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Authentication](#3-authentication)
4. [Functional Requirements](#4-functional-requirements)
5. [Data Models](#5-data-models)
6. [API Specification](#6-api-specification)
7. [Validation Rules & Business Constraints](#7-validation-rules--business-constraints)
8. [Error Response Format](#8-error-response-format)
9. [Notes for the Backend Team](#9-notes-for-the-backend-team)

---

## 1. Project Overview

**GameShare** is a family game-sharing platform. A family group (up to 5 members) shares a library of digital games across multiple platforms (Steam, PlayStation Store, Nintendo eShop, Xbox Game Pass, etc.). Each game is associated with one or more platform accounts; a family member selects an account to "start a session" when they want to play. Members can also stop their own active sessions.

### Core business rules

- A **family** has a maximum of 5 members.
- Every member belongs to **at most one family**.
- A game is **available** if no active session is currently using it; otherwise it is **in use**.
- Sessions record who is playing, on which account, and for how long.
- A member can **stop their own active session** via `PATCH /api/sessions/:id/stop`.
- **Duration and elapsed time** are always computed and returned by the backend — the frontend never calculates them.
- Each entity (game, account, device, rating) records `ownerId` / `memberId` so the frontend can enforce UI-level ownership checks. The backend is the authoritative source of permissions.

---

## 2. User Roles & Permissions

### Administrator

- Created automatically when a user creates a new family.
- There is exactly one administrator per family at any time.
- **Admin role is strictly for family management only:**
  - Can add members (up to the 5-member limit).
  - Can remove any non-admin member.
  - Can transfer admin rights to another member.
- **Admins do NOT get extra permissions over content.** They cannot edit or delete games, accounts, devices, or reviews that belong to other members. Ownership rules apply equally to admins.
- Sees admin-only family management buttons in the UI (add/remove members, transfer admin).
- May have restrictions on leaving the family (backend decides; see §7).

### Regular Member

- Can play any available game in the family library.
- Can start and stop **their own** sessions.
- Can create, edit, and delete **their own** games, accounts, devices, and reviews.
- Cannot edit or delete resources that belong to other members — this rule applies even if the user is admin.
- Cannot add or remove family members.
- Can leave the family at any time.

---

## 3. Authentication

### Login flow

```
1.  User enters email + password on the Login page.
2.  Frontend sends POST /api/auth/login → { email, password }
3.  Backend validates credentials.
4.  On success: returns { token: "<jwt>", user: { ...userObject } }
5.  Frontend stores the token in localStorage (key: "token").
6.  Every subsequent API request includes the header:
      Authorization: Bearer <token>
7.  Backend reads the token, resolves the authenticated user, and enforces permissions.
```

### Token requirements

- The backend must return a **JSON Web Token (JWT)** (or equivalent opaque token).
- The token must identify the authenticated user so `GET /api/me` returns their data without an explicit ID in the URL.
- Tokens must expire (recommended: 24 h for development, configurable for production).
- On expiry or invalid token, the backend returns **401 Unauthorized** with `{ "message": "Sessió caducada. Inicia sessió de nou." }`. The frontend will redirect to login.

### Logout

```
POST /api/auth/logout
```
The frontend calls this to invalidate server-side sessions if applicable, then clears the local token regardless.

---

## 4. Functional Requirements

### Dashboard

Displays a summary of family activity. All values are pre-computed by the backend.

- **Stats block:** total games, available games, in-use games, member count, family name, hours this month, hours vs last month (as a string, e.g. "+18% vs mes anterior").
- **Active sessions:** list of sessions that are `isLive: true`, each including `memberId`.
- **Recent sessions:** last ~5 sessions (live or completed), each including `memberId`, with `duration` or `elapsed` from backend.
- **Popular games:** top games by total hours played.
- For live sessions belonging to the current user, a **"Aturar"** (stop) button is shown inline.

The frontend does **not** compute any time values.

---

### Library (Biblioteca)

#### Browse mode (default)

- Displays all family games as cards.
- Filters: free-text search (name), genre, platform.
- Pagination: 12 per page.
- A game shows as **available** or **in use** based on `available: boolean` returned by the backend.
- When a game is **in use**, the backend also returns `activeMemberName`, `activeMemberId`, and `activeSessionId` so the card shows who is currently playing.
- Any member can click **Play** on an available game.
- If the current user is the one playing an in-use game, a **"Aturar partida"** (stop) button appears on the card.

#### Play a game

1. Frontend calls `GET /api/games/:id/accounts` to get accounts that can be used for this game.
2. Each account in the response must include: `id`, `platform`, `email`, `password` (displayed in the play dialog).
3. Member selects an account and confirms.
4. Frontend calls `POST /api/sessions` with `{ gameId, accountId }`.
5. Backend marks the game as in use.

#### Stop a session (from Library)

- Shown only on game cards where `activeMemberId === currentUser.id`.
- Frontend calls `PATCH /api/sessions/:id/stop`.
- Backend marks the session as ended, restores game `available: true`.

#### Edit mode

Activated by the "Editar biblioteca" button. In edit mode:

- Only shows games **owned by the current user** (`ownerId == currentUser.id`). Admin does NOT see other members' games here.
- Games are **grouped by platform**.
- Free-text search and platform filter available.
- Per game: Edit and Delete buttons, hidden for games owned by other members.
- "Afegir joc" button always visible in edit mode.

When adding/editing a game, the form uses `platformIds[]` (array of platform IDs from `/api/platforms`) to associate the game with platforms. This prevents duplicates.

---

### Matches (Partides)

Historical view of all sessions with the ability to stop own live sessions.

- Shows all sessions, paginated (15 per page).
- Filters: free-text (game name or member name), member, game.
- Columns: game (emoji + name), member, platform, start time, end time / "En curs", duration / elapsed, actions.
- For live sessions belonging to the current user, a **"Aturar"** (stop) button is shown in the actions column.
- All time values (`startedAt`, `endedAt`, `duration`, `elapsed`) are **formatted strings from the backend** (e.g. "10/06/2026 09:45", "1h 30min").

---

### Family (Família)

#### No family state

If the current user does not belong to a family (`GET /api/family` returns 404 or `familyId` is null), the UI shows a **"Create Family"** form instead of the member list.

**Family creation rules:**
- Only a name is required.
- Family names must be **globally unique**. The backend validates uniqueness and returns `409` if the name is taken.
- On success (`201`), the creator automatically becomes the family **administrator**. The frontend updates `user.isAdmin = true` and `user.familyName` in the global context so the sidebar reflects the change without a full page reload.
- After creation, the page transitions to the normal family view.

#### Family member list

- Shows member cards with stats (accounts, games, hours/month).
- Clicking "Veure comptes" on a member card opens a detail modal showing all their platform accounts (email + password).
- Admin sees action buttons per member: transfer admin, remove.

#### Add member (admin only, max 5 members)

**Business rules:**
- Maximum family size is **5 members**.
- The "Afegir membre" button is **only visible when `memberCount < 5`**. When the family already has 5 members, the button is replaced with a "Família plena" indicator.
- The backend must enforce this independently — return `400` if `memberCount >= 5`.
- Sends `POST /api/family/members` with `{ email }`.
- Backend determines: does the user exist? Are they already in a family? Is the family full?
- All outcomes (success or error) are shown via the backend's response message as a toast.

#### Leave family

- The "Sortir" button is visible to every member including the administrator.
- Regular members can leave at any time. `DELETE /api/family/leave` returns `204`.
- Administrators: the backend should block leaving without first transferring admin rights (`400`).
- The frontend shows an amber warning in the confirmation modal when the current user is admin.
- On success (`204`): the frontend clears `user.familyId` and `user.isAdmin` from context.

#### Transfer admin

- Admin-only action per member card.
- Two PATCH calls: demote current admin, promote selected member.
- Recommended: backend should provide an atomic `POST /api/family/transfer-admin` endpoint (see §9).

---

### Accounts (Comptes)

Full CRUD for platform accounts belonging to family members.

- List with filters: search (email/username), member, platform.
- Pagination: 15 per page.
- Eye icon opens a **detail modal** showing email + password (password toggleable).
- Edit and Delete buttons are only shown for accounts where `memberId === currentUser.id`. Admins see the same restriction.
- Platform selector uses `GET /api/platforms` (not free-text).
- Member selector uses family members list.
- On create/edit: `platformId` and `memberId` are sent (not platform name strings).
- Password: on edit, blank password means "do not change".

---

### Devices (Dispositius)

Full CRUD for physical devices owned by family members.

- List with filters: search (name/type/manufacturer/OS), member.
- Pagination: 15 per page.
- Edit and Delete buttons are only shown for devices where `memberId === currentUser.id`. Admins cannot edit or delete other members' devices.
- Devices follow the DB schema with two mutually exclusive categories:

| Campo | Consola | Ordinador |
|-------|---------|-----------|
| `tipo` | `"Consola"` | `"Ordinador"` |
| `nom` | Required | Required |
| `fabricant` | Required | Must be null |
| `generacio` | Required (integer > 0) | Must be null |
| `sit_ope` | Must be null | Required |
| `notes` | Optional | Optional |

The backend must enforce this constraint (equivalent to the DB CHECK constraint).

---

### Platforms (Plataformes)

Full CRUD for digital distribution platforms (Steam, PSN, etc.).

- **Only admins can create/edit/delete platforms.**
- Regular members can view.
- Platforms are referenced by ID in games and accounts — this prevents duplicate strings.
- Fields: `name`, `description`, `devices[]` (compatible device types, strings).

---

### Reviews (Valoracions)

Full CRUD for ratings of games and platforms.

- Two tabs: Games and Platforms.
- Each member can rate any game or platform.
- Members can only **edit/delete their own** reviews. Admins have no extra permission here — they can only edit/delete their own reviews too.
- Fields: `targetId`, `targetType` (`"game"` | `"platform"`), `score` (1–5), `comment` (optional).

---

## 5. Data Models

### User / Me
```json
{
  "id": "m1",
  "name": "Marc Puig",
  "email": "marc.puig@email.com",
  "birthDate": "1988-03-14",
  "isAdmin": true,
  "familyId": "f1",
  "familyName": "Família Puig",
  "avatarColor": "#7c6cff",
  "avatarTextColor": "#fff",
  "stats": {
    "totalHours": 312,
    "gamesPlayed": 14,
    "ratings": 9,
    "accounts": 2
  }
}
```

### Family
```json
{
  "id": "f1",
  "name": "Família Puig",
  "memberCount": 5,
  "members": [ { /* FamilyMember */ } ],
  "total": 5, "page": 1, "limit": 12, "totalPages": 1
}
```

### FamilyMember
```json
{
  "id": "m1",
  "name": "Marc Puig",
  "email": "marc.puig@email.com",
  "isAdmin": true,
  "age": 38,
  "birthDate": "1988-03-14",
  "avatarColor": "#7c6cff",
  "avatarTextColor": "#fff",
  "accountCount": 2,
  "gameCount": 14,
  "hoursThisMonth": 34
}
```

### Game
```json
{
  "id": "g1",
  "name": "The Legend of Zelda: Tears of the Kingdom",
  "emoji": "🗡️",
  "genre": "Aventura",
  "ageRating": 12,
  "platforms": ["Nintendo eShop"],
  "platformIds": ["p3"],
  "ownerId": "m1",
  "available": false,
  "activeSessionId": "s1",
  "activeMemberId": "m3",
  "activeMemberName": "Laia Puig",
  "accounts": [
    {
      "id": "a5",
      "username": "laia_switch",
      "email": "laia@nintendo.com",
      "password": "NintendoLaia99",
      "platform": "Nintendo eShop"
    }
  ]
}
```
> `activeSessionId`, `activeMemberId`, `activeMemberName` are only present when `available: false`.  
> `accounts` is embedded in the game object when calling `GET /api/games/:id/accounts`.

### Session
```json
{
  "id": "s1",
  "gameId": "g1",
  "gameName": "The Legend of Zelda: Tears of the Kingdom",
  "gameEmoji": "🗡️",
  "memberId": "m3",
  "memberName": "Laia Puig",
  "accountId": "a5",
  "platform": "Nintendo eShop",
  "startedAt": "10/06/2026 09:45",
  "endedAt": null,
  "isLive": true,
  "duration": null,
  "elapsed": "1h 12min"
}
```
> `startedAt` and `endedAt` are **formatted strings** (locale `ca-ES`), not ISO timestamps.  
> `duration` is computed and populated by the backend when `isLive = false`.  
> `elapsed` is computed and populated by the backend when `isLive = true`.  
> Neither `duration` nor `elapsed` is stored — they are always derived at query time.

### Account
```json
{
  "id": "a1",
  "memberId": "m1",
  "memberName": "Marc Puig",
  "platformId": "p2",
  "platformName": "PlayStation Store",
  "username": "marc_psn",
  "email": "marc@psn.com",
  "password": "PsnMarc2024",
  "gameCount": 4,
  "lastActivity": "Avui"
}
```

### Platform
```json
{
  "id": "p1",
  "name": "Steam",
  "description": "Plataforma de Valve.",
  "devices": ["Windows PC", "macOS", "Linux", "Steam Deck"],
  "gameCount": 14,
  "avgRating": 4.7
}
```

### Device

Devices are either a **Consola** or an **Ordinador**. The fields differ by category:

**Consola:**
```json
{
  "id": "dev1",
  "memberId": "m1",
  "memberName": "Marc Puig",
  "tipo": "Consola",
  "nom": "PS5 del saló",
  "fabricant": "Sony",
  "generacio": 5,
  "sit_ope": null,
  "notes": "TV principal, 4K HDR",
  "createdAt": "2024-01-10"
}
```

**Ordinador:**
```json
{
  "id": "dev2",
  "memberId": "m1",
  "memberName": "Marc Puig",
  "tipo": "Ordinador",
  "nom": "PC Gaming Marc",
  "fabricant": null,
  "generacio": null,
  "sit_ope": "Windows",
  "notes": "RTX 4070, 32GB RAM",
  "createdAt": "2023-06-15"
}
```

> The DB enforces a `CHECK` constraint: `Consola` requires `fabricant` + `generacio` (both not null) and `sit_ope` must be null; `Ordinador` requires `sit_ope` (not null) and `fabricant` + `generacio` must be null.

### Rating
```json
{
  "id": "r1",
  "targetId": "g1",
  "targetType": "game",
  "targetName": "The Legend of Zelda: Tears of the Kingdom",
  "targetEmoji": "🗡️",
  "memberId": "m3",
  "memberName": "Laia Puig",
  "score": 5,
  "comment": "Obra mestra.",
  "date": "01/06/2026"
}
```

### Dashboard
```json
{
  "currentUserName": "Marc",
  "stats": {
    "totalGames": 37,
    "totalPlatforms": 5,
    "availableGames": 35,
    "inUseGames": 2,
    "memberCount": 5,
    "familyName": "Família Puig",
    "hoursThisMonth": 94,
    "hoursVsLastMonth": "+18% vs mes anterior"
  },
  "activeSessions": [
    {
      "id": "s1",
      "memberId": "m3",
      "memberName": "Laia Puig",
      "gameName": "The Legend of Zelda: Tears of the Kingdom",
      "platform": "Nintendo eShop",
      "startedAt": "2026-06-10T09:45:00"
    }
  ],
  "recentSessions": [ { /* Session with memberId */ } ],
  "popularGames": [
    { "id": "g1", "name": "Zelda: ToTK", "emoji": "🗡️", "totalHours": 142 }
  ]
}
```
> `activeSessions` and `recentSessions` entries must include `memberId` so the frontend can check ownership for the stop button.  
> `duration` and `elapsed` in `recentSessions` are computed by the backend, never stored.

---

## 6. API Specification

> **Base URL:** `/api`  
> **All authenticated routes** require `Authorization: Bearer <token>`.  
> **All list routes** support pagination via `?page=<n>&limit=<n>` and return:
> ```json
> { "data": [...], "total": 42, "page": 1, "limit": 15, "totalPages": 3 }
> ```

---

### Auth

#### `POST /api/auth/login`
```json
// Request
{ "email": "marc@email.com", "password": "secret" }

// 200 Response
{ "token": "<jwt>", "user": { /* User object */ } }

// 401 Error
{ "message": "Correu o contrasenya incorrectes." }
```

#### `POST /api/auth/logout`
```
// No body required
// 204 No Content
```

---

### Current User

#### `GET /api/me`
Returns the full profile of the authenticated user including stats.

#### `PATCH /api/me`
```json
// Request (any subset of fields)
{ "name": "Marc Garcia", "birthDate": "1994-04-12", "email": "marc@email.com" }

// 200 Response — updated user object
```

---

### Dashboard

#### `GET /api/dashboard`
Returns the full dashboard object (see §5 Dashboard model). No query parameters.  
Backend must compute `duration`/`elapsed` for all sessions in `recentSessions` before returning. Must include `memberId` on all session entries.

---

### Family

#### `GET /api/family`
Returns the family the authenticated user belongs to, including paginated member list.

Query params: `search` (filter members by name), `page`, `limit`

```
// 404 if user has no family
{ "message": "Aquest usuari no pertany a cap família." }
```

#### `POST /api/family`
Create a new family. Authenticated user becomes admin. Family name must be unique.

```json
// Request
{ "name": "Família García" }

// 201 Response — family object
// 409 — name already taken
{ "message": "Ja existeix una família amb el nom \"Família García\"." }
// 400 — name missing or blank
{ "message": "El nom de la família és obligatori." }
```

#### `DELETE /api/family/leave`
Authenticated user leaves their family.

```
// 204 — success
// 400 — admin cannot leave without transferring first:
{ "message": "L'administrador no pot sortir de la família sense transferir primer l'administració." }
```

#### `GET /api/family/members/:id/accounts`
Returns all platform accounts belonging to the specified member.

```json
// 200 — array of Account objects (with email + password)
[{ "id": "a1", "platformName": "Steam", "email": "...", "password": "..." }]
```

#### `POST /api/family/members`
Add a member to the family by email address (admin only).

```json
// Request
{ "email": "newmember@example.com" }

// 201 — new FamilyMember object
// 400 — family full
{ "message": "La família ja ha arribat al límit de 5 membres." }
// 404 — user not found
{ "message": "No s'ha trobat cap usuari amb el correu indicat." }
// 409 — already in a family
{ "message": "Aquest usuari ja pertany a una altra família." }
```

#### `PATCH /api/family/members/:id`
Update a family member (admin only). Used to transfer admin role.

```json
// Request
{ "isAdmin": true }
```

#### `DELETE /api/family/members/:id`
Remove a member from the family (admin only).

```
// 204 on success
// 403 if trying to remove admin
{ "message": "No es pot eliminar l'administrador de la família." }
```

---

### Games

#### `GET /api/games`
Query params: `search`, `genre`, `platform` (platform name), `ownedByMe` (boolean — filters to **current user's games only**, no admin override), `page`, `limit`

For games where `available: false`, the response must include `activeSessionId`, `activeMemberId`, and `activeMemberName` (resolved from the current live session for that game).

#### `GET /api/games/:id`
Returns single game with embedded accounts array.

#### `GET /api/games/:id/accounts`
Returns accounts that can be used to play this game (accounts whose `platformId` is in the game's `platformIds`).

```json
// 200
[
  {
    "id": "a5",
    "platform": "Nintendo eShop",
    "email": "laia@nintendo.com",
    "password": "NintendoLaia99",
    "username": "laia_switch"
  }
]
```

#### `POST /api/games`
```json
{
  "name": "Zelda: Breath of the Wild",
  "genre": "Aventura",
  "ageRating": 12,
  "emoji": "🌿",
  "platformIds": ["p3"]
}
// 201 — game object (backend sets ownerId from token, available: true)
```

#### `PATCH /api/games/:id`
Same structure as POST. Backend enforces: **only owner** can edit. Admin has no special access.

```
// 403 if not owner:
{ "message": "Només el propietari pot editar aquest joc." }
```

#### `DELETE /api/games/:id`
**Only owner** can delete. Admin has no special access.

```
// 204 on success
// 403 if not owner:
{ "message": "Només el propietari pot eliminar aquest joc." }
```

---

### Sessions

#### `GET /api/sessions`
Query params: `search`, `memberId`, `gameId`, `page`, `limit`

All sessions are returned including live and completed. Backend **must compute** `elapsed` (for live) and `duration` (for completed) before returning — these are never stored.

#### `POST /api/sessions`
```json
{ "gameId": "g1", "accountId": "a5" }
// 201 — session object (backend resolves memberId from token, marks game as in use)
// 409 if game already in use:
{ "message": "Aquest joc ja està en ús." }
```

#### `PATCH /api/sessions/:id/stop`
Stop an active session. **Only the member who started the session** can stop it.

```
// 200 — updated session object (isLive: false, endedAt set, duration computed)
// 400 — session already ended:
{ "message": "Aquesta partida ja ha finalitzat." }
// 403 — not the session owner:
{ "message": "Només el jugador pot aturar la seva partida." }
// 404 — session not found
```

Side effect: restores the game's `available` to `true`.

---

### Platforms

#### `GET /api/platforms`
Query params: `search`, `page`, `limit`

#### `GET /api/platforms/:id`

#### `POST /api/platforms` (admin only)
```json
{
  "name": "Epic Games Store",
  "description": "Distribuïdor digital de Epic Games.",
  "devices": ["Windows PC", "macOS"]
}
```

#### `PATCH /api/platforms/:id` (admin only)

#### `DELETE /api/platforms/:id` (admin only)
```
// 409 if platform has associated accounts or games:
{ "message": "No es pot eliminar la plataforma perquè té comptes o jocs associats." }
```

---

### Accounts

#### `GET /api/accounts`
Query params: `search` (username/email), `memberId`, `platformId`, `page`, `limit`

#### `GET /api/accounts/:id`
Returns full account record including `password`.

#### `POST /api/accounts`
```json
{
  "memberId": "m1",
  "platformId": "p1",
  "username": "marc_steam",
  "email": "marc@steam.com",
  "password": "SteamMarc!"
}
```

#### `PATCH /api/accounts/:id`
**Only the account owner** (`memberId`) can edit. Admin has no special access.

```
// 403 if not owner:
{ "message": "Només el propietari pot editar aquest compte." }
```

If `password` is empty string or absent, do not change the password.

#### `DELETE /api/accounts/:id`
**Only the account owner** can delete. Admin has no special access.

```
// 403 if not owner:
{ "message": "Només el propietari pot eliminar aquest compte." }
```

---

### Devices

#### `GET /api/devices`
Query params: `search` (matches `nom`, `tipo`, `fabricant`, `sit_ope`), `memberId`, `page`, `limit`

#### `POST /api/devices`
```json
// Consola
{
  "memberId": "m1",
  "tipo": "Consola",
  "nom": "PS5 del saló",
  "fabricant": "Sony",
  "generacio": 5,
  "notes": "TV principal, 4K HDR"
}

// Ordinador
{
  "memberId": "m1",
  "tipo": "Ordinador",
  "nom": "PC Gaming Marc",
  "sit_ope": "Windows",
  "notes": "RTX 4070, 32GB RAM"
}
```
Backend sets `memberId` from token if not admin; admin can assign `memberId` to any family member.

#### `PATCH /api/devices/:id`
**Only the device owner** (`memberId`) can edit. Admin has no special access.

```
// 403 if not owner:
{ "message": "Només el propietari pot editar aquest dispositiu." }
```

#### `DELETE /api/devices/:id`
**Only the device owner** can delete. Admin has no special access.

```
// 403 if not owner:
{ "message": "Només el propietari pot eliminar aquest dispositiu." }
```

---

### Reviews (Ratings)

#### `GET /api/ratings`
Query params: `type` (`game` | `platform`), `search` (target name), `page`, `limit`

#### `POST /api/ratings`
```json
{
  "targetId": "g1",
  "targetType": "game",
  "score": 5,
  "comment": "Obra mestra."
}
// Backend sets memberId from token, resolves targetName, sets date
```

#### `PATCH /api/ratings/:id`
**Only the review author** (`memberId`) can edit. Admin has no special access.

```
// 403 if not author:
{ "message": "Només el propietari pot editar aquesta valoració." }
```

#### `DELETE /api/ratings/:id`
**Only the review author** can delete. Admin has no special access.

```
// 403 if not author:
{ "message": "Només el propietari pot eliminar aquesta valoració." }
```

---

## 7. Validation Rules & Business Constraints

| Rule | Entity | Details |
|------|--------|---------|
| Family name uniqueness | Family | Names must be globally unique. Return 409 on conflict. |
| Max 5 members | Family | `POST /api/family/members` returns 400 if `memberCount >= 5`. Backend enforces independently of frontend. |
| Creator becomes admin | Family | `POST /api/family` always sets `isAdmin: true` for the creator. One admin per family at any time. |
| One family per user | Member | A user cannot belong to two families simultaneously. Return 409 on `POST /api/family/members` if the user already has a `familyId`. |
| Admin leave restriction | Family | Admin cannot leave without transferring first. Return 400. |
| Admin cannot be removed | Family | `DELETE /api/family/members/:id` returns 403 if the target is the admin. |
| **Strict ownership — no admin bypass** | Game, Account, Device, Rating | Only the owner/author (`ownerId` or `memberId`) can PATCH or DELETE their resource. Admin role confers **no extra permission** here. Always return 403 for non-owners, regardless of admin status. |
| `ownedByMe` filter | Game | `GET /api/games?ownedByMe=true` returns only games where `ownerId === currentUser.id`. Admin does not see all games — only their own. |
| Game in use | Session | Cannot start a session for a game that already has `isLive: true`. Return 409. |
| Stop session ownership | Session | Only `session.memberId === currentUser.id` can call `PATCH /api/sessions/:id/stop`. |
| Device tipo constraint | Device | `Consola`: `fabricant` + `generacio` required, `sit_ope` must be null. `Ordinador`: `sit_ope` required, `fabricant` + `generacio` must be null. Return 400 on violation. |
| Platform deletion | Platform | Cannot delete a platform with associated games or accounts. Return 409. |
| Password on edit | Account | If `password` field is missing or empty string in PATCH, leave it unchanged. |
| Age rating | Game | Integer 0–18. |
| Score range | Rating | Numeric 0–5 (supports decimals, e.g. 4.5). |
| `generacio` | Device (Consola) | Integer > 0. |
| Email format | All | Standard email validation. Return 400 with descriptive message. |
| Duration computation | Session | Backend always computes `duration` and `elapsed` at query time from `startedAt`/`endedAt`. Never store or trust these values from the client. |
| SQL injection prevention | All | Always use parameterised queries. |

---

## 8. Error Response Format

All errors must return a JSON body in this format:

```json
{ "message": "Descriptive error message in the UI language (Catalan)." }
```

The frontend reads `error.message` from every caught exception and displays it directly in a toast notification. The message must therefore be **user-facing, in Catalan, and actionable**.

**Standard HTTP status codes used:**

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (DELETE, logout) |
| 400 | Bad Request (validation failure, business rule violation) |
| 401 | Unauthorized (missing/invalid/expired token) |
| 403 | Forbidden (authenticated but not permitted — always means "not the owner") |
| 404 | Not Found |
| 409 | Conflict (duplicate name, already in family, game in use) |
| 500 | Internal Server Error |

---

## 9. Notes for the Backend Team

### Architecture recommendations

- **JWT authentication** is preferred. Store the `userId` in the JWT payload so any route can identify the caller without a DB lookup on `/me`.
- **Soft-delete** games, accounts, and sessions rather than hard-deleting, to preserve session history integrity.
- The `GET /api/me` endpoint is called on every page load (token restore). Keep it fast — consider caching.

### Ownership enforcement

Every `PATCH` and `DELETE` handler for games, accounts, devices, and ratings must:
1. Extract `userId` from the JWT.
2. Fetch the resource from the DB.
3. Compare `resource.ownerId` (or `resource.memberId`) with `userId`.
4. Return **403** if they do not match — regardless of whether the user is an admin.

There is **no admin bypass** on content ownership. The admin role only governs family management endpoints (`/family/members`).

### Atomic admin transfer

The current frontend makes two sequential PATCH calls to transfer admin:
1. `PATCH /family/members/:currentAdminId` with `{ isAdmin: false }`
2. `PATCH /family/members/:newAdminId`    with `{ isAdmin: true }`

This is not atomic. Recommend adding:
```
POST /api/family/transfer-admin
Body: { "newAdminId": "m2" }
```
which transfers in a single transaction.

### Session lifecycle

Sessions are started via `POST /api/sessions` and stopped via `PATCH /api/sessions/:id/stop` (owner only). The stop endpoint must:
1. Set `endedAt` to the current timestamp.
2. Set `isLive` to `false`.
3. Set `game.available` to `true`.
4. Return the updated session object with `duration` computed.

`duration` and `elapsed` are **never stored in the database** — they are always computed from `startedAt` and `endedAt` (or `NOW()` for live sessions) at query time.

### Active session annotation on games

`GET /api/games` must annotate games where `available: false` with:
- `activeSessionId` — the ID of the live session
- `activeMemberId` — the member currently playing
- `activeMemberName` — their display name

This is a JOIN query: `sessions WHERE gameId = game.id AND isLive = true LIMIT 1`.

### Platform accounts on games

`GET /api/games/:id/accounts` must return only accounts whose `platformId` matches one of the game's `platformIds`. This is a join query: `accounts WHERE platformId IN (game.platformIds)`.

### Password storage

Never store passwords in plaintext. Use bcrypt (or argon2) with an appropriate cost factor. The `password` field returned in account details is a **platform credential** (e.g. Steam login), not the user's own app password. Consider encrypting these at rest (e.g. AES-256-GCM with a server-side key).

### Family size enforcement

Enforce `memberCount < 5` at both the application level and the database level (serialized transaction or DB constraint) to prevent race conditions.

### Pagination

All list endpoints must accept `page` (default 1) and `limit` (default varies by entity) and return:
```json
{ "data": [...], "total": <total records>, "page": 1, "limit": 15, "totalPages": 3 }
```

### CORS

The Vite dev server proxies `/api` to the backend. In production, configure CORS to allow requests from the frontend origin.

### Running the mock server (development)

```bash
# Terminal 1 — mock backend
node server.cjs
# Runs on http://localhost:3001
# Test login: marc.puig@email.com / demo1234

# Terminal 2 — frontend
npm run dev
# Vite proxies /api → http://localhost:3001
```

### Running the frontend only

```bash
npm install
npm run dev
```

Then set `VITE_API_URL` in `.env` to point to your real backend:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

---

## Project Structure

```
src/
├── context/AppContext.jsx       # Auth state, navigation, toasts, modal
├── hooks/useFetch.js            # Generic data fetching: { data, loading, error, reload }
├── services/api.js              # All HTTP calls — token attached automatically
├── components/
│   ├── Sidebar.jsx              # Navigation + logout
│   ├── Pagination.jsx           # Reusable paginator
│   └── UI.jsx                   # Toast, Modal, Stars, LoadingState, ErrorState, EmptyState
└── pages/
    ├── LoginPage.jsx            # Auth gate
    ├── DashboardPage.jsx        # Family overview + stop own sessions
    ├── BibliotecaPage.jsx       # Game library — browse (with who is playing) + edit mode
    ├── PartidesPage.jsx         # Session history + stop own live sessions
    ├── FamiliaPage.jsx          # Family management + create family
    ├── ComptesPage.jsx          # Platform accounts CRUD (own only)
    ├── DispositiusPage.jsx      # Physical devices CRUD (own only, Consola/Ordinador schema)
    ├── PlataformesPage.jsx      # Platform definitions CRUD (admin only)
    ├── ValoracionsPage.jsx      # Reviews CRUD (own only)
    └── PerfilPage.jsx           # User profile editor
```

## Entity Relationship Summary

| Entity | Relationship | Notes |
|--------|-------------|-------|
| Family | 1 : N → Member | Max 5 members |
| Member | N : 1 → Family | One family per member |
| Member | 1 : N → Account | Platform accounts (owner-only edit/delete) |
| Member | 1 : N → Device | Physical devices (owner-only edit/delete) |
| Member | 1 : N → Rating | Reviews authored (author-only edit/delete) |
| Member | 1 : N → Session | Play history (owner can stop own live session) |
| Game   | N : N → Platform | Via `platformIds[]` |
| Game   | N : N → Account  | Accounts that can play it |
| Session | N : 1 → Game | Each session plays one game |
| Session | N : 1 → Account | Each session uses one account |
| Rating | N : 1 → Game or Platform | Polymorphic via `targetType` |
| Dispositiu | two subtypes | `Consola` (fabricant + generacio) or `Ordinador` (sit_ope) |
