# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 2 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Read `project/Pepper Scheduling.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `Scheduling Site` project files (HTML prototypes, assets, components)

## Security note: researcher inbox access

`researcher.html` is gated behind a password (see `RESEARCHER_KEY` near the
top of its `<script>`, in the "Sheets API" section) so the inbox UI — and the
participant PII it fetches (name, DOB, phone, bank account) — isn't rendered
or requested until the password is entered. Unlock state lives in
`sessionStorage`, so it clears when the browser tab/window closes.

**This alone does not secure the data.** `researcher.html`, `index.html`, and
`mobile.html` all embed the same Google Apps Script URL (`SCRIPT_URL`) in
plain page source, and `index.html`/`mobile.html` are the participant-facing
pages everyone gets — so that endpoint is already effectively public. A
client-side password can't stop someone from POSTing directly to
`SCRIPT_URL` with `curl`, bypassing `researcher.html` entirely. Client-side
checks are a UI convenience, not an access-control boundary — see OWASP's
guidance on server-side enforcement of access control
([OWASP Top 10 2021 – A01 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/),
which explicitly calls out relying on client-side controls as a common
failure mode).

The real gate has to live in the Apps Script backend (`doPost`, in the
separate Google Apps Script project — not part of this repo): reject the
researcher-only actions (`update`, `delete`, `restore`, `setConfig`) unless
the request body's `researcherKey` matches the same value as
`RESEARCHER_KEY` in `researcher.html`. The participant-only action
(`submit`, used by `index.html`/`mobile.html`) must stay unauthenticated so
booking still works. Example check to add at the top of `doPost`:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const RESEARCHER_KEY = 'lab409'; // keep in sync with researcher.html

  const RESEARCHER_ONLY_ACTIONS = ['update', 'delete', 'restore', 'setConfig'];
  if (RESEARCHER_ONLY_ACTIONS.includes(data.action) && data.researcherKey !== RESEARCHER_KEY) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ...existing doPost logic, unchanged...
}
```

Until that check is added to the Apps Script and redeployed, this password
only hides the UI — it does not stop a direct request to the endpoint.
Because `RESEARCHER_KEY` is committed to source, treat it as not-secret: if
this repository is or becomes public, anyone can read it from the file (and
from git history, even after it's changed) — rotate it in both files if that
happens.
