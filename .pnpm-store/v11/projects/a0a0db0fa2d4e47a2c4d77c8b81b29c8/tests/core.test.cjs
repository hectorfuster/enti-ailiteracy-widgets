const test = require("node:test");
const assert = require("node:assert/strict");
const Content = require("../content.js");
const Core = require("../mirror-core.js");

function completeAnswers(state, studioIndex = 0, creatorIndex = 0) {
  for (const dimension of Content.DIMENSIONS) {
    state.studioAnswers[dimension.id] =
      dimension.studio.choices[studioIndex].id;
    state.creatorAnswers[dimension.id] =
      dimension.creator.choices[creatorIndex].id;
  }
}

function completeState() {
  const state = Core.createInitialState("attempt-12345678");
  completeAnswers(state);
  state.prediction = Content.PREDICTIONS[0].id;
  state.mirrorReviewed = true;
  state.transferChoice = Content.TRANSFER.choices[0].id;
  state.transferReviewed = true;
  state.commitment.standard = Content.COMMITMENT_STANDARDS[0].id;
  return state;
}

test("initial state is small and old or corrupt state is rejected", () => {
  const state = Core.createInitialState("attempt-12345678");
  assert.equal(state.screen, "intro");
  assert.deepEqual(state.studioAnswers, {});
  assert.equal(state.mirrorReviewed, false);
  assert.equal(Core.canComplete(state), false);
  assert.equal("reflections" in state, false);
  assert.equal("revisions" in state, false);
  assert.equal("note" in state.commitment, false);
  assert.throws(() => Core.createInitialState("short"), TypeError);
  assert.equal(Core.sanitiseState(null), null);
  assert.equal(Core.sanitiseState({ ...state, stateVersion: 1 }), null);
  assert.equal(Core.sanitiseState({ ...state, screen: "mirror" }), null);
});

test("all 80 reciprocal pairs are classified by policy, not display index", () => {
  for (const dimension of Content.DIMENSIONS) {
    for (const studioChoice of dimension.studio.choices) {
      for (const creatorChoice of dimension.creator.choices) {
        const state = Core.createInitialState("attempt-12345678");
        state.studioAnswers[dimension.id] = studioChoice.id;
        state.creatorAnswers[dimension.id] = creatorChoice.id;
        const comparison = Core.baseComparison(state, dimension.id);
        const expected =
          studioChoice.policy === "need-evidence" ||
          creatorChoice.policy === "need-evidence"
            ? "need-information"
            : studioChoice.policy === creatorChoice.policy
              ? "same-principle"
              : "different";
        assert.equal(
          comparison,
          expected,
          `${dimension.id}: ${studioChoice.id} / ${creatorChoice.id}`,
        );
      }
    }
  }
});

test("the mirror reports neutral outcomes without a moral score", () => {
  const shared = Core.createInitialState("attempt-12345678");
  completeAnswers(shared);
  assert.equal(
    Core.resultForDimension(shared, Content.DIMENSIONS[0].id).id,
    "shared-principle",
  );

  const different = Core.createInitialState("attempt-12345678");
  completeAnswers(different, 0, 1);
  assert.equal(
    Core.resultForDimension(different, Content.DIMENSIONS[0].id).id,
    "application-different",
  );

  const pending = Core.createInitialState("attempt-12345678");
  completeAnswers(pending, 3, 3);
  assert.equal(
    Core.resultForDimension(pending, Content.DIMENSIONS[0].id).id,
    "need-information",
  );
});

test("completion requires one mirror review, transfer review, and one standard", () => {
  const state = completeState();
  assert.equal(Core.canComplete(state), true);
  assert.deepEqual(Core.resultCounts(state), {
    shared: 5,
    different: 0,
    pending: 0,
  });

  state.mirrorReviewed = false;
  assert.equal(Core.canComplete(state), false);
  state.mirrorReviewed = true;
  state.commitment.standard = null;
  assert.equal(Core.canComplete(state), false);
});

test("sanitisation restores only coherent late screens", () => {
  const state = completeState();
  state.screen = "commitment";
  const restored = Core.sanitiseState(JSON.parse(JSON.stringify(state)));
  assert.ok(restored);
  assert.deepEqual(restored.commitment, {
    standard: Content.COMMITMENT_STANDARDS[0].id,
  });
  assert.equal(Core.progressForState(restored).percent, 94);

  const incoherent = JSON.parse(JSON.stringify(state));
  incoherent.mirrorReviewed = false;
  assert.equal(Core.sanitiseState(incoherent), null);
});
