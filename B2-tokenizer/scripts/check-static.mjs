import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const htmlFiles = [
  resolve(projectDirectory, "index.html"),
  resolve(projectDirectory, "tests", "iframe-harness.html"),
];
const markdownFiles = [
  resolve(projectDirectory, "README.md"),
  resolve(projectDirectory, "VENDOR.md"),
  resolve(projectDirectory, "THIRD-PARTY-NOTICES.md"),
];
const requiredAssets = [
  "app.js",
  "cl100k_base.js",
  "integration/moodle-wrapper.js",
  "o200k_base.js",
  "styles.css",
  "tokenizer-core.js",
  "tokenizer-worker.js",
];
const errors = [];

function report(file, message) {
  errors.push(`${file.replace(`${projectDirectory}\\`, "")}: ${message}`);
}

function localTarget(sourceFile, reference) {
  const withoutFragment = reference.split("#", 1)[0].split("?", 1)[0];
  return resolve(dirname(sourceFile), decodeURIComponent(withoutFragment));
}

async function verifyLocalReference(sourceFile, reference) {
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
    await verifyLocalReference(htmlFile, reference);
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
    const tag = match[0];
    if (!/\brel=(["'])[^"']*\bnoopener\b[^"']*\1/i.test(tag)) {
      report(htmlFile, 'target="_blank" link is missing rel="noopener"');
    }
  }
}

for (const markdownFile of markdownFiles) {
  const markdown = await readFile(markdownFile, "utf8");
  for (const match of markdown.matchAll(
    /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
  )) {
    await verifyLocalReference(markdownFile, match[1]);
  }
}

for (const asset of requiredAssets) {
  try {
    await access(resolve(projectDirectory, asset));
  } catch {
    report(projectDirectory, `required production asset is missing: ${asset}`);
  }
}

for (const sourceFile of [...htmlFiles, ...markdownFiles]) {
  if (![".html", ".md"].includes(extname(sourceFile))) {
    report(sourceFile, "unexpected static-check input type");
  }
}

if (errors.length > 0) {
  throw new Error(`Static integrity check failed:\n- ${errors.join("\n- ")}`);
}

console.log(
  `Static integrity verified: ${htmlFiles.length} HTML documents, ` +
    `${markdownFiles.length} Markdown documents, and ${requiredAssets.length} production assets.`,
);
