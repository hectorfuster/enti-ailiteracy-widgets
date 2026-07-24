# B5 · El corrector

Single-file Catalan Moodle companion activity for practising a precise habit:
distinguish what you can verify from what merely sounds plausible, then extend
your own knowledge with independent evidence.

## Learner flow

1. Rate current familiarity with four domains.
2. Complete an unscored control practice.
3. Judge five matched items from the highest-rated and lowest-rated domains.
4. State confidence, inspect the exact correction, and see an authoritative
   source after each judgment.
5. Resolve two new cases with evidence already available.
6. Choose an appropriate verification action and receive a non-diagnostic
   summary using counts rather than percentages.

Completion never depends on score.

## Build and verification

Node.js 18 or newer is required for maintainers.

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run check:all
npm.cmd run check:sources:online
```

`src/items.ca.json`, `src/content.ca.json`, `src/styles.css`, and `src/app.js`
are the maintained sources. `npm run build` embeds them into `index.html` and
computes CSP hashes over the exact inline blocks. `npm run build:check` fails if
the committed artifact is stale.

The deployable Moodle artifact is only `index.html`; it has no runtime
dependencies and makes no third-party requests. The release budget is 110 KiB
raw and 30 KiB at gzip level 9; `npm run check:size` enforces both limits.

## Item maintenance

Every core item must have exactly three claims, an explicit error position or a
clean marker, provenance, an authoritative HTTPS source, a check date, and
review status. Each five-item domain bank must preserve:

- three erroneous and two clean items;
- one error in each claim position;
- the same difficulty pattern as all other domains.

Run `npm run validate:items` after any content change. Source and language
status must reflect reality: do not change a pending sign-off to approved until
the named human review is recorded.

`npm run sources:list` regenerates `SOURCE-CHECKLIST.md` directly from the bank.
The normal check verifies that this reviewer-facing checklist is current.
`npm run check:sources:online` additionally probes every unique authoritative
URL; CI runs both the offline metadata check and this online liveness check.

The repository workflow at `.github/workflows/b5-domain-check.yml` installs the
pinned toolchain, reproduces the artifact, runs all unit, accessibility, and
browser tests, checks both size budgets, and verifies source liveness.

## Moodle integration contract

`integration/moodle-wrapper.js` is a reference parent-side bridge. Host it with
the Moodle wrapper, set the iframe's exact widget URL, and translate the
`onComplete` callback into the completion mechanism supported by the course:

```html
<iframe id="b5-widget" title="Activitat B5"></iframe>
<script src="moodle-wrapper.js"></script>
<script>
  const iframe = document.querySelector("#b5-widget");
  const widgetUrl = new URL("https://widgets.example.edu/B5/index.html");
  widgetUrl.searchParams.set("parentOrigin", window.location.origin);
  iframe.src = widgetUrl;

  const detach = ENTIWidgetBridge.attach(iframe, {
    onComplete(payload) {
      // Translate this validated, exact-once callback through Moodle's
      // supported completion integration. postMessage alone is not completion.
    },
  });
</script>
```

The bridge rejects unexpected origins, windows, widget IDs, schemas, message
types, and unsafe heights. It applies valid resize messages, acknowledges the
first valid completion, and suppresses duplicate completion callbacks.

On completion the document dispatches:

```js
document.addEventListener("enti-widget-complete", (event) => {
  console.log(event.detail);
});
```

When embedded in an iframe, add the exact parent origin:

```text
index.html?parentOrigin=https%3A%2F%2Fcampus.example.edu
```

The widget then sends two versioned messages only to that origin:

- `enti-widget-complete` once, with milestone booleans and item counts but no
  answers, confidence values, ratings, or scores;
- `enti-widget-resize` when its document height changes.

The parent may acknowledge completion with:

```js
iframe.contentWindow.postMessage(
  { type: "enti-widget-complete-ack", widget: "B5-domain-check" },
  "https://widget.example.edu",
);
```

The widget also derives an exact parent origin from a valid HTTP(S) referrer
when the query parameter is absent. It never sends to `*`.

## Privacy and state

Responses remain in `sessionStorage` under `enti-b5-domain-check-v2` so a
reload in the same tab can resume. Restarting removes that entry. No
`localStorage`, analytics, cookies, web fonts, or response-bearing network
messages are used.

## Human release gates

Automated checks complement but do not replace:

- subject-matter and Catalan language sign-off;
- keyboard plus NVDA and VoiceOver checks;
- 200% zoom and supported-device review;
- a representative 20-person item pilot;
- completion verification in the actual Moodle theme with a student account.

Record those outcomes in `VALIDATION.md`.
Use `RELEASE-CHECKLIST.md` for the exact reviewer, assistive-technology,
Moodle, and aggregate learner-pilot evidence required before production
sign-off.
