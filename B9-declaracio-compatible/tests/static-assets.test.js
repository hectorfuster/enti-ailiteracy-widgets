import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);

async function read(name) {
  return readFile(new URL(name, root), "utf8");
}

test("HTML declares Catalan, responsive metadata, and the local bundle", async () => {
  const html = await read("index.html");
  assert.match(html, /<html lang="ca">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /name="enti-parent-origin"/);
  assert.match(html, /<script defer src="\.\/widget\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/);
  assert.match(html, /id="builder-template"/);
  assert.match(html, /aria-live="polite"/);
  assert.equal(
    html.match(
      /Quants processos diferents creus que podrien encaixar amb la frase\?/g,
    )?.length,
    1,
  );
  assert.doesNotMatch(html, /processos de sota/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
  assert.doesNotMatch(html, /\sstyle="/);
});

test("shipped runtime is a parseable classic script with a startup fail-safe", async () => {
  const [html, bundle] = await Promise.all([
    read("index.html"),
    read("widget.js"),
  ]);

  assert.match(html, /<div class="notice notice-insight" id="startup-status">/);
  assert.doesNotMatch(html, /id="startup-status"[^>]*\shidden/);
  assert.doesNotMatch(bundle, /^\s*(?:import|export)\s/m);
  assert.doesNotThrow(() => new vm.Script(bundle, { filename: "widget.js" }));
  assert.match(
    bundle,
    /byId\("prediction-form"\)\.addEventListener\("submit"/,
  );
  assert.match(bundle, /byId\("prediction-result"\)\.hidden = false/);
  assert.match(bundle, /byId\("startup-status"\)\.hidden = true/);
  assert.ok(
    bundle.indexOf('byId("prediction-form").addEventListener("submit"') <
      bundle.indexOf('byId("startup-status").hidden = true'),
    "Startup notice must remain visible until event handlers are registered",
  );
});

test("static HTML IDs are unique and local references resolve", async () => {
  const html = await read("index.html");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);

  const idSet = new Set(ids);
  const references = [
    ...html.matchAll(
      /\s(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g,
    ),
  ].flatMap((match) => match[1].split(/\s+/));
  for (const reference of references) {
    assert.ok(idSet.has(reference), `Missing referenced ID: ${reference}`);
  }

  const hashLinks = [...html.matchAll(/\shref="#([^"]+)"/g)].map(
    (match) => match[1],
  );
  for (const reference of hashLinks) {
    assert.ok(idSet.has(reference), `Missing hash target: ${reference}`);
  }
});

test("app literal ID and data-role lookups resolve against the HTML template", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  const ids = new Set(
    [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
  );
  const roles = new Set(
    [...html.matchAll(/\sdata-role="([^"]+)"/g)].map((match) => match[1]),
  );

  for (const match of app.matchAll(/\bbyId\("([^"]+)"\)/g)) {
    assert.ok(ids.has(match[1]), `App references missing ID: ${match[1]}`);
  }
  for (const match of app.matchAll(/\[data-role="([^"]+)"\]/g)) {
    assert.ok(
      roles.has(match[1]),
      `App references missing template role: ${match[1]}`,
    );
  }
});

test("runtime assets make no third-party request", async () => {
  const assets = await Promise.all(
    ["index.html", "styles.css", "widget.js"].map(read),
  );
  for (const asset of assets) {
    assert.doesNotMatch(asset, /https?:\/\//i);
  }
  assert.doesNotMatch(await read("styles.css"), /@import/i);
});

test("the complete first-party runtime stays within its size budgets", async () => {
  const assets = await Promise.all(
    ["index.html", "styles.css", "widget.js"].map(read),
  );
  const combined = assets.join("\n");
  assert.ok(
    Buffer.byteLength(combined, "utf8") < 100_000,
    "Uncompressed runtime exceeds 100 KB",
  );
  assert.ok(gzipSync(combined).byteLength < 30_000, "Gzipped runtime exceeds 30 KB");
});

test("Moodle bridge uses an exact configured origin and excludes learner text", async () => {
  const app = await read("app.js");
  const bridge = app.slice(
    app.indexOf("class MoodleBridge"),
    app.indexOf("class DisclosureBuilder"),
  );
  assert.match(bridge, /this\.parentOrigin/);
  assert.match(bridge, /window\.parent\.postMessage/);
  assert.match(bridge, /this\.parentOrigin,\s*\)/);
  assert.doesNotMatch(bridge, /postMessage\([^)]*,\s*["']\*["']/s);
  assert.doesNotMatch(bridge, /declaration/);
  assert.doesNotMatch(bridge, /selections/);
});

test("CSS contains keyboard, reflow, reduced-motion, and forced-colors support", async () => {
  const css = await read("styles.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /min-height: 44px/);
});

function luminance(hex) {
  const channels = hex
    .match(/[0-9a-f]{2}/gi)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("defined text, focus, state, and control-boundary colors meet their thresholds", () => {
  const checks = [
    ["#181612", "#f3eee5", 4.5, "ink/page"],
    ["#504a42", "#f3eee5", 4.5, "soft/page"],
    ["#6b645a", "#f3eee5", 4.5, "faint/page"],
    ["#746c60", "#ffffff", 3, "control boundary/card"],
    ["#9b2020", "#f3eee5", 3, "focus/page"],
    ["#9b2020", "#ffffff", 3, "focus/card"],
    ["#2f673d", "#eaf4e9", 4.5, "success/success-soft"],
    ["#83520a", "#fff3d8", 4.5, "warning/warning-soft"],
    ["#8d1c1c", "#fbe7e5", 4.5, "danger/danger-soft"],
    ["#17466b", "#e8f1f7", 4.5, "blue/blue-soft"],
  ];

  for (const [foreground, background, minimum, label] of checks) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${label} is below ${minimum}:1`,
    );
  }
});
