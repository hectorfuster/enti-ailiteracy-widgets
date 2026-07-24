const assert = require("node:assert/strict");
const test = require("node:test");

const data = require("../scenario-data.js");
const engine = require("../inference-engine.js");

const correctAnswers = Object.fromEntries(
  data.SCENARIOS.map((scenario) => [scenario.id, scenario.correctChoice]),
);
const allSend = Object.fromEntries(
  data.SCENARIOS.map((scenario) => [scenario.id, "send"]),
);

test("validates the complete teaching dataset", () => {
  assert.deepEqual(engine.validateContent(data), []);
  assert.equal(data.SCENARIOS.length, 9);
  assert.equal(
    data.INFERENCES.filter((inference) => inference.kind === "cumulative")
      .length,
    4,
  );
});

test("the original history activates every documented conclusion", () => {
  const result = engine.evaluateExposure(
    data.SCENARIOS,
    data.INFERENCES,
    {},
    "original",
  );
  assert.equal(result.activeInferences.length, data.INFERENCES.length);
  assert.ok(result.directDisclosures.length >= 10);
});

test("the reference decisions expose no original project clue to the public service", () => {
  const result = engine.evaluateExposure(
    data.SCENARIOS,
    data.INFERENCES,
    correctAnswers,
  );
  assert.deepEqual(result.activeInferences, []);
  assert.deepEqual(result.directDisclosures, []);
  assert.deepEqual(result.exposedScenarioIds, ["astar"]);
});

test("a project-owner inference survives one redundant path but not both", () => {
  const withEverything = engine.evaluateInferences(
    data.SCENARIOS,
    data.INFERENCES,
    allSend,
  );
  const owner = withEverything.find(
    (inference) => inference.id === "project-owner",
  );
  assert.equal(owner.active, true);
  assert.equal(owner.activePathCount, 2);

  const stackStopped = {
    ...allSend,
    "stack-trace": "minimize",
  };
  const ownerViaStore = engine
    .evaluateInferences(data.SCENARIOS, data.INFERENCES, stackStopped)
    .find((inference) => inference.id === "project-owner");
  assert.equal(ownerViaStore.active, true);
  assert.equal(ownerViaStore.activePathCount, 1);

  const bothProjectSourcesStopped = {
    ...stackStopped,
    "store-copy": "approved",
  };
  const ownerStopped = engine
    .evaluateInferences(
      data.SCENARIOS,
      data.INFERENCES,
      bothProjectSourcesStopped,
    )
    .find((inference) => inference.id === "project-owner");
  assert.equal(ownerStopped.active, false);
});

test("multi-clue conclusions do not activate from a single clue", () => {
  for (const inference of data.INFERENCES.filter(
    (item) => item.kind === "cumulative",
  )) {
    for (const path of inference.evidenceRules) {
      assert.ok(path.allOf.length >= 2);
      for (const clueId of path.allOf) {
        const onlyOneScenario = data.SCENARIOS.find((scenario) =>
          scenario.clues.some((clue) => clue.id === clueId),
        );
        const answers = Object.fromEntries(
          data.SCENARIOS.map((scenario) => [
            scenario.id,
            scenario.id === onlyOneScenario.id ? "send" : "block",
          ]),
        );
        const result = engine
          .evaluateInferences(data.SCENARIOS, data.INFERENCES, answers)
          .find((item) => item.id === inference.id);
        assert.equal(
          result.active,
          false,
          `${inference.id} activated from ${clueId} alone`,
        );
      }
    }
  }
});

test("removing either clue interrupts the portable-platform inference", () => {
  const inference = (answers) =>
    engine
      .evaluateInferences(data.SCENARIOS, data.INFERENCES, answers)
      .find((item) => item.id === "portable-port");

  assert.equal(inference(allSend).active, true);
  assert.equal(
    inference({ ...allSend, "hardware-math": "depends" }).active,
    false,
  );
  assert.equal(
    inference({ ...allSend, "meeting-notes": "approved" }).active,
    false,
  );
});

test("answer summaries are derived from source data", () => {
  assert.deepEqual(engine.answerSummary(data.SCENARIOS, correctAnswers), {
    aligned: data.SCENARIOS.length,
    answered: data.SCENARIOS.length,
    paused: data.SCENARIOS.length - 1,
    total: data.SCENARIOS.length,
  });
  assert.equal(
    engine.answerSummary(data.SCENARIOS, { astar: "send" }).answered,
    1,
  );
});

test("validation detects a missing inference clue", () => {
  const broken = {
    ...data,
    INFERENCES: [
      {
        ...data.INFERENCES[0],
        evidenceRules: [
          {
            id: "broken-path",
            label: "Via trencada",
            allOf: ["no-existeix", "student-identity"],
          },
        ],
      },
      ...data.INFERENCES.slice(1),
    ],
  };
  assert.ok(
    engine
      .validateContent(broken)
      .some((message) => message.includes("no-existeix")),
  );
});
