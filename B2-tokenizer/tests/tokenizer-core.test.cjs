const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const test = require("node:test");

const tokenizer = require("../o200k_base.js");
const core = require("../tokenizer-core.js");

const engine = core.createTokenizerEngine(tokenizer, {
  locale: "ca",
  visualTokenLimit: 64,
});

const seedFixtures = [
  {
    label: "Catalan seed",
    text: "El meu nom és Anna i vinc de Barcelona. Tinc vint anys i estudio disseny de videojocs.",
    count: 23,
  },
  {
    label: "English seed",
    text: "My name is Anna and I come from Barcelona. I am twenty years old and I study video game design.",
    count: 22,
  },
  {
    label: "Spanish seed",
    text: "Me llamo Ana y vengo de Barcelona. Tengo veinte años y estudio diseño de videojuegos.",
    count: 19,
  },
  {
    label: "Free seed",
    text: "Una mica de pa amb tomàquet i una mica d'oli d'oliva.",
    count: 18,
  },
];

const aiPromptFixtures = [
  {
    label: "Catalan AI prompt",
    text: "Resumeix aquest text en cinc punts.",
    count: 8,
  },
  {
    label: "English AI prompt",
    text: "Summarize this text in five bullet points.",
    count: 10,
  },
  {
    label: "Spanish AI prompt",
    text: "Resume este texto en cinco puntos.",
    count: 7,
  },
];

function assertRoundTrip(text) {
  const result = engine.tokenize(text, { includeAllGroups: true });
  assert.equal(result.reconstructionVerified, true);
  assert.equal(result.allGroups.map((group) => group.text).join(""), text);
  assert.equal(
    result.allGroups.reduce((sum, group) => sum + group.ids.length, 0),
    result.tokenCount,
  );
  assert.ok(result.allGroups.every((group) => group.ids.length > 0));
  assert.ok(result.allGroups.every((group) => group.displayText.length > 0));
  assert.ok(result.allGroups.every((group) => Array.isArray(group.utf8Bytes)));
  assert.ok(
    result.allGroups.every((group) =>
      /^[0-9A-F]{2}( [0-9A-F]{2})*$/.test(group.utf8Hex),
    ),
  );
  assert.deepEqual(
    result.allGroups.flatMap((group) => group.utf8Bytes),
    Array.from(new TextEncoder().encode(text)),
  );
  return result;
}

test("keeps the original seed counts stable", () => {
  for (const fixture of seedFixtures) {
    const result = assertRoundTrip(fixture.text);
    assert.equal(result.tokenCount, fixture.count, fixture.label);
  }
});

test("keeps the default AI prompt counts stable", () => {
  for (const fixture of aiPromptFixtures) {
    const result = assertRoundTrip(fixture.text);
    assert.equal(result.tokenCount, fixture.count, fixture.label);
  }
});

test("handles empty and whitespace-only input", () => {
  const empty = assertRoundTrip("");
  assert.equal(empty.tokenCount, 0);
  assert.equal(empty.graphemeCount, 0);

  const whitespace = assertRoundTrip(" \t\r\n\u00a0");
  assert.ok(whitespace.tokenCount > 0);
  assert.match(
    whitespace.allGroups.map((group) => group.displayText).join(""),
    /·|⇥|␍|↵|⍽/,
  );
});

test("treats literal special-token syntax as ordinary text", () => {
  const spellings = [
    "<|endoftext|>",
    "<|fim_prefix|>",
    "<|fim_middle|>",
    "<|fim_suffix|>",
    "<|im_start|>",
    "<|im_end|>",
    "<|im_sep|>",
    "<|endofprompt|>",
  ];
  for (const spelling of spellings) {
    const result = assertRoundTrip(
      `${spelling} és text literal, no una ordre.`,
    );
    assert.ok(result.tokenCount > 0);
  }
});

test("returns a discriminated error without a stale success payload", () => {
  const failingEncoder = {
    encode() {
      throw new Error("fallada controlada");
    },
    decode() {
      return "";
    },
    *decodeGenerator() {},
  };
  const failingEngine = core.createTokenizerEngine(failingEncoder);
  assert.deepEqual(failingEngine.safeTokenize("text"), {
    ok: false,
    message: "fallada controlada",
  });
});

test("groups split UTF-8 tokens without hiding identifiers", () => {
  const text = "👨‍👩‍👧‍👦 🎮✨";
  const result = assertRoundTrip(text);
  assert.ok(result.allGroups.some((group) => group.ids.length > 1));
  assert.ok(result.allGroups.every((group) => group.ariaText.length > 0));
});

test("counts grapheme clusters instead of UTF-16 code units", () => {
  assert.equal(core.graphemeCount("👨‍👩‍👧‍👦", "ca"), 1);
  assert.equal(core.graphemeCount("a\u0301", "ca"), 1);
  assert.equal(core.graphemeCount("à", "ca"), 1);
});

test("round-trips Catalan punctuation, normalization, RTL, CJK, and HTML-like text", () => {
  const cases = [
    "l·l · d’oli · «hola»\u00a0",
    "cafe\u0301 i cafè",
    "العربية \u200fمرحبا",
    "中文、日本語、한국어",
    "<script>alert('xss')</script>",
    "👋🏽 bandera: 🏳️‍🌈",
  ];
  for (const text of cases) assertRoundTrip(text);
});

test("abbreviates detailed rendering while preserving the full count", () => {
  const text = "token ".repeat(2000);
  const result = engine.tokenize(text, { includeAllGroups: true });
  assert.equal(result.truncated, true);
  assert.ok(result.omittedTokenCount > 0);
  assert.ok(result.groups.length < result.allGroups.length);
  assert.equal(result.allGroups.map((group) => group.text).join(""), text);
});

test("keeps 10,000-character tokenization p95 below 100 ms", () => {
  const text = "El jugador desa la partida. ".repeat(371).slice(0, 10000);
  const samples = [];
  for (let index = 0; index < 12; index += 1) {
    const started = performance.now();
    engine.tokenize(text);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  assert.ok(p95 < 100, `10,000-character p95 was ${p95.toFixed(1)} ms`);
});

test("handles a 100,000-character stress input in bounded time", () => {
  const text = "El jugador desa la partida. ".repeat(3704).slice(0, 100000);
  const started = performance.now();
  const result = engine.tokenize(text);
  const elapsed = performance.now() - started;
  assert.ok(result.tokenCount > 0);
  assert.equal(result.truncated, true);
  assert.ok(elapsed < 5000, `Tokenization took ${elapsed.toFixed(0)} ms`);
});
