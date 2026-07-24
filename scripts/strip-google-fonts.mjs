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

const fontVarsBlock = `  --font-serif: Georgia, 'Times New Roman', Times, serif;
  --font-mono: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Consolas, monospace;
`;

for (const rel of files) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, "utf8");
  const before = s;

  s = s.replace(
    /@import url\(['"]https:\/\/fonts\.googleapis\.com[^'"]+['"]\);\s*/g,
    ""
  );

  s = s.replace(/'EB Garamond', Georgia, serif/g, "var(--font-serif)");
  s = s.replace(/'EB Garamond',Georgia,serif/g, "var(--font-serif)");
  s = s.replace(/'EB Garamond', serif/g, "var(--font-serif)");
  s = s.replace(/'JetBrains Mono', monospace/g, "var(--font-mono)");
  s = s.replace(/'JetBrains Mono',monospace/g, "var(--font-mono)");
  s = s.replace(
    /'Noto Serif SC', var\(--font-serif\)/g,
    "'Songti SC', 'SimSun', 'Noto Serif CJK SC', var(--font-serif)"
  );
  s = s.replace(
    /'Noto Serif SC', 'EB Garamond', serif/g,
    "'Songti SC', 'SimSun', 'Noto Serif CJK SC', var(--font-serif)"
  );

  if (!s.includes("--font-serif")) {
    if (/:root\s*\{/.test(s)) {
      s = s.replace(/:root\s*\{/, (m) => `${m}\n${fontVarsBlock}`);
    } else if (/:root\{/.test(s)) {
      s = s.replace(
        /:root\{/,
        `:root{--font-serif:Georgia,'Times New Roman',Times,serif;--font-mono:ui-monospace,'Cascadia Code','Segoe UI Mono',Consolas,monospace;`
      );
    }
  }

  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log("updated fonts", rel);
  } else {
    console.log("no font change", rel);
  }
}
