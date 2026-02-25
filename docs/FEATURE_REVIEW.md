# Feature review: Tags, filters, shareable stories, playlists

## Public UI

### Homepage (`/`)

| Feature | Status | Notes |
|--------|--------|--------|
| **Collections section** | ✅ | Renders when `collections.length > 0`. Chips link to `/collections/[slug]`. |
| **Filter bar** | ✅ | Tag, Language, Collection dropdowns. Options from `/api/filter-options` and `/api/collections`. Changing a filter reloads approved submissions with query params. |
| **Featured stories** | ✅ | List from `/api/approved-submissions` (supports `tag`, `language`, `collection`, `page`, `limit`). |
| **Story cards** | ✅ | Name links to `/stories/[id]`. Tags and collection slug shown as chips. "Share this story →" links to shareable page. |
| **Empty states** | ✅ | No collections → section hidden. No stories → "No approved stories yet". |

### Shareable story page (`/stories/[id]`)

| Feature | Status | Notes |
|--------|--------|--------|
| **Fetch** | ✅ | `GET /api/stories/[id]` returns one approved story or 404. Invalid id returns 404 (or CastError caught). |
| **SEO / OG** | ✅ | `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:url`, `twitter:card`. |
| **Content** | ✅ | Name, date, tags/chip, transcript (ProgressiveTranscript), audio player, PROC responses. |
| **Navigation** | ✅ | "← All stories" (home), "View collection →" when `collectionSlug` is set. |
| **Loading / error** | ✅ | Loading spinner; 404 or fetch error shows message and link home. |

### Collection playlist page (`/collections/[slug]`)

| Feature | Status | Notes |
|--------|--------|--------|
| **Fetch** | ✅ | Approved submissions with `collection=[slug]` + list of collections for name/description. |
| **Title / description** | ✅ | From collection doc or fallback to slug. |
| **Story list** | ✅ | Same card pattern as homepage: transcript, audio, "Share this story →" to `/stories/[id]`. |
| **Empty / error** | ✅ | "No stories in this collection yet" when list empty. API error surfaced with `fetchError`. |

---

## Admin

### Dashboard

| Feature | Status | Notes |
|--------|--------|--------|
| **Create collection** | ✅ | Form: name, slug (optional, derived from name), description. `POST /api/admin/collections`. List refreshes after create. |
| **Per-submission metadata** | ✅ | Section "Tags & collection": tags (comma-separated), language (en/es/fr/other), collection (dropdown). "Save tags & collection" sends PUT with current `status`, `adminNotes`, `tags`, `language`, `collectionSlug`. |
| **Load collections** | ✅ | `GET /api/admin/collections` on auth; dropdown uses result. |
| **Submissions list** | ✅ | Full docs include `tags`, `language`, `collectionSlug`. Tags shown as string for input (array joined with `, `). |

### APIs

| Endpoint | Status | Notes |
|----------|--------|--------|
| `GET /api/approved-submissions` | ✅ | Query: `tag`, `language`, `collection`, `page`, `limit`. Response includes `tags`, `language`, `collectionSlug`. `id` as string. |
| `GET /api/filter-options` | ✅ | Aggregates distinct `tags` and `language` from approved submissions. |
| `GET /api/collections` | ✅ | Public list of collections (name, slug, description). |
| `GET /api/stories/[id]` | ✅ | One approved story or 404. Invalid id → 404/CastError handled. `id` as string. |
| `GET /api/admin/collections` | ✅ | Auth required. Same list for admin. |
| `POST /api/admin/collections` | ✅ | Auth required. Name required; slug optional (derived from name). |
| `PUT /api/admin/submissions/[id]` | ✅ | Accepts `tags` (array), `language`, `collectionSlug` in addition to `status`, `adminNotes`. |

---

## Data model

| Model / field | Status | Notes |
|---------------|--------|--------|
| **Submission** | ✅ | `tags` (array), `language` (string), `collectionSlug` (string). Indexes on `tags`, `collectionSlug`. |
| **Collection** | ✅ | `name`, `slug` (unique), `description`, `createdAt`. |

---

## Edge cases and fixes applied

1. **Story id type** – APIs return `id: String(submission._id)` so clients always get a string.
2. **Invalid story id** – `/api/stories/[id]` validates `id` and catches Mongoose `CastError` → 404.
3. **Collection page errors** – If approved-submissions returns `error`, it’s shown and list is cleared; loading/empty states adjusted.
4. **Admin create collection** – Slug is optional in API; derived from name when missing so UI can send name only.

---

## How to verify manually

1. **Admin:** Log in → create a collection (e.g. "Youth 2025", slug `youth-2025`) → open a submission → set tags (e.g. `health, joy`), language, collection → Save tags & collection.
2. **Home:** Open `/` → see Collections section and filter bar → select a tag/language/collection → see list update → click a collection chip → see collection page.
3. **Shareable story:** From home or collection page, click a name or "Share this story" → check `/stories/[id]` (title, OG, transcript, audio, back/collection links).
4. **Collection page:** Visit `/collections/youth-2025` (or your slug) → see stories in that collection; if none, see "No stories in this collection yet."

All of the above flows are implemented and wired end-to-end for both UI and admin.
