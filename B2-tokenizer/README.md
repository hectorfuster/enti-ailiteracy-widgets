# B2 — Com es tokenitzen les llengües

Local-first interactive activity for Module 1, Chapter 2 of the ENTI-UB AI Literacy course.

## Learning flow

1. Predict which equivalent translation will contain the most tokens.
2. Reveal real `o200k_base` counts.
3. Inspect Unicode-safe token groups, identifiers, and UTF-8 bytes.
4. Compare seven realistic AI requests in prepared parallel translations, including summarization, writing, programming, ideation, rewriting, planning, and decision support.
5. Answer the final reflection.
6. Unlock and optionally explore arbitrary text in the private free lab.
7. Optionally compare `o200k_base` with lazily loaded `cl100k_base`, test a learner-defined context limit, and estimate a generic API cost with learner-supplied input/output prices.

The activity never sends or stores free-form learner text. Guided progress is stored locally under `enti-b2-tokenizer-v2`.

The guided aggregate reports the mean, median, and range for each language. Its “global average” is explicitly limited to the seven prepared requests in this activity; it is not presented as a population-level language statistic.

The API estimator deliberately ships without provider prices. Learners enter the current price per million input and output tokens, an expected output size, request volume, and currency. The estimate covers the current plain-text input plus the assumed output and clearly excludes provider-specific cache, batch, tool, image, audio, tax, and billing rules.

## Run locally

Serve the repository over HTTP; workers are not reliably available from `file://` URLs.

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8765/B2-tokenizer/
```

## Verify

```powershell
cd B2-tokenizer
npm.cmd install --ignore-scripts
npm.cmd run check
```

The unit suite covers the original count fixtures, special-token literals, NFC/NFD text, whitespace, complex emoji, RTL, CJK, HTML-like input, UTF-8 byte reconstruction, visualization truncation, 10,000-character p95 performance, and a 100,000-character stress case.

Install the independent Python reference implementation once:

```powershell
python -m pip install --target .crosscheck -r requirements-crosscheck.txt
```

Then run the dual-encoding `tiktoken` cross-check plus the real-browser, iframe, responsive, performance, fallback, privacy, and automated accessibility suite:

```powershell
npx.cmd playwright install chromium
npm.cmd run check:all
```

An interactive iframe test page is also available at `tests/iframe-harness.html`.

See [VALIDATION.md](VALIDATION.md) for the recorded automated/manual evidence and the external course-owner, assistive-technology, learner, and Moodle acceptance checks.

## Share a reviewed scenario

Every guided example has a “Copia l’enllaç d’aquest exemple” control. A deep link contains only the reviewed scenario ID:

```text
index.html?scenario=pla-estudi
```

The query parameter overrides the locally remembered current scenario when it is valid. Unknown IDs are ignored. The copied URL removes all other query parameters and fragments, including `parentOrigin`, and never contains learner text, predictions, completion state, or free-lab settings.

## Moodle integration

The widget dispatches a same-name DOM `CustomEvent` and, when embedded with a validated parent origin, a `postMessage` for:

- `enti-widget-progress`
- `enti-widget-complete`
- `enti-widget-resize`

Pass the exact Moodle wrapper origin:

```text
index.html?parentOrigin=https%3A%2F%2Fmoodle.example.edu
```

Example completion payload:

```json
{
  "type": "enti-widget-complete",
  "widget": "b2-tokenizer",
  "version": "2.2.0",
  "outcome": {
    "completed": true,
    "restored": false,
    "scenariosExplored": 3,
    "predictions": 3,
    "correctPredictions": 1,
    "reflectionCorrect": true
  }
}
```

The payload never includes learner-entered text. The Moodle-side wrapper is responsible for validating `event.origin` and translating completion into the platform’s completion API.

`integration/moodle-wrapper.js` provides the strict origin/source/schema validation and typed callbacks:

```html
<script src="integration/moodle-wrapper.js"></script>
<script>
  const iframe = document.querySelector("#b2-tokenizer");
  const bridge = ENTITokenizerMoodleBridge.create({
    iframe,
    widgetOrigin: "https://widgets.example.edu",
    onComplete(outcome) {
      // Translate the validated outcome into the Moodle API used by the course.
    },
    onResize(height) {
      iframe.style.height = `${height}px`;
    },
  });
</script>
```

The bridge accepts messages only from that iframe’s `contentWindow`, the exact configured origin, widget ID `b2-tokenizer`, and supported payload version. The course still owns the final call into its Moodle completion API.

The resize payload uses:

```json
{
  "type": "enti-widget-resize",
  "widget": "b2-tokenizer",
  "version": "2.2.0",
  "outcome": {
    "height": 2400
  }
}
```

## Dependency provenance

See [VENDOR.md](VENDOR.md) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Both committed encoding bundles are reproducible from the exact package and build-tool versions in `package-lock.json`.

For production, serve the versioned release directory with Brotli or gzip and immutable caching for both encoding bundles. `cl100k_base.js` is loaded only when a learner activates the advanced comparison. Keep `index.html` on a short cache lifetime so it can point at a new release safely.
