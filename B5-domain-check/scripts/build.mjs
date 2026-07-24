import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const paths = {
  template: resolve(root, "src", "index.template.html"),
  styles: resolve(root, "src", "styles.css"),
  app: resolve(root, "src", "app.js"),
  items: resolve(root, "src", "items.ca.json"),
  content: resolve(root, "src", "content.ca.json"),
  output: resolve(root, "index.html"),
};

function hashInline(value) {
  return createHash("sha256").update(value, "utf8").digest("base64");
}

function replaceOnce(source, marker, replacement) {
  const first = source.indexOf(marker);
  if (first === -1 || source.indexOf(marker, first + marker.length) !== -1) {
    throw new Error(`Expected exactly one ${marker} marker.`);
  }
  return source.replace(marker, replacement);
}

async function generate() {
  const [template, styles, appSource, itemsText, contentText] =
    await Promise.all([
      readFile(paths.template, "utf8"),
      readFile(paths.styles, "utf8"),
      readFile(paths.app, "utf8"),
      readFile(paths.items, "utf8"),
      readFile(paths.content, "utf8"),
    ]);

  const items = JSON.parse(itemsText);
  const content = JSON.parse(contentText);
  let app = replaceOnce(
    appSource,
    "/*__ITEMS_JSON__*/",
    JSON.stringify(JSON.stringify(items)),
  );
  app = replaceOnce(
    app,
    "/*__CONTENT_JSON__*/",
    JSON.stringify(JSON.stringify(content)),
  );

  let output = replaceOnce(template, "/*__STYLES__*/", styles.trim());
  output = replaceOnce(output, "/*__APP__*/", app.trim());

  const styleText = output.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  const scriptText = output.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (styleText === undefined || scriptText === undefined) {
    throw new Error("Could not locate the inline style and script blocks.");
  }

  const csp = [
    "default-src 'none'",
    `style-src 'sha256-${hashInline(styleText)}'`,
    `script-src 'sha256-${hashInline(scriptText)}'`,
    "img-src data:",
    "connect-src 'none'",
    "font-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  output = replaceOnce(output, "/*__CSP__*/", csp);
  return output.endsWith("\n") ? output : `${output}\n`;
}

const generated = await generate();
if (process.argv.includes("--check")) {
  const current = await readFile(paths.output, "utf8").catch(() => "");
  if (current !== generated) {
    console.error(
      "index.html is stale. Run `npm run build` and commit the generated artifact.",
    );
    process.exitCode = 1;
  } else {
    console.log("index.html matches the structured source.");
  }
} else {
  await writeFile(paths.output, generated, "utf8");
  console.log(`Built ${paths.output}`);
}
