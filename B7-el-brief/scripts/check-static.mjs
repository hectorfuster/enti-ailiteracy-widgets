import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const htmlFiles = [
  resolve(projectDirectory, "index.html"),
  resolve(projectDirectory, "tests", "iframe-harness.html"),
];
const markdownFiles = [
  resolve(projectDirectory, "README.md"),
  resolve(projectDirectory, "VALIDATION.md"),
  resolve(projectDirectory, "CONTENT-GOVERNANCE.md"),
  resolve(projectDirectory, "THIRD-PARTY-NOTICES.md"),
];
const requiredAssets = [
  "app.js",
  "brief-core.js",
  "scenario-data.js",
  "styles.css",
  "integration/moodle-wrapper.js",
  "tests/iframe-harness.js",
];
const errors = [];

function report(file, message) {
  errors.push(`${file.replace(`${projectDirectory}\\`, "")}: ${message}`);
}

function localTarget(sourceFile, reference) {
  const withoutFragment = reference.split("#", 1)[0].split("?", 1)[0];
  return resolve(dirname(sourceFile), decodeURIComponent(withoutFragment));
}

async function verifyReference(sourceFile, reference) {
  if (!reference || reference.startsWith("#")) return;
  if (/^(?:https?:|mailto:|tel:|data:)/i.test(reference)) {
    if (/^http:/i.test(reference)) {
      report(sourceFile, `external URL must use HTTPS: ${reference}`);
    }
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

  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
    report(htmlFile, "inline scripts are not allowed");
  }
  if (/\son[a-z]+\s*=/i.test(html)) {
    report(htmlFile, "inline event handlers are not allowed");
  }
  if (/\sstyle\s*=/i.test(html)) {
    report(htmlFile, "inline style attributes are not allowed");
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

for (const asset of requiredAssets) {
  try {
    await access(resolve(projectDirectory, asset));
  } catch {
    report(projectDirectory, `required production asset is missing: ${asset}`);
  }
}

const indexHtml = await readFile(
  resolve(projectDirectory, "index.html"),
  "utf8",
);
if (!indexHtml.includes("connect-src 'none'")) {
  report("index.html", "CSP must block all network connections");
}
if (/https?:\/\//i.test(indexHtml)) {
  report("index.html", "production HTML must not reference remote resources");
}

const appSource = await readFile(resolve(projectDirectory, "app.js"), "utf8");
if (/\.innerHTML\s*=/.test(appSource)) {
  report("app.js", "authored content must not be assigned with innerHTML");
}

if (errors.length > 0) {
  throw new Error(`Static integrity check failed:\n- ${errors.join("\n- ")}`);
}

console.log(
  `Static integrity verified: ${htmlFiles.length} HTML documents, ` +
    `${markdownFiles.length} Markdown documents, and ${requiredAssets.length} production assets.`,
);
