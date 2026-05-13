# NexusJournal — User Roles & Access Control

## Roles

| Role | Description |
|---|---|
| `admin` | Full access. Can manage users, change roles, edit any manuscript, publish, manage classifications. |
| `editor` | Can view all manuscripts, run AI review, assign reviewers, make decisions, publish. |
| `researcher` | Can create and submit manuscripts. Sees own manuscripts only. |
| `reviewer` | Can submit peer reviews on manuscripts assigned to them. |
| `practitioner` | Can access practice data tools and generate manuscripts from clinical data. |
| `reader` | Can search and view published papers. Cannot create or manage manuscripts. |

A user can have multiple roles stored in `user.roles[]`. The primary role is `user.role` (string).

---

## Page Access by Role

| Page | Public | reader | researcher | reviewer | editor | admin |
|---|---|---|---|---|---|---|
| Published papers (`/`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paper view (`/papers/:id`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login / Register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create manuscript | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Submit manuscript | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| My reviews | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Peer review form | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Editor dashboard | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin manuscripts | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Admin users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Practice data tools | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (+ practitioner) |

---

## API Access by Role

### Public (no auth)
- `GET /api/papers/search`
- `GET /api/papers/:id`
- `GET /api/papers/:id/download`
- `GET /api/journals/search`
- `GET /api/journals/:id`
- `GET /api/config/classifications`
- `GET /papers/:id` (Scholar HTML)
- `GET /sitemap.xml`
- `GET /robots.txt`

### Any authenticated user
- `GET /api/auth/me`
- `GET /api/manuscripts` (filtered — authors see own only)
- `GET /api/manuscripts/:id` (own only unless editor/admin)
- `POST /api/manuscripts` (create)
- `PATCH /api/manuscripts/:id` (own drafts / revisions only)
- `POST /api/manuscripts/:id/submit`
- `POST /api/manuscripts/drafts`
- `POST /api/manuscripts/ai/*` (AI writing tools)

### editor + admin only
- `GET /api/manuscripts` (all manuscripts)
- `POST /api/manuscripts/:id/assign-reviewers`
- `PATCH /api/manuscripts/:id/decision`
- `POST /api/manuscripts/:id/send-feedback`
- `POST /api/manuscripts/:id/publish`
- `POST /api/manuscripts/:id/ai-review`
- `POST /api/manuscripts/:id/promote-to-final`
- `GET /api/manuscripts/reviewer-candidates`

### admin only
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/role`
- `PATCH /api/admin/users/:userId/active`
- `DELETE /api/journals/:id`
- `POST /api/config/classifications`
- `GET /api/ingest/*`

---

## Changing a User's Role (Admin)

### Via Admin UI
1. Go to `/admin/users`
2. Find user, change role in dropdown, save

### Via API
```
PATCH /api/admin/users/:userId/role
Body: { "role": "editor" }
```

### Directly in MongoDB (emergency only)
```js
db.collection('users').updateOne(
  { email: 'user@example.com' },
  { $set: { role: 'editor', roles: ['editor'] } }
)
```

---

## New User Default Role

New users who register via `/register` get role `researcher` by default. An admin must manually upgrade to `editor` or `reviewer` via the Admin Users page or the API.
