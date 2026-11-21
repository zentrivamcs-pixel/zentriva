# CTCA Youth & Children registration on ctca.zentrivacoop.com/register

This folder is a separate, tiny static site. It shows the Google Apps Script
form (`apps-script/Code.gs`) inside a full-page frame. It is deployed as its
**own** Vercel project; the main zentrivacoop.com project is not changed.

## 1. Deploy the Apps Script (Google)
1. Follow the SETUP steps at the top of `apps-script/Code.gs`.
2. Project Settings (gear) > Script properties > add `ADMIN_PIN` (6+ digits)
   and `COORD_CODE`. They are kept out of this file because the GitHub repo
   is public.
3. Deploy > Web app: Execute as **Me**, Who has access **Anyone**
   (not "Anyone with a Google account", which breaks the embedded page).
4. Copy the Web app URL (`https://script.google.com/macros/s/.../exec`),
   open it once and do a test registration.

## 2. Put the URL in this folder
In `register.html`, replace both `PASTE_DEPLOYMENT_ID` URLs with that URL,
commit and push.

## 3. Create a NEW Vercel project (do not use the existing one)
The main site already serves its own `/register` page. If you add the
subdomain to that project, `ctca.zentrivacoop.com/register` shows the
business form instead of this one.

In the Vercel account/team that owns zentrivacoop.com:
1. Add New > Project > import `zentrivamcs-pixel/zentriva` (same repo).
2. **Root Directory: `youth-register`** (click Edit next to it).
3. Framework preset **Other**. Leave build/output settings empty
   (`vercel.json` sets them). No environment variables needed.
4. Deploy. Check the `*.vercel.app` URL shows the form.

`vercel.json` has an ignore step, so this project only rebuilds when files
in `youth-register/` change.

## 4. Add the subdomain to the NEW project only
New project > Settings > Domains > Add `ctca.zentrivacoop.com`.
- DNS on Vercel (nameservers `ns1/ns2.vercel-dns.com`): done automatically.
- DNS elsewhere (registrar, Cloudflare): add **one** record:
  `CNAME  ctca  ->  cname.vercel-dns.com` (Cloudflare: DNS only, grey cloud).
- If Vercel asks for a TXT verification record, add it too.

Do **not** change the `@`/apex, `www`, MX (email) or other TXT records.

## 5. Check
- https://ctca.zentrivacoop.com/register shows the form and a test entry
  lands in the Sheet.
- https://zentrivacoop.com, https://www.zentrivacoop.com and
  https://zentrivacoop.com/register still look exactly as before.

## Undo
Remove the domain from the new project and delete the `ctca` DNS record.
The main site is not affected by either step.

## Updating the form later
Edit the code in Apps Script > Deploy > Manage deployments > Edit >
Version: New version > Deploy. The URL stays the same, so this folder
does not need redeploying. Copy the change into `apps-script/Code.gs`
to keep the repo in sync.
