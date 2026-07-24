import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const productionFiles = [
  "index.html",
  "styles.css",
  "scenario-data.js",
  "brief-core.js",
  "app.js",
  "integration/moodle-wrapper.js",
];
const budget = 160 * 1024;
let total = 0;

for (const file of productionFiles) {
  const size = (await stat(resolve(root, file))).size;
  total += size;
  console.log(`${file}: ${(size / 1024).toFixed(1)} KiB`);
}

if (total > budget) {
  throw new Error(
    `Production assets use ${(total / 1024).toFixed(1)} KiB; budget is ${budget / 1024} KiB.`,
  );
}

console.log(
  `Production assets: ${(total / 1024).toFixed(1)} KiB of ${budget / 1024} KiB.`,
);
