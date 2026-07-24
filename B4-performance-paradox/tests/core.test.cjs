const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../b4-core.js");

test("counterbalances assistance mode across both mechanics", () => {
  assert.deepEqual(Core.practiceSequence("a"), [
    { mechanicId: "stacking", mode: "direct" },
    { mechanicId: "critical", mode: "guided" },
  ]);
  assert.deepEqual(Core.practiceSequence("b"), [
    { mechanicId: "stacking", mode: "guided" },
    { mechanicId: "critical", mode: "direct" },
  ]);
  for (const mechanicId of Core.MECHANIC_IDS) {
    assert.notEqual(
      Core.practiceModeFor("a", mechanicId),
      Core.practiceModeFor("b", mechanicId),
    );
  }
});

test("question keys match independently calculated values", () => {
  const calculated = {
    "baseline-stacking": 120 * 0.8 * 0.75,
    "transfer-stacking": 160 * 0.75 * 0.8,
    "baseline-critical": 16 * 2 * (1 + 0.25 * (2 - 1)),
    "transfer-critical": 30 * 1.5 * (1 + 0.2 * (2 - 1)),
  };
  for (const mechanic of Object.values(Core.MECHANICS)) {
    for (const phase of ["baseline", "transfer"]) {
      const question = mechanic[phase];
      const correctLabel = Core.optionLabel(question, question.correct);
      const displayedNumber = Number(
        correctLabel.replace(",", ".").match(/\d+(?:\.\d+)?/)[0],
      );
      assert.equal(displayedNumber, calculated[question.id]);
    }
  }
});

test("the simulated reliability recommendation is wrong and the correction is six seconds", () => {
  assert.notEqual(Core.RELIABILITY.assistantPick, Core.RELIABILITY.correct);
  assert.equal(
    Core.optionLabel(Core.RELIABILITY, Core.RELIABILITY.correct),
    "6 segons",
  );
  assert.equal(10 * 0.8 * 0.75, 6);
});

test("scores baseline and transfer without treating practice completion as evidence", () => {
  const state = Core.createInitialState(2, "a");
  state.baseline.stacking = { answer: "b", confidence: 3 };
  state.baseline.critical = { answer: "a", confidence: 3 };
  state.transfer.stacking = { answer: "b", confidence: 2 };
  state.transfer.critical = { answer: "c", confidence: 2 };
  state.practice.stacking.complete = true;
  state.practice.critical.complete = true;

  assert.equal(Core.scorePhase(state, "baseline"), 1);
  assert.equal(Core.scorePhase(state, "transfer"), 2);
  assert.equal(Core.scorePhase(state, "practice"), 0);
});

test("describes reliability changes without attributing influence when answers already agree", () => {
  const state = Core.createInitialState();
  state.reliability.initial = { answer: "a", confidence: 3 };
  state.reliability.final = { answer: "a", confidence: 3 };
  assert.equal(Core.reliabilityOutcome(state), "agreed-throughout");

  state.reliability.initial = { answer: "b", confidence: 3 };
  assert.equal(Core.reliabilityOutcome(state), "swayed-from-correct");

  state.reliability.final = { answer: "b", confidence: 2 };
  assert.equal(Core.reliabilityOutcome(state), "held-correct");
});

test("summarises high-confidence errors separately from low-confidence correct answers", () => {
  const state = Core.createInitialState();
  state.transfer.stacking = { answer: "a", confidence: 3 };
  state.transfer.critical = { answer: "c", confidence: 1 };
  state.reliability.final = { answer: "b", confidence: 2 };

  assert.deepEqual(Core.calibrationSummary(state), {
    total: 3,
    correct: 2,
    highConfidenceErrors: 1,
    lowConfidenceCorrect: 1,
  });
});

test("sanitises persisted state and rejects unknown schema versions or screens", () => {
  const original = Core.createInitialState(5, "b");
  original.screen = "transfer";
  original.baselineIndex = 99;
  original.baseline.stacking = { answer: "b", confidence: 3 };
  original.baseline.critical = { answer: "<script>", confidence: 99 };
  const restored = Core.sanitiseState(JSON.parse(JSON.stringify(original)));

  assert.equal(restored.variant, "b");
  assert.equal(restored.screen, "transfer");
  assert.equal(restored.baselineIndex, 2);
  assert.deepEqual(restored.baseline.stacking, {
    answer: "b",
    confidence: 3,
  });
  assert.equal(restored.baseline.critical, undefined);
  assert.equal(Core.sanitiseState({ ...original, version: 999 }), null);
  assert.equal(Core.sanitiseState({ ...original, screen: "admin" }), null);
});

test("progress is monotonic across the canonical activity path", () => {
  const state = Core.createInitialState();
  const path = [
    "intro",
    "baseline",
    "practice-intro",
    "practice",
    "transfer-intro",
    "transfer",
    "reliability-intro",
    "reliability-initial",
    "reliability-review",
    "reliability-feedback",
    "debrief",
    "reflection",
    "commitment",
    "complete",
  ];
  const values = path.map((screen) => {
    state.screen = screen;
    return Core.progressForState(state).percent;
  });
  assert.deepEqual(
    values,
    [...values].sort((left, right) => left - right),
  );
  assert.equal(values.at(-1), 100);
});
