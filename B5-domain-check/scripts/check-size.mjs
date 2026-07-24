import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const artifact = await readFile(resolve(root, "index.html"));
const compressed = gzipSync(artifact, { level: 9 });
const limits = {
  raw: 110 * 1024,
  gzip: 30 * 1024,
};

console.log(
  `Artifact size: ${artifact.length} bytes raw; ${compressed.length} bytes gzip.`,
);

if (artifact.length > limits.raw || compressed.length > limits.gzip) {
  console.error(
    `Size budget exceeded (max ${limits.raw} raw / ${limits.gzip} gzip bytes).`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Artifact is within the ${limits.raw} raw / ${limits.gzip} gzip byte budget.`,
  );
}
