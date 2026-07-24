import { access, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "index.html",
  "styles.css",
  "widget.js",
  "app.js",
  "content.js",
  "disclosure-core.js",
  "integration/moodle-parent-example.js",
  "scripts/build-runtime.mjs",
  "README.md",
  "INSTRUCTOR-GUIDE.md",
  "VALIDATION.md",
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(new URL(file, root));
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

const runtimeFiles = [
  "index.html",
  "styles.css",
  "widget.js",
];
const runtimeContents = [];

for (const file of runtimeFiles) {
  const content = await readFile(new URL(file, root), "utf8");
  runtimeContents.push(content);
  if (/https?:\/\//i.test(content)) {
    failures.push(`${file} contains an external HTTP(S) URL`);
  }
  if (content.includes("\uFFFD")) {
    failures.push(`${file} contains a replacement character`);
  }
}

const combinedRuntime = runtimeContents.join("\n");
const rawRuntimeBytes = Buffer.byteLength(combinedRuntime, "utf8");
const gzipRuntimeBytes = gzipSync(combinedRuntime).byteLength;
if (rawRuntimeBytes >= 100_000) {
  failures.push(`Runtime exceeds the 100 KB raw budget: ${rawRuntimeBytes} B`);
}
if (gzipRuntimeBytes >= 30_000) {
  failures.push(`Runtime exceeds the 30 KB gzip budget: ${gzipRuntimeBytes} B`);
}

const html = await readFile(new URL("index.html", root), "utf8");
for (const requiredSnippet of [
  '<html lang="ca">',
  'name="viewport"',
  'name="enti-parent-origin"',
  'id="startup-status"',
  'id="worlds"',
  'id="groups"',
  'id="result-message"',
  'src="./widget.js"',
  'href="./styles.css"',
]) {
  if (!html.includes(requiredSnippet)) {
    failures.push(`index.html is missing ${requiredSnippet}`);
  }
}

if (failures.length > 0) {
  console.error("Static validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Static validation passed: ${requiredFiles.length} required files, ${runtimeFiles.length} local-only runtime assets, ${rawRuntimeBytes} B raw, ${gzipRuntimeBytes} B gzip.`,
  );
}
