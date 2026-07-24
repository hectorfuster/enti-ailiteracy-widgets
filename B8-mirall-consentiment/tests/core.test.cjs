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
  state.originalStudioAnswers = Core.snapshotAnswers(
    state.studioAnswers,
    "studio",
  );
  state.originalCreatorAnswers = Core.snapshotAnswers(
    state.creatorAnswers,
    "creator",
  );
}

function completeState() {
  const state = Core.createInitialState("attempt-12345678");
  completeAnswers(state);
  for (const dimension of Content.DIMENSIONS) {
    state.reflections[dimension.id] = {
      reason: null,
      disposition: "maintain",
      note: "",
      reviewed: true,
    };
  }
  state.transferChoice = Content.TRANSFER.choices[0].id;
  state.transferReviewed = true;
  state.commitment.standard = Content.COMMITMENT_STANDARDS[0].id;
  state.commitment.evidence = Content.EVIDENCE_CHOICES[0].id;
  return state;
}

test("initial state is minimal and corrupt state is rejected", () => {
  const state = Core.createInitialState("attempt-12345678");
  assert.equal(state.screen, "intro");
  assert.deepEqual(state.studioAnswers, {});
  assert.equal(Core.canComplete(state), false);
  assert.throws(() => Core.createInitialState("short"), TypeError);
  assert.equal(Core.sanitiseState(null), null);
  assert.equal(Core.sanitiseState({ ...state, stateVersion: 999 }), null);
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

test("differences require a reason while matches accept a disposition", () => {
  const matched = Core.createInitialState("attempt-12345678");
  completeAnswers(matched);
  const dimensionId = Content.DIMENSIONS[0].id;
  matched.reflections[dimensionId] = {
    reason: null,
    disposition: "maintain",
    note: "",
    reviewed: true,
  };
  assert.equal(Core.reflectionComplete(matched, dimensionId), true);
  assert.equal(
    Core.resultForDimension(matched, dimensionId).id,
    "shared-principle",
  );

  const different = Core.createInitialState("attempt-12345678");
  completeAnswers(different, 0, 1);
  different.reflections[dimensionId] = {
    reason: null,
    disposition: "maintain",
    note: "",
    reviewed: true,
  };
  assert.equal(Core.reflectionComplete(different, dimensionId), false);
  different.reflections[dimensionId].reason = "affected-rights";
  assert.equal(Core.reflectionComplete(different, dimensionId), true);
  assert.equal(
    Core.resultForDimension(different, dimensionId).id,
    "difference-examined",
  );
});

test("uncertainty and revision are valid outcomes without a moral score", () => {
  const state = Core.createInitialState("attempt-12345678");
  completeAnswers(state, 3, 3);
  const dimensionId = Content.DIMENSIONS[0].id;
  state.reflections[dimensionId] = {
    reason: null,
    disposition: "pending",
    note: "",
    reviewed: true,
  };
  assert.equal(
    Core.resultForDimension(state, dimensionId).id,
    "need-information",
  );

  const original = state.studioAnswers[dimensionId];
  state.studioAnswers[dimensionId] = Content.DIMENSIONS[0].studio.choices[0].id;
  assert.notEqual(state.studioAnswers[dimensionId], original);
  assert.equal(Core.answersDifferFromOriginal(state, dimensionId), true);
});

test("completion requires every reflection, transfer review, and commitment", () => {
  const state = completeState();
  assert.equal(Core.canComplete(state), true);
  assert.deepEqual(Core.resultCounts(state), {
    shared: 5,
    examined: 0,
    revisit: 0,
    pending: 0,
  });
  state.reflections[Content.DIMENSIONS[2].id].reviewed = false;
  assert.equal(Core.canComplete(state), false);
});

test("sanitisation bounds notes and restores only coherent late screens", () => {
  const state = completeState();
  state.screen = "commitment";
  state.reflections[Content.DIMENSIONS[0].id].note = "x".repeat(500);
  state.commitment.note = "y".repeat(500);
  const restored = Core.sanitiseState(JSON.parse(JSON.stringify(state)));
  assert.ok(restored);
  assert.equal(restored.reflections[Content.DIMENSIONS[0].id].note.length, 220);
  assert.equal(restored.commitment.note.length, 300);
  assert.equal(Core.progressForState(restored).percent, 95);
});
