const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const runtimeFiles = [
  "index.html",
  "styles.css",
  "scenario-data.js",
  "engine.js",
  "app.js",
];
const rawBudget = 128 * 1024;
const gzipBudget = 32 * 1024;
const payload = Buffer.concat(
  runtimeFiles.flatMap((file) => [
    Buffer.from(`\n/* ${file} */\n`, "utf8"),
    fs.readFileSync(path.join(root, file)),
  ]),
);
const gzipBytes = zlib.gzipSync(payload, { level: 9 }).byteLength;

assert.ok(
  payload.byteLength <= rawBudget,
  `Runtime is ${payload.byteLength} B; budget is ${rawBudget} B.`,
);
assert.ok(
  gzipBytes <= gzipBudget,
  `Runtime is ${gzipBytes} B gzip; budget is ${gzipBudget} B.`,
);

process.stdout.write(
  `Runtime size passed: ${payload.byteLength} B raw, ${gzipBytes} B gzip.\n`,
);
