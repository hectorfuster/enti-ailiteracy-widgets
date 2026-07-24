const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Dataset = require("../scenario-data.js");

test("dataset content matches its committed SHA-256 digest", () => {
  const digest = crypto
    .createHash(Dataset.metadata.contentDigestAlgorithm)
    .update(JSON.stringify(Dataset.scenarios))
    .digest("hex");
  assert.equal(digest, Dataset.metadata.contentDigest);
  assert.equal(Dataset.metadata.license, "MIT");
});

test("every candidate is exactly one o200k_base token with the recorded ID", () => {
  const { encode, decode } = require("gpt-tokenizer/encoding/o200k_base");
  for (const scenario of Dataset.scenarios) {
    for (const candidate of scenario.candidates) {
      const ids = encode(candidate.text, { disallowedSpecial: new Set() });
      assert.deepEqual(
        ids,
        [candidate.id],
        `${scenario.id}: ${JSON.stringify(candidate.text)}`,
      );
      assert.equal(decode(ids), candidate.text);
    }
  }
});

test("every prompt token sequence matches the pinned tokenizer", () => {
  const { encode, decode } = require("gpt-tokenizer/encoding/o200k_base");
  for (const scenario of Dataset.scenarios) {
    const expectedIds = scenario.promptTokens.map((token) => token.id);
    const ids = encode(scenario.prompt, { disallowedSpecial: new Set() });
    assert.deepEqual(ids, expectedIds, scenario.id);
    assert.equal(decode(ids), scenario.prompt);
    assert.equal(
      scenario.promptTokens.map((token) => token.text).join(""),
      scenario.prompt,
    );
  }
});
