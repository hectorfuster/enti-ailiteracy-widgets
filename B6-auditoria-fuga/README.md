# B6 · L'auditoria de la fuga

Local-first Moodle companion activity about direct disclosure, metadata, cumulative inference, data minimization, and incident response when using generative-AI services.

## Learning job

The activity helps a learner move from “does this prompt look suspicious?” to a reusable decision process:

1. identify the recipient and policy context;
2. classify personal, confidential, third-party, intellectual-property, metadata, and credential risks;
3. see how independent clues form confidence-qualified inferences;
4. preserve utility through redaction, synthetic data, or an approved tool;
5. respond constructively if information has already been sent.

The durable takeaway is **ATURA**:

- **A — Autorització**
- **T — Tipus de dades**
- **U — Ús del proveïdor**
- **R — Redueix i redacta**
- **A — Actua si ja ho has enviat**

## Product flow

The guided path has five completion steps:

1. **Orientació** — read the fictional threat model and ATURA.
2. **Classificació** — decide how to handle nine complete, pre-authored conversations.
3. **Reconstrucció** — compare the original history with the learner's route across four genuine multi-clue inferences and one direct credential exposure.
4. **Redacció segura** — repair three prompts without abandoning their useful task.
5. **Resposta i transferència** — choose incident actions and apply ATURA to a new playtest-data case.

Completion is formative and ungraded. It requires interaction in every stage.

## Architecture

The production runtime is framework-free:

```text
index.html             semantic page and static fallback
styles.css             responsive, print, reduced-motion, and forced-color styles
scenario-data.js       versioned teaching content
inference-engine.js    pure validation and exposure/inference evaluation
state-machine.js       pure state transitions and restored-state validation
app.js                 DOM rendering, focus, session state, and Moodle messages
integration/
  moodle-wrapper.js    parent-side origin-validated iframe bridge
```

The activity renders source-authored text with DOM methods rather than raw HTML interpolation.

## Privacy and network behavior

- No API, analytics, font service, CDN, or other third-party runtime request is used.
- No learner-authored text field exists.
- Encoded choices and progress are stored in `sessionStorage` only for the current tab session.
- Parent-frame messages contain aggregate progress, completion, readiness, and height only.
- Scenario text, individual decisions, personal data from the fiction, and repair selections are not sent to the parent.
- Closing the tab ends the browser session state. Moodle may separately store completion when its wrapper is configured to do so.

See [PRIVACY.md](PRIVACY.md) for the precise data-flow inventory.

## Local use

Opening `index.html` directly works in a normal browser, but a local server is recommended for the production-like content-security policy:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8000/B6-auditoria-fuga/
```

## Development

Requirements:

- Node.js 18 or later
- npm
- Playwright Chromium for browser tests

Install and verify:

```powershell
npm install
npm run check
npx playwright install chromium
npm run test:browser
```

`npm run check:all` runs formatting, static integrity, size, unit, browser, accessibility, responsive, no-JavaScript, privacy, and iframe tests.

## Moodle iframe contract

The widget accepts one optional query parameter:

```text
parentOrigin=https%3A%2F%2Fmoodle.example.edu
```

It must be the exact origin of the parent page. When present, the widget emits:

```text
{
  source: "enti-ai-literacy-widget",
  widget: "b6-auditoria-fuga",
  version: "3.0.0",
  type: "enti-widget-ready" |
        "enti-widget-progress" |
        "enti-widget-resize" |
        "enti-widget-complete" |
        "enti-widget-reset",
  outcome: { ...aggregate fields only }
}
```

The parent must verify all of:

- `event.origin` equals the configured widget origin;
- `event.source` equals the iframe's `contentWindow`;
- `source`, `widget`, and `type` are expected values;
- resize height is numeric and within a safe bound;
- completion is handled idempotently.

`integration/moodle-wrapper.js` provides a small reference bridge. It is not a complete Moodle plugin and does not itself write Moodle completion records. A course wrapper must connect the validated `enti-widget-complete` event to the institution's chosen activity-completion mechanism.

The child accepts an `enti-widget-reset` message only from the configured parent origin and its actual parent window.

## H5P note

The activity is custom HTML rather than an H5P content type. If it is later packaged as H5P, validate attempt completion and Moodle activity completion separately; Moodle documents them as distinct concepts.

## Content maintenance

Run the unit suite after any scenario change. Validation rejects:

- duplicate scenario, clue, or repair IDs;
- missing choice feedback;
- references to missing clues or scenarios;
- risky cases without a safe alternative and post-send response;
- repair/transfer questions without exactly one correct answer;
- fewer than three genuine multi-clue inferences.

Provider-specific claims should not be added without a date, source, owner, and update path. See [CONTENT-GOVERNANCE.md](CONTENT-GOVERNANCE.md).

## Deliberate boundaries

- No live AI call.
- No real learner prompts.
- No vendor ranking or price-based safety claim.
- No legal advice.
- No summative score.
- No heavy UI framework or backend.
- No claim that every prompt becomes public, enters training, or can never be meaningfully deleted.

## Release

Current activity version: **3.0.0**  
Scenario/storage schema: **3**

See [VALIDATION.md](VALIDATION.md) for recorded checks and [PILOT-PROTOCOL.md](PILOT-PROTOCOL.md) for the pre-production learner validation.
