import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encode as encodeO200k } from "gpt-tokenizer/encoding/o200k_base";
import { encode as encodeCl100k } from "gpt-tokenizer/encoding/cl100k_base";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const localPythonPackages = resolve(projectDirectory, ".crosscheck");
const pythonScript = resolve(scriptDirectory, "crosscheck-tiktoken.py");
const pythonCommand =
  process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

const fixtures = [
  "Resumeix aquest text en cinc punts.",
  "Summarize this text in five bullet points.",
  "Resume este texto en cinco puntos.",
  "El meu nom és Anna i vinc de Barcelona. Tinc vint anys i estudio disseny de videojocs.",
  "My name is Anna and I come from Barcelona. I am twenty years old and I study video game design.",
  "Me llamo Anna y vengo de Barcelona. Tengo veinte años y estudio diseño de videojuegos.",
  "Una mica de pa amb tomàquet i una mica d’oli d’oliva.",
  "",
  " \t\r\n\u00a0",
  "col·laboració d’IA",
  "col\u00b7laboracio\u0301 d\u2019IA",
  "👨‍👩‍👧‍👦 👍🏽 🇪🇺 ✈️",
  "العربية\u200f 中文 हिन्दी",
  "<|endoftext|> és text literal",
  "<script>alert('x')</script>",
];
const encoders = {
  o200k_base: encodeO200k,
  cl100k_base: encodeCl100k,
};

const environment = { ...process.env };
environment.TIKTOKEN_CACHE_DIR = resolve(projectDirectory, ".tiktoken-cache");
environment.PYTHONUTF8 = "1";
if (existsSync(localPythonPackages)) {
  environment.PYTHONPATH = [localPythonPackages, environment.PYTHONPATH]
    .filter(Boolean)
    .join(delimiter);
}

const reference = spawnSync(pythonCommand, [pythonScript], {
  encoding: "utf8",
  env: environment,
  input: JSON.stringify(fixtures),
  maxBuffer: 10 * 1024 * 1024,
});

if (reference.error) {
  throw new Error(`Could not run ${pythonCommand}: ${reference.error.message}`);
}
if (reference.status !== 0) {
  throw new Error(
    `Python tiktoken cross-check failed.\n${reference.stderr.trim()}\n` +
      "Install the pinned reference with: " +
      "python -m pip install --target .crosscheck -r requirements-crosscheck.txt",
  );
}

const parsed = JSON.parse(reference.stdout);
const mismatches = [];

for (const [encodingName, encode] of Object.entries(encoders)) {
  fixtures.forEach((text, index) => {
    const javascriptIds = encode(text, { disallowedSpecial: new Set() });
    const pythonIds = parsed.ids[encodingName][index];
    if (JSON.stringify(javascriptIds) !== JSON.stringify(pythonIds)) {
      mismatches.push({
        encoding: encodingName,
        fixture: index + 1,
        text,
        javascriptIds,
        pythonIds,
      });
    }
  });
}

if (mismatches.length > 0) {
  throw new Error(
    `Tokenizer mismatch:\n${JSON.stringify(mismatches, null, 2)}`,
  );
}

console.log(
  `Cross-check verified ${fixtures.length * Object.keys(encoders).length} complete ID sequences ` +
    `across ${Object.keys(encoders).join(" and ")} against Python tiktoken@${parsed.version}.`,
);
