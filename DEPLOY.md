# Deploying to Vercel (with Turso database)

The React app is served by Vercel as a static site. The `/api/members` API runs as
**Vercel Serverless Functions** (the [api/](api/) directory) backed by **Turso**
(a cloud, SQLite-compatible database).

| Route | File |
| --- | --- |
| `GET /api/members`, `POST /api/members` | [api/members/index.js](api/members/index.js) |
| `PUT /api/members/:id`, `DELETE /api/members/:id` | [api/members/[id].js](api/members/[id].js) |
| shared DB helpers (not a route — `_` prefix) | [api/_lib.js](api/_lib.js) |

> Local development is unchanged: `npm run dev` still runs the Express + local SQLite
> server. Turso is only used for the deployed site.

---

## 1. Create a free Turso database

1. Sign up at https://turso.tech.
2. Create a database (any name, e.g. `ctca-directory`).
3. Copy two values:
   - **Database URL** — looks like `libsql://ctca-directory-yourname.turso.io`
   - **Auth token** — create one in the database's *Tokens* section.

(CLI alternative: `turso db create ctca-directory`, then
`turso db show ctca-directory --url` and `turso db tokens create ctca-directory`.)

The `members` table is created automatically on first request — no manual SQL needed.

---

## 2. Push this project to GitHub

Vercel deploys from a Git repo. Create a repo and push the `ctca-business-form` folder.

---

## 3. Import the project into Vercel

1. In Vercel: **Add New… → Project →** import your repo.
2. Vercel auto-detects Create React App. Settings come from [vercel.json](vercel.json):
   - Build command: `npm run build`
   - Output directory: `build`
   - The `api/` folder is deployed as serverless functions automatically.

---

## 4. Set environment variables (Vercel → Project → Settings → Environment Variables)

| Key | Value | Scope |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | your Turso database URL (`libsql://…`) | runtime |
| `TURSO_AUTH_TOKEN` | your Turso auth token | runtime |
| `ADMIN_PASSWORD` | the password for `/admin` | runtime |
| `SESSION_SECRET` | long random string signing admin/member tokens | runtime |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (server-side payment verification) | runtime |
| `REACT_APP_PAYSTACK_PUBLIC_KEY` | Paystack public key | build |
| `REACT_APP_WHATSAPP_GROUP_URL` | your WhatsApp group invite link | build |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token — passport photos and bank-transfer payment proof uploads fail without this. Create a Blob store under Storage → Create Database → Blob and link it to the project; Vercel sets this automatically | runtime |
| `RESEND_API_KEY` | Resend API key. Sends registration, verification, password-reset and payment emails, **and** fetches the body of inbound mail for the admin Inbox | runtime |
| `EMAIL_FROM` | Sender on your Resend-verified domain, e.g. `Zentriva <no-reply@zentrivacoop.com>`. Email stays disabled until this and `RESEND_API_KEY` are both set | runtime |
| `APP_BASE_URL` | Public site origin used in email links, e.g. `https://zentrivacoop.com` | runtime |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the Resend webhook that delivers inbound mail. **Without it every inbound email is rejected and never reaches the admin Inbox** | runtime |

> `REACT_APP_*` values are baked into the JS bundle at **build time** — if you change
> one later, redeploy. Every other value here is read at **runtime** by the functions.
> Add them all to the **Production** environment (and Preview, if you use it).

### Receiving mail in the admin Inbox

Two separate things land in Admin → Inbox:

- **Website contact form** (`/contact`) — written straight to the database by
  `POST /api/contact`. Needs no Resend setup at all; if these are missing, the
  problem is the database or the API, not email.
