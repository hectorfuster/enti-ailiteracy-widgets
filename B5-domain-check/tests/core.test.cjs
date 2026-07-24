const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function classify(errorIndex, answer) {
  if (errorIndex === null && answer === "clean") return "cleanAccepted";
  if (errorIndex === null) return "falseAlarm";
  if (answer === "clean") return "missedError";
  if (Number(answer) === errorIndex) return "localized";
  return "wrongLocation";
}

test("the five outcome buckets are mutually exclusive and exhaustive", () => {
  const cases = [
    [null, "clean", "cleanAccepted"],
    [null, "0", "falseAlarm"],
    [0, "clean", "missedError"],
    [0, "0", "localized"],
    [0, "1", "wrongLocation"],
    [1, "0", "wrongLocation"],
    [1, "1", "localized"],
    [2, "2", "localized"],
  ];
  for (const [errorIndex, answer, expected] of cases) {
    assert.equal(classify(errorIndex, answer), expected);
  }
  assert.deepEqual(
    new Set(cases.map(([errorIndex, answer]) => classify(errorIndex, answer))),
    new Set([
      "cleanAccepted",
      "falseAlarm",
      "missedError",
      "localized",
      "wrongLocation",
    ]),
  );
});

test("domain banks are matched and every item has reviewable provenance", async () => {
  const bank = JSON.parse(
    await readFile(path.join(root, "src", "items.ca.json"), "utf8"),
  );
  const patterns = bank.domains.map((domain) =>
    domain.items.map((item) => item.difficulty),
  );

  assert.ok(bank.domains.length >= 4);
  for (const domain of bank.domains) {
    assert.equal(domain.items.length, 5);
    assert.deepEqual(
      domain.items.map((item) => item.errorIndex),
      [0, 1, 2, null, null],
    );
    assert.deepEqual(patterns[0], patterns[bank.domains.indexOf(domain)]);
    for (const item of domain.items) {
      assert.equal(item.claims.length, 3);
      assert.match(item.source.url, /^https:\/\//);
      assert.equal(item.review.factual, "source-checked");
      assert.ok(item.provenance.length >= 10);
    }
  }
});

test("the generated artifact has valid hashes for its only inline style and script", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const csp = html.match(
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
  )?.[1];

  assert.ok(style);
  assert.ok(script);
  assert.ok(csp);
  const digest = (value) =>
    createHash("sha256").update(value, "utf8").digest("base64");
  assert.ok(csp.includes(`style-src 'sha256-${digest(style)}'`));
  assert.ok(csp.includes(`script-src 'sha256-${digest(script)}'`));
  assert.match(csp, /connect-src 'none'/);
  assert.doesNotMatch(html, /@import|fonts\.googleapis|fonts\.gstatic/);
  assert.doesNotMatch(html, /postMessage\([^)]*,\s*["']\*["']/);
});
