# CHIATECHblogBOT authenticated blog-draft handoff

This is the receiving-side contract for a direct server-to-server handoff from CHIATECHblogBOT into the CHIATECH JOURNAL administration backend. It creates **private Blog / news drafts only**. It cannot publish a story, change a published story, create an editor account, or access private editorial records.

The CHIATECHblogBOT application is not contained in this repository. Its owner must implement this exact signed request and retain the shared secret in that bot service's private secret store.

## One-time setup

1. Generate a high-entropy secret, for example 64 random bytes encoded as hexadecimal.
2. Save it as `BLOG_BOT_HANDOFF_SECRET` in **Apps Script Project Settings → Script properties**.
3. Save the same value only in CHIATECHblogBOT's server-side secret manager.
4. Never place the secret in bot browser code, the journal repository, Netlify variables exposed to the browser, emails, screenshots, logs, or support tickets.
5. Deploy the updated existing Apps Script web-app version, then the Netlify site, before activating the bot integration.

PowerShell generation example; run it locally and copy only the result into the two approved secret stores:

```powershell
$bytes = [byte[]]::new(64)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToHexString($bytes).ToLowerInvariant()
```

## Request endpoint and signature

CHIATECHblogBOT sends a server-side `POST` request to the journal's existing same-origin endpoint:

```text
https://journal.chiatechsolutions.com/api/editorial
```

The JSON request contains these fields:

```json
{
  "action": "importBlogBotDraft",
  "timestamp": "milliseconds since Unix epoch",
  "nonce": "a new URL-safe random value, 20-160 characters",
  "draftPayload": "the exact minified JSON string described below",
  "signature": "base64url HMAC-SHA-256"
}
```

Calculate `signature` over this exact UTF-8 string, without changing whitespace or key order in `draftPayload`:

```text
timestamp + "." + nonce + "." + draftPayload
```

Use `BLOG_BOT_HANDOFF_SECRET` as the HMAC key. The journal rejects signatures that do not match, timestamps more than five minutes old or ahead, malformed nonces, duplicate nonces, incomplete payloads, and payloads over the allowed size. A nonce is accepted once only.

## `draftPayload` contract

`draftPayload` must itself be a JSON object encoded as one exact string. Required fields are:

```json
{
  "id": "optional-stable-lowercase-post-id",
  "contentType": "Institutional announcement",
  "title": "Approved title",
  "domain": "Journal-wide / General",
  "authorName": "Approved byline",
  "summary": "Approved reader summary",
  "body": "Approved reader text using the journal plain-text formatting rules",
  "tags": ["optional", "tags"],
  "approvedBy": "Name or controlled approval identity",
  "approvedAt": "2026-08-31T12:00:00.000Z"
}
```

Optional supported fields are `heroImageUrl`, `heroImageAlt`, `mediaType`, `mediaUrl`, and `rightsNotice`. The normal journal URL and rights validation still applies. `status`, `published`, `publishedBy`, publication dates, and any unsupported field are ignored. The backend always writes status as `DRAFT`.

Use `Journal-wide / General` for editorials, institutional notices and announcements that do not belong to one SETEHEM discipline. Existing Science, Technology, Engineering, Mathematics, Education, Humanities & Social Sciences, and Entrepreneurship & Management options remain available for blog content.

## Human approval and publication boundary

CHIATECHblogBOT must show its own approval screen and include the actual approver and approval timestamp only after an authorised human selects **Send to Blog Drafts**. The journal validates the bot signature and stores the stated approval record in its private audit log; it cannot independently prove a human's decision made in a separate bot service.

The draft then appears under **Journal administration → Blog / news → Draft**. An authorised Administrator must still review the title, byline, factual claims, rights, media, accessibility, links and final public wording before choosing the existing **Publish / update item** action. A successful bot handoff is not public release, journal acceptance, or evidence of editorial sign-off.

## Operational verification

Use a clearly labelled test payload first. Confirm that it appears as a private `DRAFT`, cannot be viewed through the public blog reader, has an `IMPORT_BLOG_BOT_DRAFT` audit row, rejects a replay of the same nonce, and rejects an invalid signature. Remove or archive the test draft through the Administrator desk before production use.
