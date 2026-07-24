import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const bank = JSON.parse(
  await readFile(resolve(root, "src", "items.ca.json"), "utf8"),
);
const online = process.argv.includes("--online");
const allItems = [
  bank.practice,
  ...bank.domains.flatMap((domain) => domain.items),
  ...bank.transfers,
];
const sources = new Map();

for (const item of allItems) {
  if (!item.source.url) continue;
  const existing = sources.get(item.source.url) || {
    publisher: item.source.publisher,
    title: item.source.title,
    itemIds: [],
  };
  existing.itemIds.push(item.id);
  sources.set(item.source.url, existing);
}

const metadataErrors = [];
for (const [url, source] of sources) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    metadataErrors.push(`${source.itemIds.join(", ")}: invalid URL ${url}`);
    continue;
  }
  if (parsed.protocol !== "https:") {
    metadataErrors.push(
      `${source.itemIds.join(", ")}: source must use HTTPS (${url})`,
    );
  }
  if (!source.publisher || !source.title) {
    metadataErrors.push(
      `${source.itemIds.join(", ")}: source label is incomplete`,
    );
  }
}

if (metadataErrors.length > 0) {
  console.error(`Source metadata check failed (${metadataErrors.length}):`);
  metadataErrors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Validated metadata for ${sources.size} unique authoritative source URLs.`,
  );
}

if (!online || process.exitCode) {
  if (!online) {
    console.log(
      "Online liveness was not requested; use `npm run check:sources:online`.",
    );
  }
} else {
  const entries = [...sources.entries()];
  const results = [];
  const reachableRestrictedStatuses = new Set([401, 403, 405, 429]);

  async function probe(url, source) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/pdf;q=0.9,*/*;q=0.1",
          Range: "bytes=0-0",
          "User-Agent": "ENTI-B5-source-check/2.0",
        },
        redirect: "follow",
        signal: controller.signal,
      });
      await response.body?.cancel();
      const reachable =
        (response.status >= 200 && response.status < 400) ||
        reachableRestrictedStatuses.has(response.status);
      return {
        url,
        itemIds: source.itemIds,
        status: response.status,
        reachable,
      };
    } catch (error) {
      return {
        url,
        itemIds: source.itemIds,
        status: error.name === "AbortError" ? "timeout" : error.message,
        reachable: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  for (let index = 0; index < entries.length; index += 4) {
    const batch = entries.slice(index, index + 4);
    results.push(
      ...(await Promise.all(batch.map(([url, source]) => probe(url, source)))),
    );
  }

  const failures = results.filter((result) => !result.reachable);
  results.forEach((result) => {
    console.log(
      `${result.reachable ? "OK" : "FAIL"} ${result.status} ${result.url}`,
    );
  });
  if (failures.length > 0) {
    console.error(`Broken-source check failed (${failures.length}).`);
    process.exitCode = 1;
  } else {
    console.log(`All ${results.length} source URLs are reachable.`);
  }
}
