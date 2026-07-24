# B9 — Una declaració que informa

Static, local-first companion activity for the ENTI-UB AI literacy Moodle course.
It teaches learners to distinguish four questions that are often collapsed into
one:

1. Is the declaration truthful?
2. Does it describe the process precisely enough?
3. Does it include the fields required by this activity or course?
4. Was the use permitted in the assessment?

The widget never computes the fourth answer. It directs the learner back to the
assessment instructions.

## Learning flow

The core route is designed for 5–7 minutes:

1. **Predict** how many workflows fit a vague statement.
2. **Construct** a truthful declaration for a visible worked case.
3. **Explain** which details reveal the process.
4. **Transfer** the rule to one of three different cases.
5. **Take away** a declaration and reusable review checklist.

Completion requires a confirmed, truthful, four-field declaration that isolates
the target inside the finite teaching set. A unique non-target case, a
contradiction, or a declaration that omits explicit AI use cannot pass.

## Files

- `index.html` — semantic activity structure and templates.
- `styles.css` — responsive visual system and accessibility states.
- `content.js` — versioned cases, clauses, policy convention, and transfer tasks.
- `disclosure-core.js` — pure matching, evaluation, set-difference, and validation
  logic.
- `activity-flow.js` — pure, tested progression gates for the five learning steps.
- `app.js` — guided flow, builder UI, copy action, and optional Moodle bridge.
- `widget.js` — generated classic-script runtime that also works when opened
  directly from disk.
- `integration/moodle-parent-example.js` — validated parent-side wrapper example.
- `tests/` — exhaustive model invariants and static-asset checks.
- `scripts/validate-static.mjs` — clean-clone artifact validation.
- `IMPROVEMENT-ROADMAP.md` — evidence and design rationale behind the rebuild.
- `INSTRUCTOR-GUIDE.md` — placement, debrief, policy adoption, and pilot protocol.
- `VALIDATION.md` — release gates and latest verification record.

There are no runtime or development dependencies beyond Node.js for validation.

## Validate

From this directory:

```powershell
npm.cmd run validate
```

The command verifies that `widget.js` matches the tested modular sources, runs
Node's built-in test runner, exhaustively checks every
declaration combination against every target case, verifies that no learning
step can be skipped, and validates the static artifact. No install step is
required.

After changing a source module, regenerate the deployable runtime:

```powershell
npm.cmd run build
```

For a quick standalone check, open `index.html` directly. The classic runtime
does not depend on `file:` module imports. For Moodle and production testing,
serving over HTTPS remains recommended.

To serve the activity locally:

```powershell
python -m http.server 8000 --directory ..
```

Then open:

```text
http://localhost:8000/B9-declaracio-compatible/
```

The production host must serve `.js` files with a JavaScript MIME type.

## Content model

`content.js` separates:

- **worlds** — structured fictional workflows;
- **groups** — the four disclosure fields;
- **options** — learner-facing statements plus declarative matching predicates;
- **scenarios** — a target world, visible facts, and a validated reference path;
- **activity convention** — fields required for this exercise.

The convention is deliberately labelled as practice rather than institutional
policy. If the course owner supplies a real policy profile, its requirements and
effective date should replace the activity convention only after content review.

When adding a case:

1. Add one unique world profile.
2. Add truthful purpose, extent, and human-contribution options.
3. Add a worked or transfer scenario with a recommended selection for every
   required group.
4. Run `npm run validate`.
5. Complete the manual browser and assistive-technology gates in `VALIDATION.md`.

The content validator rejects duplicate IDs, unknown predicate values, missing
required choices, and reference paths that do not end in a truthful, complete,
unique declaration.

## Moodle delivery contract

### Static resource mode

With an empty `enti-parent-origin` meta value, the page is standalone:

- no progress or completion message is sent;
- no choices or declaration text are persisted;
- Moodle should use manual or view completion if completion is desired.

### Tracked wrapper mode

A trusted deployment wrapper may replace this value at build/deploy time:

```html
<meta name="enti-parent-origin" content="https://moodle.example.edu">
```

When the widget is inside an iframe and the value is non-empty, it sends messages
only to that exact origin:

| Type | Payload added |
|---|---|
| `enti.widget.ready` | current document height |
| `enti.widget.resize` | debounced document height |
| `enti.widget.progress` | current step and total |
| `enti.widget.complete` | `transfer-case-complete` milestone |

Every message also includes:

```text
namespace: enti.ai-literacy.widget
protocolVersion: 1
widgetId: B9-declaracio-compatible
widgetVersion: 2.0.0
```

The bridge never includes selected options, scenario IDs, compatible-world sets,
or declaration text. `enti.widget.complete` is emitted at most once per page load
and only after a confirmed transfer case.

The parent wrapper is responsible for:

- validating `event.origin`, `event.source`, namespace, type, protocol version,
  and payload;
- mapping the completion milestone to a supported Moodle activity API, SCORM,
  or H5P completion mechanism;
- capping and applying reported iframe heights;
- defining refresh, duplicate-tab, and persistence behavior.

The raw `postMessage` event is not itself a Moodle completion API.

`integration/moodle-parent-example.js` provides a tested reference listener. It
checks the exact origin and iframe source, validates every payload, caps resize
values, deduplicates completion, and leaves the actual Moodle API call to the
deployment-owned `onComplete` callback.

## Privacy and security

- No third-party runtime request is made.
- No free text is collected.
- No learner choice or declaration is sent by the optional bridge.
- Copying occurs only after the learner activates the Copy button.
- A restrictive Content Security Policy blocks connections, objects, inline
  scripts, and inline styles.
- The production server should send the same CSP as an HTTP header and add an
  exact `frame-ancestors` allowlist for the Moodle origin; `frame-ancestors`
  cannot be enforced by a CSP meta element.
- Dynamic learner-facing content is created with DOM methods and `textContent`;
  learner values are never passed to `innerHTML`.

## Accessibility contract

The implementation targets WCAG 2.2 AA and uses:

- native radio groups with `fieldset` and `legend`;
- one Tab stop per radio group and native Arrow-key behavior;
- minimum 44 px primary targets;
- visible high-contrast focus and control boundaries;
- concise polite status regions;
- text labels in addition to color;
- responsive reflow down to 320 CSS px;
- reduced-motion and forced-colors adaptations.

Automated checks are necessary but not sufficient. The manual matrix in
`VALIDATION.md` remains mandatory before release.
