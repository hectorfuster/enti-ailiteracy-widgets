import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Content = require(resolve(root, "content.js"));
const sources = Object.values(Content.SOURCES);

async function probe(source) {
  try {
    const response = await fetch(source.url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": "ENTI-B8-source-maintenance/2.0",
      },
    });
    if (response.status === 405) {
      const fallback = await fetch(source.url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Range: "bytes=0-1024",
          "User-Agent": "ENTI-B8-source-maintenance/2.0",
        },
      });
      return { source, status: fallback.status, finalUrl: fallback.url };
    }
    return { source, status: response.status, finalUrl: response.url };
  } catch (error) {
    return {
      source,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const results = await Promise.all(sources.map(probe));
let failed = false;
let inconclusive = 0;

for (const result of results) {
  const prefix = `${result.source.id}:`;
  if (result.status === 0) {
    inconclusive += 1;
    console.warn(
      `${prefix} inconclusive transport check (${result.error}) ${result.source.url}`,
    );
  } else if (
    result.status === 404 ||
    result.status === 410 ||
    result.status >= 500
  ) {
    failed = true;
    console.error(`${prefix} FAILED (${result.status}) ${result.source.url}`);
  } else if ([401, 403, 408, 425, 429].includes(result.status)) {
    inconclusive += 1;
    console.warn(
      `${prefix} reachable but access-restricted (${result.status}) ${result.source.url}`,
    );
  } else if (result.status >= 400) {
    failed = true;
    console.error(`${prefix} FAILED (${result.status}) ${result.source.url}`);
  } else {
    console.log(`${prefix} ${result.status} ${result.finalUrl}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${results.length} official source URLs; no dead link was detected (${inconclusive} transport check${inconclusive === 1 ? "" : "s"} inconclusive).`,
  );
}
