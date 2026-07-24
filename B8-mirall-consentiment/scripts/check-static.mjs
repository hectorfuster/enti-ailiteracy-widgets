import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

async function read(relative) {
  return readFile(resolve(root, relative), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

async function checkHtml(relative, { production = false } = {}) {
  const html = await read(relative);
  assert(/^<!doctype html>/i.test(html), `${relative}: falta doctype HTML.`);
  assert(/<html[^>]+lang="ca"/i.test(html), `${relative}: falta lang="ca".`);
  assert(
    /<meta[^>]+name="viewport"/i.test(html),
    `${relative}: falta viewport.`,
  );
  assert(!/\son[a-z]+\s*=/i.test(html), `${relative}: hi ha un gestor inline.`);
  assert(
    !/<script(?![^>]+\bsrc=)[^>]*>/i.test(html),
    `${relative}: hi ha JavaScript inline.`,
  );
  assert(
    !/<style[\s>]/i.test(html),
    `${relative}: hi ha CSS inline; cal mantenir-lo auditable.`,
  );

  const references = [...html.matchAll(/\b(?:src|href)="([^"]+)"/gi)].map(
    (match) => match[1],
  );
  for (const reference of references) {
    if (
      reference.startsWith("#") ||
      reference.startsWith("https://") ||
      reference.startsWith("http://")
    ) {
      continue;
    }
    const target = resolve(dirname(resolve(root, relative)), reference);
    try {
      await access(target);
    } catch {
      errors.push(`${relative}: no existeix el recurs ${reference}.`);
    }
  }

  if (production) {
    assert(
      !/\bhttps?:\/\//i.test(html),
      `${relative}: la pàgina carrega o enllaça un origen extern.`,
    );
    assert(
      !/<(?:img|audio|video|iframe)\b/i.test(html),
      `${relative}: la pàgina de producció inclou un recurs multimèdia no previst.`,
    );
  }
}

await checkHtml("index.html", { production: true });
await checkHtml("tests/iframe-harness.html");

for (const relative of [
  "styles.css",
  "app.js",
  "mirror-core.js",
  "integration/moodle-wrapper.js",
]) {
  const source = await read(relative);
  assert(
    !/\bhttps?:\/\//i.test(source),
    `${relative}: conté una URL remota executable.`,
  );
}

const appSource = await read("app.js");
for (const forbidden of [
  /\blocalStorage\b/,
  /\bindexedDB\b/,
  /\bdocument\.cookie\b/,
  /\bnavigator\.sendBeacon\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\beval\s*\(/,
  /\bnew\s+Function\b/,
]) {
  assert(
    !forbidden.test(appSource),
    `app.js: conté una API no admesa (${forbidden}).`,
  );
}
assert(
  !/postMessage\s*\([^)]*,\s*["']\*["']\s*\)/s.test(appSource),
  "app.js: postMessage no pot utilitzar un origen comodí.",
);
assert(
  /\bsessionStorage\b/.test(appSource),
  "app.js: falta la persistència de sessió divulgada.",
);

const wrapperSource = await read("integration/moodle-wrapper.js");
assert(
  /event\.source\s*!==\s*iframe\.contentWindow/.test(wrapperSource) &&
    /event\.origin\s*!==\s*trustedOrigin/.test(wrapperSource),
  "moodle-wrapper.js: falta validar source o origen exacte.",
);
assert(
  !/postMessage\s*\(/.test(wrapperSource),
  "moodle-wrapper.js: el receptor no ha d’enviar dades.",
);

const serverSource = await read("scripts/static-server.mjs");
assert(
  /connect-src 'none'/.test(serverSource) &&
    /object-src 'none'/.test(serverSource) &&
    /frame-ancestors 'self'/.test(serverSource),
  "static-server.mjs: la CSP de proves no és prou restrictiva.",
);
assert(
  !/frame-ancestors \*/.test(serverSource),
  "static-server.mjs: frame-ancestors no pot ser comodí.",
);

const contentSource = await read("content.js");
const sourceUrls = [...contentSource.matchAll(/url:\s*"([^"]+)"/g)].map(
  (match) => match[1],
);
assert(sourceUrls.length >= 5, "content.js: falten fonts oficials.");
for (const url of sourceUrls) {
  try {
    const parsed = new URL(url);
    assert(
      parsed.protocol === "https:",
      `content.js: la font no utilitza HTTPS: ${url}`,
    );
  } catch {
    errors.push(`content.js: URL de font invàlida: ${url}`);
  }
}

const productionFiles = [
  "index.html",
  "styles.css",
  "content.js",
  "mirror-core.js",
  "app.js",
];
for (const relative of productionFiles) {
  assert(
    [".html", ".css", ".js"].includes(extname(relative)),
    `${relative}: extensió inesperada.`,
  );
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "Static checks passed: local-first assets, CSP-compatible markup, valid references, and HTTPS evidence links.",
  );
}
