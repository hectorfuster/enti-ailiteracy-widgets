# Privacy and data-flow statement

Applies to B6 version 3.0.0.

## Production runtime

The standalone widget makes no external network request. It loads only six same-origin production assets:

- `index.html`
- `styles.css`
- `scenario-data.js`
- `inference-engine.js`
- `state-machine.js`
- `app.js`

There are no web fonts, analytics, cookies, trackers, service workers, API calls, or live AI requests.

The sources shown after completion are ordinary links. They are not requested until the learner explicitly follows one.

## Learner input

The activity contains no free-form text input and does not ask the learner to paste any real data.

The learner can select only pre-authored identifiers:

- one of five handling choices for each fictional conversation;
- one repair-option ID for each repair case;
- incident-response option IDs;
- one transfer-answer ID.

## Browser storage

The following state is stored in `sessionStorage` under `enti-b6-auditoria-v3`:

- schema version;
- current phase and scenario position;
- scenario IDs mapped to choice IDs;
- a submitted snapshot of those IDs while the dossier is active;
- repair case IDs mapped to option IDs;
- incident and transfer option IDs;
- completion booleans.

No fictional prompt text, personal name, credential value, learner-authored content, Moodle user identifier, grade, or analytics identifier is stored.

`sessionStorage` is scoped to the current origin and tab session. Closing the tab ends that session according to normal browser behavior. “Comença de nou” removes the record immediately.

## Moodle parent messages

Messages are disabled unless the embed URL supplies a valid HTTP(S) `parentOrigin`.

When enabled, the widget sends only:

- readiness and privacy mode;
- current phase;
- completed step count;
- number of scenarios or repairs answered;
- completion boolean;
- rendered height;
- whether a completion event came from restored session state.

It does not send:

- scenario or feedback text;
- individual scenario decisions;
- repair selections;
- incident selections;
- the transfer selection;
- names, credentials, or other fictional payload data;
- any learner-authored text.

The child sends to the exact configured origin, never `*`. The reference parent wrapper validates origin, source window, widget ID, message type, and resize bounds.

The reference wrapper does not write to Moodle. A production Moodle integration may store a completion record; that separate behavior must be disclosed by the course and governed by Moodle permissions and retention.

## Threat-model boundary

The fictional public AI service in the lesson is not used by the widget. Its behavior is pedagogical context only.

The lesson intentionally does not claim that every service:

- makes prompts public;
- uses prompts for training;
- permits human review;
- retains prompts for the same period;
- treats deletion identically.

Those properties depend on the exact service, account, contract, settings, jurisdiction, and current policy.

## Verification

The browser suite rejects unexpected third-party requests and checks that stored and emitted payloads omit prompt text and fictional sensitive values. See [VALIDATION.md](VALIDATION.md).
