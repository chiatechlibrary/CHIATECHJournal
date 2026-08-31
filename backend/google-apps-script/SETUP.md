# CHIATECH JOURNAL Google Apps Script deployment and recovery

Use the existing journal-controlled project and deployment. Their current live state was not verified by the local audit. This manual describes the incremental update and the checks the operator must perform.

## Incremental update for the current release

The audited backend preserves private section-editor administration, public Managing Editor and fee/payment settings, and Review Engine evidence briefs. It adds stricter publication confirmations, invitation expiry checks, safe error handling, database-connectivity checks and server-side workday sessions. Update the existing Apps Script deployment:

1. Open the journal-controlled **CHIATECH JOURNAL Editorial Service** project.
2. Make a restricted backup of the private Google Sheet.
3. Copy the complete contents of repository file `backend/google-apps-script/Code.gs`.
4. Replace the Apps Script editor's `Code.gs` contents with that complete source.
5. Open **Project Settings**, enable **Show `appsscript.json` manifest file in editor**, then replace that manifest with the repository's complete `appsscript.json` content. Do not create `appsscript.json` with the **+** button: Apps Script turns ordinary files into `.gs` source files.
6. Save the project.
7. Select **Deploy → Manage deployments**.
8. Open the existing web-app deployment for editing.
9. Select **New version**, add a release description, and deploy.
10. Keep **Execute as** the journal-controlled deploying account and the authorised public web-app access setting required by the Netlify relay.
11. Do not create a new deployment unless a documented migration requires a new URL.
12. Confirm the existing URL still ends in `/exec`; do not copy it into any repository file.

Netlify's private `CHIATECH_APPS_SCRIPT_URL` should remain unchanged when the existing deployment is updated. If the URL changes for an authorised migration, update the private Netlify environment variable and redeploy Netlify; never add the value to Git, HTML, `runtime-config.js`, logs, screenshots or this manual.

### Recovery: `Unexpected token ':'` in `appsscript.json.gs`

This error means the manifest JSON was pasted into a JavaScript source file. In the Apps Script file list, delete only the mistakenly created `appsscript.json.gs` file; do not delete `Code.gs`. Then:

1. Open **Project Settings** using the gear icon.
2. Select **Show `appsscript.json` manifest file in editor**.
3. Return to **Editor** and open the automatically exposed file named exactly `appsscript.json`.
4. Replace its entire contents with `backend/google-apps-script/appsscript.json`. The file must start with `{`, end with `}`, and contain no `myFunction()` or other JavaScript.
5. Save all files. The syntax error should disappear.

The repository manifest is valid JSON. JSON keys and string values use ordinary underscores such as `USER_DEPLOYING` and `ANYONE_ANONYMOUS`; do not insert backslashes before underscores.

## Private database and schema

The Google Sheet must remain restricted. The service uses these tabs:

| Tab | Records |
|---|---|
| Users | Administrator/editor roles, profile and public-contact fields, password hashes and access state |
| Reviews | Review Engine route, evidence summary and author/editor action lists |
| Articles | Draft/published/archived paper metadata and approved public URLs |
| BlogPosts | Draft/published/archived blog/news/video records |
| ContentPages | Draft and published snapshots of authorised editable pages |
| Settings | Approved public identity, contact, fee, payment and status information |
| Audit | Security and content-management events |
| Sessions | Hashed session references, bounded expiry/renewal timestamps and revocation status; never raw browser tokens |

The revised code safely adds a missing `public_email` Users column, the `Sessions` tab and new Setting keys through controlled service operations. Do not pre-create, rename, reorder or delete service columns. Do not manually edit password hashes, salts, session rows, IDs, roles, states or status values.

## Script Properties

The existing project must retain:

| Property | Rule |
|---|---|
| `DATABASE_SHEET_ID` | Exact ID of the private Sheet |
| `ADMIN_EMAIL` | Lowercase authorised initial/current administrator email |
| `ADMIN_NAME` | Verified private administrator name |
| `ADMIN_AFFILIATION` | Verified publisher/journal affiliation |
| `PUBLIC_BASE_URL` | `https://journal.chiatechsolutions.com` |
| `PASSWORD_PEPPER` | Generated and retained by the service; never copy or rotate casually |
| `BLOG_BOT_HANDOFF_SECRET` | Required only when enabling CHIATECHblogBOT server-to-server draft handoff; a unique high-entropy value shared only with that bot's private secret store |

`ADMIN_BOOTSTRAP_PASSWORD` is used only for initial bootstrap. Password recovery uses the separate `ADMIN_PASSWORD_RESET` property. It must contain at least 12 characters, be unique, remain in Script Properties only, and be automatically deleted after successful use.

Do not save secrets in the Sheet, repository, Netlify public variables, HTML, browser JavaScript, manuals, email or screenshots.

## Workday sessions and trusted-device choice

The service now stores only a SHA-256 token hash in the restricted `Sessions` tab. It never stores a raw browser token in the Sheet.

- Every Administrator and section editor starts with an 8-hour maximum workday session and a 60-minute inactivity deadline.
- A request, dashboard refresh or browser-detected editorial activity renews the inactivity deadline while the user is active. It never extends the session beyond its original workday deadline.
- Only a successfully authenticated `ADMIN` account may choose **Keep me signed in on this trusted device**. That choice stores the session reference in that browser and sets a 12-hour maximum. It is intended only for the Chief Editor's personal, controlled device.
- The same checkbox is ignored for section-editor accounts; they remain nonpersistent and capped at eight hours.
- The desk displays a five-minute expiry warning and prompts before browser close or voluntary sign-out when form work has not been saved.
- Sign-out immediately revokes the current server-side session. Password reset, account suspension, archive and credential changes also invalidate active sessions.

