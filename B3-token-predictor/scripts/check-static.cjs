const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Engine = require("../engine.js");
const Dataset = require("../scenario-data.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const styles = read("styles.css");
const app = read("app.js");
const data = read("scenario-data.js");
const runtime = `${index}\n${styles}\n${app}\n${data}\n${read("engine.js")}`;
const htmlIds = Array.from(
  index.matchAll(/\sid="([^"]+)"/g),
  (match) => match[1],
);
const idSet = new Set(htmlIds);
const appElementIds = Array.from(
  app.matchAll(/document\.getElementById\("([^"]+)"\)/g),
  (match) => match[1],
);

assert.deepEqual(
  Engine.validateDataset(Dataset),
  [],
  "The scenario dataset must pass runtime validation.",
);

assert.match(index, /<html lang="ca">/);
assert.match(index, /name="viewport"/);
assert.match(index, /<label for="temperatureSlider">Temperatura<\/label>/);
assert.match(index, /role="status"[\s\S]{0,80}aria-live="polite"/);
assert.match(index, /<noscript>/);
assert.match(index, /http-equiv="Content-Security-Policy"/);
assert.match(index, /connect-src 'none'/);
assert.match(index, /object-src 'none'/);
assert.match(index, /scenario-data\.js/);
assert.match(index, /engine\.js/);
assert.match(index, /app\.js/);
assert.match(styles, /prefers-reduced-motion:\s*reduce/);
assert.match(styles, /:focus-visible/);
assert.match(styles, /\.prompt::after[\s\S]*prompt-caret-blink/);
assert.match(styles, /@keyframes prompt-caret-blink/);
assert.doesNotMatch(styles, /@import/i);
assert.doesNotMatch(
  runtime,
  /https?:\/\/(?:fonts\.googleapis|fonts\.gstatic|www\.googletagmanager|www\.google-analytics)/i,
);
assert.doesNotMatch(
  runtime,
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
);
assert.doesNotMatch(runtime, /\uFFFD/);
assert.doesNotMatch(app, /\.innerHTML\s*=/);
assert.doesNotMatch(app, /postMessage\([^,]+,\s*["']\*["']\)/);
assert.doesNotMatch(app, /promptHistory/);
assert.doesNotMatch(data, /va explicar|the corner/);
assert.match(data, /mode:\s*"didactic-simulation"/);
assert.match(data, /implementationVersion:\s*"3\.4\.0"/);
assert.equal(idSet.size, htmlIds.length, "HTML IDs must be unique.");
appElementIds.forEach((id) => {
  assert.ok(idSet.has(id), `app.js references missing HTML ID: ${id}`);
});
Array.from(
  index.matchAll(/<label[^>]+for="([^"]+)"/g),
  (match) => match[1],
).forEach((id) =>
  assert.ok(idSet.has(id), `Label references missing HTML ID: ${id}`),
);
Array.from(
  index.matchAll(/\saria-(?:labelledby|describedby)="([^"]+)"/g),
  (match) => match[1],
)
  .flatMap((value) => value.split(/\s+/))
  .forEach((id) => {
    assert.ok(idSet.has(id), `ARIA relationship references missing ID: ${id}`);
  });
Array.from(index.matchAll(/<button\b([^>]*)>/g), (match) => match[1]).forEach(
  (attributes) => {
    assert.match(attributes, /\btype="button"|\btype="submit"/);
  },
);
Array.from(
  index.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g),
  (match) => match[1],
).forEach((url) => {
  assert.doesNotMatch(url, /^(?:https?:)?\/\//i);
});

process.stdout.write(
  `Static checks passed for ${Dataset.scenarios.length} scenarios.\n`,
);
