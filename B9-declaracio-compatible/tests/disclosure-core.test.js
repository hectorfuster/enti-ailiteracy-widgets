import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_CONVENTION,
  DISCLOSURE_GROUPS,
  LONG_VAGUE_SELECTIONS,
  TRANSFER_SCENARIOS,
  WORKED_SCENARIO,
  WORLDS,
} from "../content.js";
import {
  buildDeclaration,
  clauseMatchesWorld,
  compareWorldSets,
  compatibleWorlds,
  evaluateDisclosure,
  getOption,
  validateContent,
} from "../disclosure-core.js";

const scenarios = [WORKED_SCENARIO, ...TRANSFER_SCENARIOS];

function evaluate(targetWorldId, selections) {
  return evaluateDisclosure({
    worlds: WORLDS,
    groups: DISCLOSURE_GROUPS,
    selections,
    targetWorldId,
    requiredGroupIds: ACTIVITY_CONVENTION.requiredGroupIds,
  });
}

function allSelections(groups, index = 0, current = {}) {
  if (index === groups.length) {
    return [{ ...current }];
  }

  const group = groups[index];
  return group.options.flatMap((option) =>
    allSelections(groups, index + 1, {
      ...current,
      [group.id]: option.id,
    }),
  );
}

test("content schema and every recommended path validate", () => {
  const errors = validateContent({
    worlds: WORLDS,
    groups: DISCLOSURE_GROUPS,
    policy: ACTIVITY_CONVENTION,
    scenarios,
  });
  assert.deepEqual(errors, []);
});

test("all scenario recommendations are truthful, complete, and precise", () => {
  for (const scenario of scenarios) {
    const result = evaluate(
      scenario.targetWorldId,
      scenario.recommendedSelections,
    );
    assert.equal(result.state, "precise", scenario.id);
    assert.equal(result.success, true, scenario.id);
    assert.equal(result.compatible.length, 1, scenario.id);
    assert.equal(result.compatible[0].id, scenario.targetWorldId, scenario.id);
  }
});

test("candidate uniqueness cannot pass without all required fields", () => {
  const result = evaluate("outline-own-text", {
    extent: "extent-outline-only",
  });
  assert.equal(result.compatible.length, 1);
  assert.equal(result.truthful, true);
  assert.equal(result.complete, false);
  assert.equal(result.state, "incomplete");
  assert.equal(result.success, false);
});

test("a declaration without explicit AI use cannot pass", () => {
  const result = evaluate("outline-own-text", {
    tool: "tool-none",
    purpose: "purpose-structure",
    extent: "extent-outline-only",
    human: "human-outline",
  });
  assert.equal(result.truthful, true);
  assert.equal(result.specific, true);
  assert.equal(result.complete, false);
  assert.equal(result.state, "incomplete");
});

test("a precise declaration for the wrong world is a contradiction, not success", () => {
  const result = evaluate("outline-own-text", {
    tool: "tool-generic",
    purpose: "purpose-translate",
    extent: "extent-translation",
    human: "human-translation",
  });
  assert.equal(result.compatible.length, 1);
  assert.equal(result.compatible[0].id, "translation");
  assert.equal(result.truthful, false);
  assert.equal(result.state, "contradiction");
  assert.equal(result.success, false);
  assert.ok(result.falseClauses.length >= 1);
});

test("zero compatible worlds always produce an explicit contradiction", () => {
  const result = evaluate("outline-own-text", {
    tool: "tool-generic",
    purpose: "purpose-translate",
    extent: "extent-outline-only",
    human: "human-reviewed",
  });
  assert.equal(result.compatible.length, 0);
  assert.equal(result.state, "contradiction");
  assert.equal(result.success, false);
});

test("the long vague preset is complete and truthful but remains ambiguous", () => {
  const result = evaluate("outline-own-text", LONG_VAGUE_SELECTIONS);
  assert.equal(result.truthful, true);
  assert.equal(result.complete, true);
  assert.equal(result.state, "ambiguous");
  assert.ok(result.compatible.length > 1);
});

test("a vague required field cannot pass even after other fields isolate the target", () => {
  const result = evaluate("outline-own-text", {
    tool: "tool-generic",
    purpose: "purpose-structure",
    extent: "extent-outline-only",
    human: "human-reviewed",
  });

  assert.equal(result.truthful, true);
  assert.equal(result.complete, true);
  assert.equal(result.compatible.length, 1);
  assert.deepEqual(result.vagueGroupIds, ["human"]);
  assert.equal(result.specific, false);
  assert.equal(result.success, false);
  assert.equal(result.state, "ambiguous");
});

test("tool provenance and generic review do not separate the teaching cases", () => {
  const tool = getOption(
    DISCLOSURE_GROUPS,
    "tool",
    "tool-provenance",
  );
  const review = getOption(
    DISCLOSURE_GROUPS,
    "human",
    "human-reviewed",
  );
  assert.ok(WORLDS.every((world) => clauseMatchesWorld(tool, world)));
  assert.ok(WORLDS.every((world) => clauseMatchesWorld(review, world)));
});

test("structure purpose separates structure work but not generated prose", () => {
  const compatible = compatibleWorlds(WORLDS, DISCLOSURE_GROUPS, {
    purpose: "purpose-structure",
  });
  assert.deepEqual(
    compatible.map((world) => world.id),
    ["outline-own-text", "outline-and-section"],
  );
});

test("set comparison reports removed and reopened worlds", () => {
  const all = [...WORLDS];
  const narrowed = compatibleWorlds(WORLDS, DISCLOSURE_GROUPS, {
    purpose: "purpose-structure",
  });
  const narrowedTransition = compareWorldSets(all, narrowed);
  assert.equal(narrowedTransition.removed.length, 6);
  assert.equal(narrowedTransition.reopened.length, 0);

  const reopenedTransition = compareWorldSets(narrowed, all);
  assert.equal(reopenedTransition.removed.length, 0);
  assert.equal(reopenedTransition.reopened.length, 6);
});

test("sentence generation uses complete standalone sentences", () => {
  const declaration = buildDeclaration(
    DISCLOSURE_GROUPS,
    WORKED_SCENARIO.recommendedSelections,
  );
  assert.match(declaration, /^He fet servir/);
  assert.match(declaration, /La finalitat/);
  assert.match(declaration, /La intervenció/);
  assert.match(declaration, /Jo vaig/);
  assert.doesNotMatch(declaration, /(^|[.!?]\s+)Ho\b/);
  assert.ok(declaration.endsWith("."));
});

test("every world has at least one truthful, complete, unique declaration", () => {
  const combinations = allSelections(DISCLOSURE_GROUPS);
  for (const world of WORLDS) {
    const solution = combinations.find(
      (selections) => evaluate(world.id, selections).success,
    );
    assert.ok(solution, `No complete unique declaration for ${world.id}`);
  }
});

test("exhaustive combinations never hide a zero-world or wrong-world success", () => {
  const combinations = allSelections(DISCLOSURE_GROUPS);
  for (const target of WORLDS) {
    for (const selections of combinations) {
      const result = evaluate(target.id, selections);
      if (result.compatible.length === 0) {
        assert.equal(result.state, "contradiction");
      }
      if (result.success) {
        assert.equal(result.truthful, true);
        assert.equal(result.complete, true);
        assert.equal(result.compatible.length, 1);
        assert.equal(result.compatible[0].id, target.id);
      }
    }
  }
});
