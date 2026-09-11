# RBE Forms API (Google Apps Script + Sheets)

Replaces Google Forms for **join** and **newsletter**.  
One **spreadsheet-bound** Apps Script Web App · three tabs (`Join`, `Newsletter`, `Contact`).

This is **not** a Google Form. You create a Google Sheet, open **Extensions → Apps Script** from that sheet, paste `Code.gs`, and deploy it as a Web App. The script is already linked to the file via `SpreadsheetApp.getActiveSpreadsheet()` — no spreadsheet ID to copy around. The website POSTs JSON; the script appends a row and (for join) sends emails. Visitors cannot read, edit, or delete sheet data through the API.

## Dynamic Configuration (`Config` Sheet Tab)

Configuration can be managed directly in the **`Config` sheet tab** of your spreadsheet (created automatically via `setupSpreadsheet()` or upon first run).

**Why use the `Config` tab?**
- **Instant updates without redeployment:** You can change notification emails or OneSignal credentials anytime directly in the sheet. Updates take effect within 60 seconds (cached via `CacheService` to protect quota) without creating a new Web App deployment version.
- **Secrecy & Privacy:** Private OneSignal API keys and officer email addresses remain safely stored inside your private Google Sheet rather than committed to a public git repository.

| Key | Purpose | Default |
|-----|---------|---------|
| `clubNotifyEmail` | Where club join alerts go (also CC on applicant mail) | `rotaractblreast@gmail.com` |
| `replyToEmail` | Reply-To on the applicant thank-you (comma-separated OK). Always the club inbox — not the Apps Script owner account that appears as From. | `rotaractblreast@gmail.com` |
| `oneSignalAppId` | OneSignal App ID (from onesignal.com dashboard) | *(empty)* |
| `oneSignalApiKey` | OneSignal REST API Key (Settings -> Keys & IDs) - secret | *(empty)* |
| `mailFromName` | Display name on outbound mail | `Rotaract Bangalore East` |
| `allowedOrigins` | Soft browser Origin/Referer allow-list (comma-separated). Set `""` to skip. | production + local Astro |

Fallback values are also maintained in the `CONFIG` constant at the top of [`Code.gs`](./Code.gs) if the sheet tab is ever inaccessible.

No `SPREADSHEET_ID`. No form secret. Spam control is honeypot + timing + rate limit + validation (+ soft origin allow-list).

## Email rules

| Endpoint (`form` field) | Store in Sheet | Emails |
|-------------------------|----------------|--------|
| `join` | Yes | Club notify + applicant confirmation |
| `newsletter` | Yes | None |
| `contact` | Yes (kept for later; contact page has no form) | None |

The JSON field `"form": "join"` only picks which tab/handler to use. It is not related to Google Forms.

Both join emails are sent **multipart** — a branded HTML body plus a plain-text fallback, so they stay readable in clients that block HTML or images.

| | Applicant confirmation | Club notification |
|---|---|---|
| To / CC | applicant, CC club | club |
| Reply-To | `replyToEmail` (+ `clubNotifyEmail` if different) — never the Apps Script owner | applicant (reply goes straight to them) |
| Body | Short, warm, brand header, one CTA | Scannable label/value table of every field + one-tap WhatsApp & Call buttons |

`MailApp` always sends **From** the Google account that owns the script. That is fine and expected — applicants should never need to write to that account. The thank-you sets **Reply-To** to the club inbox(es) from `CONFIG`, and the body names that address explicitly. Prefer deploying the Web App while signed in as the club Gmail (`info@…`) if you want From and Reply-To to match; either way, Reply is steered to the club.

Editing the copy: `applicantConfirmHtml_` / `clubNotifyHtml_` for HTML, `applicantConfirmBody_` / `clubNotifyBody_` for the text fallback — **change both**. `emailShell_` holds the shared frame (logo, brand bar, footer). Email clients strip `<style>` blocks and ignore flex/grid, so the markup is table-based with inline styles only. All applicant-supplied values go through `esc_()` / `nl2br_()`; never interpolate raw form input into the HTML.

The header logo is hot-linked from `rotaractblreast.org`, and Gmail hides images until the reader allows them — so no wording may depend on the logo being visible.

## Setup (once)

1. Create a Google Spreadsheet (e.g. **RBE Website Forms**).
2. From that spreadsheet: **Extensions → Apps Script**.
3. Delete the stub code, paste [`Code.gs`](./Code.gs), tweak `CONFIG` if needed, save. Rename the project if you like (`RBE Forms API`).
4. In the editor, select function `setupSpreadsheet` → **Run** (Authorize when prompted). That creates the `Join`, `Newsletter`, and `Contact` tabs with headers and removes empty `Sheet1`.
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (required so the public site can POST)
6. Copy the Web App `/exec` URL.