- **Real email to your support address** — needs Resend Inbound:
  1. Resend dashboard → your domain → enable **Inbound**, add the MX record it shows.
  2. **Webhooks → Add Webhook**, URL `https://<your-domain>/api/inbox/receive`,
     event **`email.received`** only.
  3. Copy the webhook's signing secret into `RESEND_WEBHOOK_SECRET` and redeploy.

  A rejected delivery is logged by the function (`signature rejected`, with the
  headers it did/didn't see) — check the Vercel function logs if mail isn't arriving.

### Mailing members from the dashboard (Admin → Send Mail)

`/admin/broadcast` sends one message to every member in a chosen audience (all,
paid, pending review, verified/unverified email) from the `EMAIL_FROM` no-reply
address, with `Reply-To` set to the support address so replies land back in the
admin Inbox. It needs **`RESEND_API_KEY` + `EMAIL_FROM`** and nothing else — the
page shows a warning banner and refuses to send while they're missing.

- Each member is addressed individually (Resend's batch API, 100 per request) —
  no member ever sees another member's address.
- `{{first_name}}`, `{{name}}` and `{{membership_id}}` are substituted per copy;
  `**bold**` and `[label](https://…)` are formatted, everything else is escaped.
- Every send is recorded in the `broadcasts` table (created automatically) and
  listed on the page with its delivered/failed counts.
- A single send is capped at 1,000 recipients so it finishes inside the
  function's time budget.
- Recipients are re-selected server-side from the database on every send; the
  browser only sends an audience key.

---

## 4b. SEO — how it works and what only you can do

`npm run build` runs [scripts/build-seo.js](scripts/build-seo.js) after the CRA
build. All page copy lives in **[src/shared/seo.json](src/shared/seo.json)** — edit
titles and descriptions there, nowhere else. The script then:

- writes a **static HTML file per public route** (`register.html`, `contact.html`,
  `privacy.html`, `terms.html`) with that page's own `<title>`, description,
  canonical, Open Graph tags and JSON-LD, and [vercel.json](vercel.json) rewrites
  `/register` → `/register.html` etc. Each file boots the same bundle, so the app
  is unchanged — but a crawler now reads real per-page metadata before any
  JavaScript runs, instead of one shared shell for the whole site;
- generates **sitemap.xml** and **robots.txt** (which disallows `/admin` and
  `/member` and points at the sitemap).

`src/shared/seo.js` applies the same metadata during client-side navigation and
is what puts `noindex` on the admin, member portal, 404, and token-link pages.

The canonical origin defaults to `https://zentrivacoop.com`. If the live domain
is ever different, set **`SITE_URL`** in Vercel (or change `siteUrl` in
`seo.json`) — canonicals, the sitemap, and JSON-LD all follow it.

**Manual steps (nobody can do these from the codebase):**

1. **Google Search Console** — add the property at
   https://search.google.com/search-console, verify via the DNS TXT record (works
   for both `zentrivacoop.com` and `www`), then **Sitemaps → submit**
   `https://zentrivacoop.com/sitemap.xml`. Use **URL Inspection → Request
   indexing** on `/` and `/register` to skip the queue.
2. **Pick one hostname.** Serving the site on both `zentrivacoop.com` and
   `www.zentrivacoop.com` (or a `*.vercel.app` domain) splits your ranking. In
   Vercel → Domains, mark one as primary and let the others 308-redirect to it.
   Canonical tags already point at `siteUrl`, but a redirect is stronger.
3. **Google Business Profile** — for a Nigerian cooperative this is usually the
   single biggest win for "cooperative society near me" style searches. It needs
   a real address and phone number, which is also what's missing from the
   `Organization` JSON-LD: once you have them, add `address` and `telephone` in
   `scripts/build-seo.js` and consider switching the type to `LocalBusiness`.
4. **Backlinks and citations** — links from the cooperative's registration body,
   partner organisations, and local directories move rankings more than anything
   on-page at this stage.

Deliberately **not** faked: address, phone, founding date, social profiles, and
`Event`/`FAQ` structured data. Structured data that contradicts reality (or
describes events with no real venue or date) risks a Google manual action. Add
each one as it becomes true.

---

## 5. Deploy

Click **Deploy**. When it finishes:

- `https://your-project.vercel.app/` → the form
- `https://your-project.vercel.app/admin` → the password-gated dashboard

---

## Notes

- **Existing local data** in `server/data.sqlite` is *not* migrated automatically.
  The deployed site starts with an empty Turso table; re-enter records via the form if needed.
- To run the full Vercel stack locally (functions + Turso), you can use
  `npx vercel dev` after setting the env vars — but day-to-day, `npm run dev`
  (Express + local SQLite) is simpler and needs no cloud database.
