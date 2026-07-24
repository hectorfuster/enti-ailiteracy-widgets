import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("../", import.meta.url));
const productionFiles = [
  "index.html",
  "styles.css",
  "scenario-data.js",
  "inference-engine.js",
  "state-machine.js",
  "app.js",
];
const maximumBytes = 160 * 1024;
let total = 0;

for (const file of productionFiles) {
  const info = await stat(resolve(project, file));
  total += info.size;
}

if (total > maximumBytes) {
  throw new Error(
    `Production assets use ${total} bytes; budget is ${maximumBytes} bytes.`,
  );
}

console.log(
  `Production size verified: ${total} bytes across ${productionFiles.length} files ` +
    `(budget ${maximumBytes} bytes).`,
);
