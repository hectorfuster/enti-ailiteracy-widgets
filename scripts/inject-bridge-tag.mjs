import fs from "fs";
import path from "path";

const root = process.cwd();
const tag = '<script src="../shared/enti-widget-bridge.js"></script>\n';

const files = [
  "B1-chinese-room/index.html",
  "B2-tokenizer/index.html",
  "B3-token-predictor/index.html",
  "B4-performance-paradox/index.html",
  "B5-domain-check/index.html",
  "B6-auditoria-fuga/index.html",
  "B7-el-brief/index.html",
  "B9-declaracio-compatible/index.html",
];

for (const rel of files) {
  const p = path.join(root, rel);
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("enti-widget-bridge.js")) {
    console.log("already", rel);
    continue;
  }
  // Insert before the last <script> that is not a src script, or before first inline script near end
  const idx = s.lastIndexOf("<script>");
  if (idx === -1) {
    console.log("no script", rel);
    continue;
  }
  s = s.slice(0, idx) + tag + s.slice(idx);
  fs.writeFileSync(p, s);
  console.log("injected", rel);
}
