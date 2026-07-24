import fs from "fs";
import path from "path";

const root = process.cwd();
const files = [
  "B1-chinese-room/index.html",
  "B2-tokenizer/index.html",
  "B4-performance-paradox/index.html",
  "B5-domain-check/index.html",
  "B7-el-brief/index.html",
  "B8-mirall-consentiment/index.html",
  "B9-declaracio-compatible/index.html",
];

const multiline = `  --font-serif: Georgia, 'Times New Roman', Times, serif;
  --font-mono: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Consolas, monospace;
`;
const compact =
  "--font-serif:Georgia,'Times New Roman',Times,serif;--font-mono:ui-monospace,'Cascadia Code','Segoe UI Mono',Consolas,monospace;";

for (const rel of files) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, "utf8");
  if (/:root[^{]*\{[^}]*--font-serif\s*:/.test(s)) {
    console.log("ok", rel);
    continue;
  }
  if (/:root\s*\{\s*\n/.test(s)) {
    s = s.replace(/:root\s*\{/, (m) => `${m}\n${multiline}`);
  } else if (/:root\{/.test(s)) {
    s = s.replace(/:root\{/, `:root{${compact}`);
  } else {
    console.log("NO :root", rel);
    continue;
  }
  fs.writeFileSync(p, s);
  console.log("added vars", rel);
}
