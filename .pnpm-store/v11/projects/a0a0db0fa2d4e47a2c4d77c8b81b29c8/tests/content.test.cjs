const test = require("node:test");
const assert = require("node:assert/strict");
const Content = require("../content.js");

test("the five dimensions use stable, reciprocal policy identifiers", () => {
  assert.equal(Content.DIMENSIONS.length, 5);
  assert.equal(new Set(Content.DIMENSIONS.map(({ id }) => id)).size, 5);

  for (const dimension of Content.DIMENSIONS) {
    assert.match(dimension.id, /^[a-z0-9-]+$/);
    assert.ok(dimension.principle.length >= 40);
    assert.ok(dimension.context.length >= 120);
    assert.ok(dimension.evidence.length >= 50);
    assert.equal(dimension.studio.choices.length, 4);
    assert.equal(dimension.creator.choices.length, 4);

    const studioPolicies = dimension.studio.choices
      .map(({ policy }) => policy)
      .sort();
    const creatorPolicies = dimension.creator.choices
      .map(({ policy }) => policy)
      .sort();
    assert.deepEqual(creatorPolicies, studioPolicies);
    assert.ok(studioPolicies.includes("need-evidence"));

    for (const role of ["studio", "creator"]) {
      const choices = dimension[role].choices;
      assert.equal(new Set(choices.map(({ id }) => id)).size, choices.length);
      for (const choice of choices) {
        assert.match(choice.id, new RegExp(`^${role}-`));
        assert.match(choice.policy, /^[a-z0-9-]+$/);
        assert.ok(choice.label.length >= 35);
      }
    }
  }
});

test("legal context is dated, jurisdiction-scoped, and backed by HTTPS sources", () => {
  assert.match(Content.REVIEWED_ON, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(Content.NEXT_REVIEW_ON, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Content.NEXT_REVIEW_ON > Content.REVIEWED_ON);
  assert.ok(
    Date.parse(`${Content.NEXT_REVIEW_ON}T23:59:59Z`) > Date.now(),
    "the legal-content review date has expired",
  );
  assert.match(Content.JURISDICTION, /Europea.*Espanya/);
  assert.match(Content.CONTENT_OWNER_ROLE, /ENTI-UB/);

  const sources = Object.values(Content.SOURCES);
  const officialHosts = new Set([
    "eur-lex.europa.eu",
    "digital-strategy.ec.europa.eu",
    "www.euipo.europa.eu",
    "www.cultura.gob.es",
  ]);
  assert.ok(sources.length >= 5);
  assert.equal(new Set(sources.map(({ id }) => id)).size, sources.length);
  assert.equal(new Set(sources.map(({ url }) => url)).size, sources.length);
  assert.deepEqual(
    Object.keys(Content.SOURCES).sort(),
    sources.map(({ id }) => id).sort(),
    "source registry keys must be the stable IDs used by dimensions and the UI",
  );
  for (const source of sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:");
    assert.ok(
      officialHosts.has(url.hostname),
      `${source.id} does not use an approved official host`,
    );
    assert.ok(source.title.length >= 20);
  }

  const sourceIds = new Set(sources.map(({ id }) => id));
  for (const dimension of Content.DIMENSIONS) {
    assert.ok(dimension.sourceIds.length >= 2);
    for (const sourceId of dimension.sourceIds) {
      assert.ok(sourceIds.has(sourceId), `${sourceId} is not a known source`);
    }
  }
});

test("prediction, transfer, and commitment stay concise", () => {
  assert.ok(Content.PREDICTIONS.length >= 3);
  assert.equal(Content.TRANSFER.choices.length, 4);
  assert.ok(
    Content.TRANSFER.choices.every(
      ({ feedback }) => typeof feedback === "string" && feedback.length >= 80,
    ),
  );
  assert.equal(Content.COMMITMENT_STANDARDS.length, 4);
  assert.equal(Content.CHECKLIST.length, 5);
  assert.equal("DIFFERENCE_REASONS" in Content, false);
  assert.equal("DISPOSITIONS" in Content, false);
  assert.equal("EVIDENCE_CHOICES" in Content, false);
});