Re-deploy (New version) after every `Code.gs` change. Keep editing the script from the spreadsheet’s Extensions menu so it stays bound to that file.

### Wire the Astro site

`PUBLIC_FORMS_API_URL` is pinned in [`netlify.toml`](../../netlify.toml) (same pattern as the Sanity public IDs). Locally, copy it into `.env` from [`.env.example`](../../.env.example), then rebuild.

- **Unset** → join form validates and shows a preview thank-you (nothing POSTed).
- **Set** → form POSTs and shows thank-you only when the body is `{ "ok": true, "status": 200 }`.

Both the join form and the newsletter band (`src/components/Subscribe.astro`, on every page) use this URL and confirm inline — nothing redirects to a thank-you page.

If you tighten `CONFIG.allowedOrigins` in the deployed script, include every origin that will host the form (`https://rotaractblreast.org`, `http://localhost:4321`, and any Netlify preview host you still test from). Requests with **no** Origin/Referer (curl, some tools) skip that check; browsers always send one, so a missing allow-list entry returns `{ ok: false, status: 403 }`. After editing `CONFIG`, create a **new Web App deployment version** or the live `/exec` URL keeps serving the old code.

### Test with curl / node

Apps Script answers POST with a 302 to `script.googleusercontent.com`. Browsers and `fetch(..., { redirect: "follow" })` handle that. Plain `curl -L -X POST` often re-POSTs the redirect and gets HTML junk — prefer node `fetch`, or POST once, then GET the `Location` header.

```bash
API="https://script.google.com/macros/s/AKfycbwchW0c5HpKBvqSuhtownO-xtqGEoo3qtjo73CSmVvQINpNptmy_DMlkb5gq36Zoun1/exec"

# Health
curl -sL "$API"

# Newsletter (store only)
node -e "
fetch('$API', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ form: 'newsletter', email: 'you@example.com', website: '', t: Date.now() - 5000 }),
  redirect: 'follow',
}).then((r) => r.text()).then(console.log)
"

# Join (store + 2 emails) — use a mailbox you control when testing confirmation mail
node -e "
fetch('$API', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    form: 'join', name: 'Test User', email: 'you@example.com', phone: '9876543210',
    dob: '1998-01-15', gender: 'Female', address: 'Indiranagar', social: '@test',
    organizationType: 'student', organization: 'Test College', rotaractStatus: 'new',
    why: 'Test', clubName: '', journey: '', hobbies: 'Running',
    contribute: ['Supporting education'], contributeOther: '', website: '', t: Date.now() - 5000,
  }),
  redirect: 'follow',
}).then((r) => r.text()).then(console.log)
"
```

Use `Content-Type: text/plain` from browsers to avoid a CORS preflight; the script still `JSON.parse`s the body.

## Response contract

Apps Script Web Apps **cannot reliably set HTTP status codes**. Gate UI on the JSON body:

```json
{ "ok": true,  "status": 200, "form": "join" }
{ "ok": false, "status": 400, "error": "Missing fields: why", "form": "join" }
```

| `status` | Meaning |
|----------|---------|
| `200` | Accepted and stored (and emailed, for join) |
| `400` | Validation / expired form / bad payload |
| `403` | Origin not allowed (only if `ALLOWED_ORIGINS` is set) |
| `429` | Too fast or rate-limited |
| `500` | Unexpected server error |

Honeypot hits return a **fake** success (`ok: true`) and write nothing.

## Anti-spam (no secret)

1. **Honeypot** `website` — bots fill it; API fakes success and does not write.
2. **Timing** `t` — reject submits faster than ~2s or older than 2h.
3. **Rate limit** — 5 posts / 10 min per email (or IP).
4. **Optional origin allow-list** — soft browser check only.
5. **Validation** — email shape; Indian mobile for join; branch fields.

Still a public URL (same class of exposure as a Google Form “anyone can submit” link). That is expected for a membership application.

## Request shapes

### `join`

Every key is always sent so Sheet columns stay stable. Inactive branch fields are `""`.

```json
{
  "form": "join",
  "name": "",
  "email": "",
  "phone": "",
  "dob": "YYYY-MM-DD",
  "gender": "",
  "address": "",
  "social": "",
  "organizationType": "student | professional",
  "organization": "",
  "rotaractStatus": "new | experienced",
  "why": "",
  "clubName": "",
  "journey": "",
  "hobbies": "",
  "contribute": [],
  "contributeOther": "",
  "website": "",
  "t": 0
}
```

| Field | Notes |
|-------|-------|
| `gender`, `social` | Optional |
| `address` | Area / locality only |
| `organization` | College or company, depending on `organizationType` |
| `why` | Required when `rotaractStatus` is `new` |
| `clubName`, `journey` | Required when `rotaractStatus` is `experienced` |
| `contribute` | Checkbox labels; flattened to one cell |
| `contributeOther` | Required only when `contribute` contains `"Other"` |

