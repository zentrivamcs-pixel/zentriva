# CTCA Youth & Children registration on ctca.zentrivacoop.com/register

This folder is a small static site (`register.html` + `register.js`) deployed
as its **own** Vercel project. Its data is stored in the main site's Turso
database, through one endpoint on the main project: **`/api/youth`**
([../api/youth.js](../api/youth.js), data layer
[../shared/youthRepo.js](../shared/youthRepo.js), table `youth_registrants`,
created automatically on first use).

This site's `vercel.json` proxies `/api/youth` to
`https://zentrivacoop.com/api/youth`, so the browser only ever talks to
ctca.zentrivacoop.com: no CORS, and no database credentials in this project.

## 1. Main project (zentrivacoop.com): add two environment variables
Vercel → main project → Settings → Environment Variables (Production):

| Key | Value |
| --- | --- |
| `YOUTH_ORGANISER_PIN` | PIN for the Organiser view on the registration page. 6+ digits |
| `YOUTH_COORD_CODE` | code coordinators type to get a CO-### badge (not case-sensitive) |

Then **redeploy the main project**. Env changes only reach new deployments.
Until these are set, normal registration works but the Organiser view and
coordinator sign-up say "not set up yet".

Admins signed in to the main site's dashboard can also read the list with
`GET /api/youth` (admin bearer token).

## 2. This project (zentriva-youth-register)
Already created with Root Directory `youth-register`. Nothing to configure:
no env vars, no build. It redeploys on its own when this folder changes.

## 3. Subdomain: add it to THIS project only
zentriva-youth-register → Settings → Domains → Add `ctca.zentrivacoop.com`.
- DNS on Vercel: done automatically.
- DNS elsewhere: add one record `CNAME ctca → cname.vercel-dns.com`
  (Cloudflare: DNS only, grey cloud). Add a TXT record too if Vercel asks.

Do **not** add it to the main project: it has its own `/register` page.
Do **not** change the `@`, `www`, MX or other TXT records.

## 4. Check
- https://ctca.zentrivacoop.com/register: register a test person and spin.
- Organiser link at the bottom → PIN → the test person is listed.
- https://zentrivacoop.com and https://zentrivacoop.com/register look the
  same as before.

## Exporting to Excel
Organiser view → **Copy lists**, or query the table in the Turso dashboard
(`SELECT tag, full_name, age, gender, age_grade, group_name, created_at FROM
youth_registrants ORDER BY code, seq`) and export it as CSV.

## Undo
Remove the domain from this project and delete the `ctca` DNS record. The
`youth_registrants` table can stay; nothing else reads it.
