"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Data = require("../scenario-data.js");
const Core = require("../brief-core.js");

function priorityPairs() {
  const pairs = [];
  for (let left = 0; left < Core.DIMENSION_IDS.length; left++) {
    for (let right = left + 1; right < Core.DIMENSION_IDS.length; right++) {
      pairs.push([Core.DIMENSION_IDS[left], Core.DIMENSION_IDS[right]]);
    }
  }
  return pairs;
}

test("uses the five canonical course dimensions exactly once", () => {
  assert.deepEqual(
    Data.DIMENSIONS.map((dimension) => dimension.id),
    ["cost", "privacy", "transparency", "capacity", "control"],
  );
  assert.deepEqual(Core.validateData(), []);
});

test("computes the stated worst-case sampling uncertainty", () => {
  const margin = Core.samplingMargin(40_000, 200);
  assert.ok(margin > 0.069 && margin < 0.0692);
  assert.equal(Core.samplingMargin(100, 101), null);
  assert.equal(Core.samplingMargin(100, 0), null);
});

test("evaluates every authored round combination without missing feedback", () => {
  const validStatuses = new Set(Object.keys(Data.STATUS));
  let combinations = 0;

  Data.ROUNDS.forEach((round, roundIndex) => {
    for (const priorities of priorityPairs()) {
      for (const question of round.questions) {
        for (const workflow of round.workflows) {
          for (const safeguard of round.safeguards) {
            const result = Core.evaluateRound(roundIndex, {
              priorities,
              question: question.id,
              workflow: workflow.id,
              safeguard: safeguard.id,
              committed: true,
            });
            combinations += 1;
            assert.ok(result);
            assert.ok(validStatuses.has(result.status));
            for (const field of [
              "statusLabel",
              "statusTitle",
              "alignment",
              "evidence",
              "benefit",
              "tradeoff",
              "safeguardEffect",
              "reconsider",
            ]) {
              assert.equal(typeof result[field], "string");
              assert.ok(result[field].length > 0, `${round.id}:${field}`);
              assert.doesNotMatch(result[field], /undefined|null/);
            }
          }
        }
      }
    }
  });

  assert.equal(combinations, 1_920);
});

test("models conditional privacy rather than open-versus-closed ideology", () => {
  const base = {
    priorities: ["privacy", "capacity"],
    question: "approval",
    workflow: "consumer",
    committed: true,
  };
  assert.equal(
    Core.evaluateRound(0, { ...base, safeguard: "pilot" }).status,
    "invalid",
  );
  assert.equal(
    Core.evaluateRound(0, { ...base, safeguard: "minimise" }).status,
    "defensible",
  );
  assert.equal(
    Core.evaluateRound(0, {
      ...base,
      workflow: "local",
      safeguard: "pilot",
    }).status,
    "proportionate",
  );
});

test("does not label a random sample as inherently invalid or biased", () => {
  const result = Core.evaluateRound(2, {
    priorities: ["cost", "control"],
    question: "sample",
    workflow: "random-only",
    safeguard: "stratify",
    committed: true,
  });
  assert.equal(result.status, "defensible");
  assert.match(result.evidence, /±6,9/);
  assert.doesNotMatch(
    `${result.benefit} ${result.tradeoff}`,
    /no representa|esbiaixat/,
  );
});

test("sanitises partial state and rejects corrupt versions", () => {
  assert.equal(Core.sanitiseState({ version: 999 }), null);

  const raw = Core.createInitialState();
  raw.screen = "round-workflow";
  raw.rounds[0].priorities = ["privacy", "privacy", "bogus"];
  raw.rounds[0].question = "bogus";
  raw.rounds[1].committed = true;
  const safe = Core.sanitiseState(raw);
  assert.equal(safe.screen, "round-priority");
  assert.deepEqual(safe.rounds[0].priorities, ["privacy"]);
  assert.deepEqual(safe.rounds[1], {
    priorities: [],
    question: null,
    workflow: null,
    safeguard: null,
    committed: false,
  });
});

test("restores only sequentially committed rounds", () => {
  const raw = Core.createInitialState();
  raw.rounds[0] = {
    priorities: ["privacy", "capacity"],
    question: "quality",
    workflow: "local",
    safeguard: "pilot",
    committed: true,
  };
  raw.roundIndex = 1;
  raw.screen = "round-question";
  raw.rounds[1].priorities = ["capacity", "privacy"];
  const safe = Core.sanitiseState(raw);
  assert.equal(safe.roundIndex, 1);
  assert.equal(safe.screen, "round-question");
  assert.equal(safe.rounds[0].committed, true);
  assert.deepEqual(safe.rounds[1].priorities, ["capacity", "privacy"]);
});

test("evaluates every transfer combination and distinguishes evidence triggers", () => {
  const validStatuses = new Set(Object.keys(Data.STATUS));
  let combinations = 0;
  for (const priorities of priorityPairs()) {
    for (const question of Data.TRANSFER.questions) {
      for (const workflow of Data.TRANSFER.workflows) {
        for (const safeguard of Data.TRANSFER.safeguards) {
          for (const trigger of Data.TRANSFER.triggers) {
            const result = Core.evaluateTransfer({
              priorities,
              question: question.id,
              workflow: workflow.id,
              safeguard: safeguard.id,
              trigger: trigger.id,
              complete: true,
            });
            combinations += 1;
            assert.ok(result);
            assert.ok(validStatuses.has(result.status));
            assert.ok(result.summary.length > 0);
            assert.ok(result.feedback.length > 0);
            assert.ok(result.safeguardEffect.length > 0);
            assert.ok(result.triggerComment.length > 0);
          }
        }
      }
    }
  }
  assert.equal(combinations, 2_560);

  const strong = Core.evaluateTransfer({
    priorities: ["privacy", "control"],
    question: "policy",
    workflow: "separate-lanes",
    safeguard: "data-gate",
    trigger: "measured-change",
    complete: true,
  });
  assert.equal(strong.status, "proportionate");
  assert.match(strong.triggerComment, /mesurable/);
});

test("reports stable semantic progress", () => {
  const state = Core.createInitialState();
  assert.deepEqual(Core.progressForState(state), {
    step: 1,
    label: "Les cinc dimensions",
    percent: 0,
    detail: "Introducció",
  });
  state.screen = "round-commit";
  state.roundIndex = 2;
  assert.equal(Core.progressForState(state).percent, 66);
  state.screen = "complete";
  state.completed = true;
  assert.equal(Core.progressForState(state).percent, 100);
});
