import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const bundleNames = ["o200k_base.js", "cl100k_base.js"];
const maximumBytes = 2_100_000;

for (const bundleName of bundleNames) {
  const bundle = resolve(projectDirectory, bundleName);
  const [{ size }, source] = await Promise.all([
    stat(bundle),
    readFile(bundle, "utf8"),
  ]);

  if (size > maximumBytes) {
    throw new Error(
      `${bundleName} is ${size} bytes; the budget is ${maximumBytes} bytes.`,
    );
  }

  if (/\/\/[#@]\s*sourceMappingURL=/.test(source)) {
    throw new Error(
      `${bundleName} contains a source-map reference that is not shipped.`,
    );
  }

  console.log(`${bundleName} size verified: ${size} / ${maximumBytes} bytes.`);
}
