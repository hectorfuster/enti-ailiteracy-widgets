import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const encodings = ["o200k_base", "cl100k_base"];
const checkOnly = process.argv.includes("--check");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function productionUmdBundle(sourceBytes, encodingName) {
  const sourceText = sourceBytes.toString("utf8");
  const transformed = sourceText.replace(
    new RegExp(`\\r?\\n//# sourceMappingURL=${encodingName}\\.js\\.map\\s*$`),
    "\n",
  );
  if (transformed === sourceText) {
    throw new Error(
      `The expected ${encodingName}.js source-map comment was not found.`,
    );
  }
  return Buffer.from(transformed, "utf8");
}

async function prepareEncoding(encodingName) {
  if (encodingName === "cl100k_base") {
    const entry = resolve(
      projectDirectory,
      "node_modules",
      "gpt-tokenizer",
      "esm",
      "encoding",
      "cl100k_base.js",
    );
    const sourceBytes = await readFile(entry);
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      format: "iife",
      globalName: "GPTTokenizer_cl100k_base",
      legalComments: "none",
      minify: true,
      platform: "browser",
      sourcemap: false,
      target: ["es2022"],
      write: false,
    });
    return {
      sourceBytes,
      bundleBytes: Buffer.from(result.outputFiles[0].contents),
      transform:
        "bundled explicit encoding/cl100k_base entry with pinned esbuild",
    };
  }

  const source = resolve(
    projectDirectory,
    "node_modules",
    "gpt-tokenizer",
    "dist",
    `${encodingName}.js`,
  );
  const sourceBytes = await readFile(source);
  return {
    sourceBytes,
    bundleBytes: productionUmdBundle(sourceBytes, encodingName),
    transform: "removed the unavailable source-map reference",
  };
}

async function main() {
  for (const encodingName of encodings) {
    const target = resolve(projectDirectory, `${encodingName}.js`);
    const { sourceBytes, bundleBytes, transform } =
      await prepareEncoding(encodingName);

    if (checkOnly) {
      const targetBytes = await readFile(target);
      const sourceHash = sha256(bundleBytes);
      const targetHash = sha256(targetBytes);
      if (sourceHash !== targetHash) {
        throw new Error(
          `The committed ${encodingName} tokenizer differs from gpt-tokenizer@3.4.0.\n` +
            `source: ${sourceHash}\ncommitted: ${targetHash}\n` +
            `Run npm run vendor:tokenizer to refresh it.`,
        );
      }
      console.log(`${encodingName} verified: ${targetHash}`);
      continue;
    }

    await writeFile(target, bundleBytes);
    console.log(
      `Prepared gpt-tokenizer@3.4.0 ${encodingName}.js (${bundleBytes.length} bytes).`,
    );
    console.log(`Production transform: ${transform}.`);
    console.log(`Source entry SHA-256: ${sha256(sourceBytes)}`);
    console.log(`Committed SHA-256: ${sha256(bundleBytes)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