Textarea newlines (`why`, `journey`, `hobbies`) are preserved in Sheet cells.

### `newsletter`

```json
{ "form": "newsletter", "email": "", "website": "", "t": 0 }
```

### `contact` (storage only; no UI on the site)

```json
{ "form": "contact", "name": "", "email": "", "phone": "", "message": "", "website": "", "t": 0 }
```

## Reviewer Dashboard API (`Dashboard.gs` & `/connect`)

In addition to public form submissions, the Apps Script project includes `Dashboard.gs` to power the member applications & subscribers review dashboard at `/connect`.

### 1. Add `Dashboard.gs` to the Google Apps Script project
1. Open the Google Sheet → **Extensions → Apps Script**.
2. Click **+ (Add a file)** next to Files → select **Script**.
3. Name it `Dashboard`.
4. Paste the contents of [`Dashboard.gs`](./Dashboard.gs) and save.
5. In `Code.gs`, verify the 3-line dispatch hook in `doPost(e)` is present:
   ```javascript
   if (body.action) {
     return handleDashboardAction_(body, e);
   }
   ```

### 2. Configure Reviewers
The script automatically ensures a `Reviewers` sheet tab exists.
Columns: `Email | Password | Name | Role | Active`

Example row:
`reviewer@rotaractblreast.org | secretPass123 | Jane Doe | Membership Director | TRUE`

Passwords can be stored as plain text or SHA-256 hashes. Reviewers log in directly at `https://rotaractblreast.org/connect/`.

### 3. Application Review & Status Tracking
- **Status (Column 20 / Col T)**: Options include `Pending`, `Under Review`, `Contacted`, `Accepted`, `Waitlisted`, `Rejected`.
- **Notes (Column 21 / Col U)**: Chronological, timestamped log of remarks attributed to the reviewer (e.g., `[2026-09-11 19:30 - Jane Doe]: Candidate contacted.`).
- **No Outgoing Emails**: Updating a candidate's status or adding reviewer notes is strictly a Sheet update. It will never trigger confirmation, acceptance, or notification emails.

### 4. Deploying the update
After adding `Dashboard.gs` and updating `Code.gs`:
1. Click **Deploy → Manage deployments**.
2. Click the **Edit (pencil icon)** on the active Web App deployment.
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

## PWA & Notifications Architecture

The Reviewer Portal (`/connect/`) operates as a Progressive Web App (PWA) with two notification tiers:

### Tier 1: In-App & Background Polling (No External Accounts Required)
- When reviewers have the portal open or installed on their device (active, minimized, or in background):
  - The client automatically polls the Apps Script API every 60 seconds.
  - When new submissions appear, the scoped Service Worker (`/connect-sw.js`) triggers native OS notification banners (`New Member Application: [Name]`) and plays a dual-frequency audio chime via Web Audio API.
  - Tapping the banner immediately brings the reviewer to the candidate's card.
  - In addition, `Code.gs` instantly sends the full application to `clubNotifyEmail`.

### Tier 2: Cold / Remote Push Notifications (When PWA is Completely Closed)
If reviewers have their phones locked and haven't opened the portal in days, a web browser PWA requires Apple (APNs) or Google (FCM) push servers to wake up the device.

RBE Connect uses **OneSignal Web Push** for native, seamless delivery:
- **Zero extra apps for reviewers:** Reviewers only install the **RBE Connect** PWA.
- When they click "Enable Notifications" inside RBE Connect, the browser registers directly with Apple/Google push servers.
- When a candidate applies, `Code.gs` calls the OneSignal REST API using the credentials from the `Config` sheet tab.
- An alert from **RBE Connect** pops up directly on their lock screen. Tapping it opens the candidate's card.

**Setup in 2 minutes:**
1. Create a free account at [onesignal.com](https://onesignal.com) (free forever up to 10,000 web push subscribers).
2. Create a Web Push app with your site URL (`https://rotaractblreast.org`).
3. In your Google Sheet's **`Config`** tab:
   - Enter `oneSignalAppId` (your App ID).
   - Enter `oneSignalApiKey` (your REST API Key from Settings → Keys & IDs).
4. That's it! No code changes or redeployments needed.

## Limits / gotchas

- Gmail/Apps Script daily email quotas — fine for club join volume; not for mass mail.
- Web App “Anyone” means the URL is public — responses must never include private club data.
- Trust the JSON `{ ok, status }`, not the transport HTTP code.
- Re-running `setupSpreadsheet` rewrites header row 1 but does not move existing data. Archive the Join sheet first if columns changed after you already collected rows.

