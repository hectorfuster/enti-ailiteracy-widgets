import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVITY_STEPS, ActivityFlow } from "../activity-flow.js";

test("a fresh activity exposes only the prediction step", () => {
  const flow = new ActivityFlow();

  assert.equal(flow.canEnter(ACTIVITY_STEPS.PREDICTION), true);
  for (const step of [
    ACTIVITY_STEPS.WORKED_CASE,
    ACTIVITY_STEPS.REFLECTION,
    ACTIVITY_STEPS.TRANSFER,
    ACTIVITY_STEPS.TAKEAWAY,
  ]) {
    assert.equal(flow.canEnter(step), false);
    assert.equal(flow.enter(step), false);
  }
  assert.equal(flow.currentStep, ACTIVITY_STEPS.PREDICTION);
});

test("each successful learning action unlocks exactly the next step", () => {
  const flow = new ActivityFlow();

  flow.revealPrediction();
  assert.equal(flow.enter(ACTIVITY_STEPS.WORKED_CASE), true);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.REFLECTION), false);

  flow.setWorkedCaseConfirmed(true);
  assert.equal(flow.enter(ACTIVITY_STEPS.REFLECTION), true);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.TRANSFER), false);

  assert.equal(flow.setReflectionCorrect(true), true);
  assert.equal(flow.enter(ACTIVITY_STEPS.TRANSFER), true);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.TAKEAWAY), false);

  assert.equal(flow.setTransferConfirmed(true), true);
  assert.equal(flow.enter(ACTIVITY_STEPS.TAKEAWAY), true);
  assert.equal(flow.completed, true);
});

test("invalid confirmations cannot bypass prerequisite learning actions", () => {
  const flow = new ActivityFlow();

  assert.equal(flow.setReflectionCorrect(true), false);
  assert.equal(flow.setTransferConfirmed(true), false);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.TRANSFER), false);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.TAKEAWAY), false);
});

test("invalidating an upstream answer closes its downstream gates", () => {
  const flow = new ActivityFlow();

  flow.revealPrediction();
  flow.setWorkedCaseConfirmed(true);
  flow.setReflectionCorrect(true);
  flow.setTransferConfirmed(true);
  flow.setWorkedCaseConfirmed(false);

  assert.equal(flow.workedCaseConfirmed, false);
  assert.equal(flow.reflectionCorrect, false);
  assert.equal(flow.transferConfirmed, false);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.REFLECTION), false);
});

test("learners may revisit earlier steps without losing valid progress", () => {
  const flow = new ActivityFlow();

  flow.revealPrediction();
  flow.enter(ACTIVITY_STEPS.WORKED_CASE);
  flow.setWorkedCaseConfirmed(true);
  flow.enter(ACTIVITY_STEPS.REFLECTION);
  flow.setReflectionCorrect(true);
  flow.enter(ACTIVITY_STEPS.TRANSFER);

  assert.equal(flow.enter(ACTIVITY_STEPS.WORKED_CASE), true);
  assert.equal(flow.enter(ACTIVITY_STEPS.TRANSFER), true);
});

test("trying another transfer case resets only the transfer gate", () => {
  const flow = new ActivityFlow();

  flow.revealPrediction();
  flow.setWorkedCaseConfirmed(true);
  flow.setReflectionCorrect(true);
  flow.setTransferConfirmed(true);
  flow.enter(ACTIVITY_STEPS.TAKEAWAY);
  flow.resetTransfer();

  assert.equal(flow.currentStep, ACTIVITY_STEPS.TRANSFER);
  assert.equal(flow.transferConfirmed, false);
  assert.equal(flow.reflectionCorrect, true);
  assert.equal(flow.completed, true);
  assert.equal(flow.canEnter(ACTIVITY_STEPS.TAKEAWAY), false);
});

test("invalid step identifiers never change flow state", () => {
  const flow = new ActivityFlow();
  const before = flow.snapshot();

  for (const step of [0, 1.5, 6, Number.NaN, "2"]) {
    assert.equal(flow.canEnter(step), false);
    assert.equal(flow.enter(step), false);
  }
  assert.deepEqual(flow.snapshot(), before);
  assert.equal(Object.isFrozen(before), true);
});