Never choose the trusted-device option on a shared, public, borrowed or unencrypted device. Do not change session rows manually; use **Sign out**, account status controls, and the documented password-reset process.

## Optional CHIATECHblogBOT handoff

The backend can accept a signed, human-approved CHIATECHblogBOT request and create only a **private Blog / news draft**. It is disabled until `BLOG_BOT_HANDOFF_SECRET` exists in Script Properties. The receiving service accepts only a timestamped, one-time HMAC-SHA-256 handoff and forces `DRAFT` status even if a payload requests publication.

Follow [BLOGBOT-HANDOFF.md](BLOGBOT-HANDOFF.md) for the required bot-side request format, secret generation, replay protection, human-approval record and test procedure. Keep in mind that this repository contains the journal receiver, not the CHIATECHblogBOT application. A live connection still requires the bot owner to configure its server with the documented secret and request contract.

## First health and profile checks

After deploying the new Apps Script version and the current Netlify site:

1. Open `https://journal.chiatechsolutions.com/api/editorial?action=health` and confirm JSON with `ok: true`.
2. Open `https://journal.chiatechsolutions.com/api/editorial?action=profile` and confirm public-only values; no password, token, Sheet ID or staff-private field may appear.
3. Sign in through `https://journal.chiatechsolutions.com/admin`.
4. Open **Journal information** and confirm Managing Editor, fee and payment defaults.
5. Sign in without the trusted-device choice and confirm the desk reports a standard workday session.
6. On the Chief Editor's controlled device only, sign out, select the trusted-device choice, sign in again and confirm the desk reports a trusted-device workday session. Sign out, refresh the page and confirm a new sign-in is required.
7. Edit a private draft field, confirm the five-minute warning path and browser-close/sign-out unsaved-work prompts during the controlled test, then discard the test edit or save it only as a private draft.
8. Save approved settings, sign out, sign in again and confirm persistence.
9. Verify the public fee and founding-editor pages update; section-editor records remain private.
10. Inspect Apps Script Executions and Netlify Function logs for errors without copying confidential request content.

## Editor profile workflow

1. Verify written appointment acceptance, identity, expertise, affiliation, conflict declaration, role and portrait/profile permission.
2. Invite the editor from `/admin`; the one-use activation link expires in seven days.
3. The editor chooses a private password of at least 12 characters.
4. The administrator edits the profile, including a separate public contact email and ORCID iD.
5. Keep the profile private. Public-contact fields are retained for internal administration and do not grant consent for publication.
6. Verify the profile inside the administrator desk. The current release forces section-editor profiles to PRIVATE; no public profile publication is available.
7. Suspend or archive access promptly when an appointment changes; verify that existing sessions immediately lose access.

Manually supplied ORCID iDs are checksum-validated by the service but are not equivalent to ORCID OAuth authentication. Open the public record and confirm the person and displayed information before publication.

## Paper embargo and publishing

Do not upload paper files into the repository for the current portal launch. Use a draft record only for workflow testing and ensure it is absent publicly. After launch and after real paper editing is complete, the administrator may record approved HTML/PDF/media URLs and publish only after all server-side gates and human checks pass.

The backend blocks publication without required metadata, registered DOI, dates, HTML/PDF confirmation and accessible explanatory-video information. Passing the automated gate is not sufficient evidence of scholarly or production approval.

## Administrator recovery

If an authorised administrator password reset is required:

1. Confirm the request and identity through an independent controlled channel.
2. Set a new unique `ADMIN_PASSWORD_RESET` in Script Properties.
3. Run the documented `resetAdminPasswordFromScriptProperties` function from the Apps Script editor under the journal-controlled account.
4. Confirm the property is deleted after the reset.
5. Sign in through `/admin`, review Audit and rotate any credential suspected of exposure.

Do not edit the Users password columns manually and do not change `PASSWORD_PEPPER`; changing it invalidates stored passwords.

## Troubleshooting order

1. Check the public same-origin health endpoint.
2. Check Netlify Function logs for relay/network errors.
3. Check Apps Script Executions for code, permission, quota or Sheet errors.
4. Confirm the current deployment version and `/exec` URL.
5. Confirm the Netlify environment variable without printing it.
6. Confirm Script Properties exist without copying their values.
7. Confirm Sheet tabs/headers are intact and access remains restricted.
8. Restore from a restricted backup only after documenting the exact failure and affected version.

## Release evidence

Record the Apps Script version, deployment time, Netlify deploy ID, health result, administrator smoke test, invitation mail test, settings persistence, backup location and rollback point in the controlled release record. Complete `LAUNCH-CHECKLIST.md` before public announcement.

## August 2026 audit changes

Replace Code.gs and deploy a new version to activate the audited changes: strict production-confirmation booleans; invalid invitation-expiry rejection; safe provider-error handling; bounded requests; preserved date-only Sheet fields; rejection of blank/duplicate headers; a health check that actually reads the configured database; and the 8/12-hour server-side workday-session model. The existing password hash format and PASSWORD_PEPPER are deliberately retained to avoid locking out current accounts. A future password-KDF migration needs separate design and compatibility testing.

Netlify base is the repository root, build command is `node netlify/build-public.mjs`, publish directory is `dist`, and Functions directory is `netlify/functions`. The private upstream variable must be available to Functions. Do not expose the production backend to untrusted previews. Public API, dynamic paper pages and indexes now use no-store; a service-worker version change clears old public caches on activation.

Invitation URLs contain one-use secrets and are sent only to the intended editor. Do not copy them into release evidence. All section-editor accounts remain private. Health is a database-connectivity check, not proof of mail delivery, permissions, correct records or human approval.
