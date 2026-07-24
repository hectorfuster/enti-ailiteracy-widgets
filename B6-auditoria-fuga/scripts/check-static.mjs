import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = dirname(dirname(fileURLToPath(import.meta.url)));
const htmlFiles = [
  resolve(project, "index.html"),
  resolve(project, "tests", "iframe-harness.html"),
];
const markdownFiles = [
  resolve(project, "README.md"),
  resolve(project, "PRIVACY.md"),
  resolve(project, "VALIDATION.md"),
  resolve(project, "CONTENT-GOVERNANCE.md"),
  resolve(project, "PILOT-PROTOCOL.md"),
  resolve(project, "IMPROVEMENT-ROADMAP.md"),
];
const productionAssets = [
  "app.js",
  "inference-engine.js",
  "integration/moodle-wrapper.js",
  "scenario-data.js",
  "state-machine.js",
  "styles.css",
];
const errors = [];

function report(file, message) {
  errors.push(`${file.replace(`${project}\\`, "")}: ${message}`);
}

function localTarget(sourceFile, reference) {
  const withoutFragment = reference.split("#", 1)[0].split("?", 1)[0];
  return resolve(dirname(sourceFile), decodeURIComponent(withoutFragment));
}

async function verifyReference(sourceFile, reference) {
  if (!reference || reference.startsWith("#")) return;
  if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) {
    if (/^http:/i.test(reference))
      report(sourceFile, `external URL must use HTTPS: ${reference}`);
    try {
      new URL(reference);
    } catch {
      report(sourceFile, `invalid external URL: ${reference}`);
    }
    return;
  }
  try {
    await access(localTarget(sourceFile, reference));
  } catch {
    report(sourceFile, `missing local target: ${reference}`);
  }
}

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  const ids = new Set();

  for (const match of html.matchAll(/\bid=(["'])(.*?)\1/gi)) {
    if (ids.has(match[2])) report(htmlFile, `duplicate id="${match[2]}"`);
    ids.add(match[2]);
  }

  for (const match of html.matchAll(/\b(?:src|href)=(["'])(.*?)\1/gi)) {
    const reference = match[2];
    if (/^javascript:/i.test(reference)) {
      report(htmlFile, `unsafe URL: ${reference}`);
      continue;
    }
    if (reference.startsWith("#") && !ids.has(reference.slice(1))) {
      report(htmlFile, `missing fragment target: ${reference}`);
      continue;
    }
    await verifyReference(htmlFile, reference);
  }

  for (const match of html.matchAll(/\bfor=(["'])(.*?)\1/gi)) {
    for (const target of match[2].trim().split(/\s+/)) {
      if (!ids.has(target))
        report(htmlFile, `for="${target}" has no matching id`);
    }
  }

  for (const match of html.matchAll(
    /<a\b[^>]*\btarget=(["'])_blank\1[^>]*>/gi,
  )) {
    if (!/\brel=(["'])[^"']*\bnoopener\b[^"']*\1/i.test(match[0]))
      report(htmlFile, 'target="_blank" link is missing rel="noopener"');
  }

  if (htmlFile.endsWith("index.html")) {
    if (/https?:\/\/fonts\./i.test(html))
      report(htmlFile, "production HTML loads a third-party font");
    if (!/Content-Security-Policy/i.test(html))
      report(htmlFile, "production HTML is missing a CSP");
    if (!/<noscript>/i.test(html))
      report(htmlFile, "production HTML is missing a noscript fallback");
  }
}

for (const markdownFile of markdownFiles) {
  const markdown = await readFile(markdownFile, "utf8");
  for (const match of markdown.matchAll(
    /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
  )) {
    await verifyReference(markdownFile, match[1]);
  }
}

for (const asset of productionAssets) {
  try {
    await access(resolve(project, asset));
  } catch {
    report(project, `required production asset is missing: ${asset}`);
  }
}

if (errors.length) {
  throw new Error(`Static integrity check failed:\n- ${errors.join("\n- ")}`);
}

console.log(
  `Static integrity verified: ${htmlFiles.length} HTML documents, ` +
    `${markdownFiles.length} Markdown documents, and ` +
    `${productionAssets.length} production assets.`,
);
