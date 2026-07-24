const assert = require("node:assert/strict");
const test = require("node:test");

const data = require("../scenario-data.js");
const machine = require("../state-machine.js");

const config = {
  storageVersion: data.STORAGE_VERSION,
  scenarioIds: data.SCENARIOS.map((scenario) => scenario.id),
  choiceIds: data.CHOICES.map((choice) => choice.id),
  repairIds: data.REPAIR_CASES.map((repair) => repair.id),
  correctRepairs: Object.fromEntries(
    data.REPAIR_CASES.map((repair) => [
      repair.id,
      repair.options.find((option) => option.correct).id,
    ]),
  ),
  incidentOptionIds: data.INCIDENT_OPTIONS.map((option) => option.id),
  correctIncidentIds: data.INCIDENT_OPTIONS.filter(
    (option) => option.correct,
  ).map((option) => option.id),
  transferOptionIds: data.TRANSFER.options.map((option) => option.id),
  correctTransferId: data.TRANSFER.options.find((option) => option.correct).id,
};

function answerAll(state) {
  let next = state;
  for (const scenario of data.SCENARIOS) {
    next = machine.transition(
      next,
      {
        type: "ANSWER_SCENARIO",
        scenarioId: scenario.id,
        choiceId: scenario.correctChoice,
      },
      config,
    );
  }
  return next;
}

function completeRepairs(state) {
  let next = state;
  for (const [repairId, optionId] of Object.entries(config.correctRepairs)) {
    next = machine.transition(
      next,
      { type: "ANSWER_REPAIR", repairId, optionId },
      config,
    );
  }
  return machine.transition(next, { type: "CHECK_REPAIRS" }, config);
}

test("rejects invalid or premature transitions", () => {
  const initial = machine.initialState(data.STORAGE_VERSION);
  assert.equal(
    machine.transition(initial, { type: "SUBMIT_TRIAGE" }, config),
    initial,
  );
  assert.equal(
    machine.transition(
      initial,
      {
        type: "ANSWER_SCENARIO",
        scenarioId: "no-existeix",
        choiceId: "send",
      },
      config,
    ),
    initial,
  );
  assert.equal(
    machine.transition(initial, { type: "START_REPAIR" }, config),
    initial,
  );
});

test("creates an immutable submitted snapshot", () => {
  let state = machine.initialState(data.STORAGE_VERSION);
  state = machine.transition(state, { type: "START" }, config);
  state = answerAll(state);
  const submitted = machine.transition(
    state,
    { type: "SUBMIT_TRIAGE" },
    config,
  );
  assert.equal(submitted.phase, "dossier");
  assert.deepEqual(submitted.submittedAnswers, submitted.answers);
  assert.notEqual(submitted.submittedAnswers, submitted.answers);
});

test("revising triage invalidates every downstream result", () => {
  let state = machine.initialState(data.STORAGE_VERSION);
  state = machine.transition(state, { type: "START" }, config);
  state = answerAll(state);
  state = machine.transition(state, { type: "SUBMIT_TRIAGE" }, config);
  state = machine.transition(state, { type: "START_REPAIR" }, config);
  state = completeRepairs(state);
  state = machine.transition(
    state,
    {
      type: "SET_INCIDENT_SELECTIONS",
      optionIds: config.correctIncidentIds,
    },
    config,
  );
  state = machine.transition(
    state,
    { type: "SET_TRANSFER", optionId: config.correctTransferId },
    config,
  );
  state = machine.transition(state, { type: "CHECK_RESPONSE" }, config);
  assert.equal(state.phase, "complete");

  const revised = machine.transition(state, { type: "REVISE_TRIAGE" }, config);
  assert.equal(revised.phase, "triage");
  assert.equal(revised.submittedAnswers, null);
  assert.deepEqual(revised.repairs, {});
  assert.deepEqual(revised.incidentSelections, []);
  assert.equal(revised.completed, false);
});

test("requires the exact incident action set and correct transfer answer", () => {
  let state = machine.initialState(data.STORAGE_VERSION);
  state = machine.transition(state, { type: "START" }, config);
  state = answerAll(state);
  state = machine.transition(state, { type: "SUBMIT_TRIAGE" }, config);
  state = machine.transition(state, { type: "START_REPAIR" }, config);
  state = completeRepairs(state);
  assert.equal(state.phase, "response");

  state = machine.transition(
    state,
    {
      type: "SET_INCIDENT_SELECTIONS",
      optionIds: [...config.correctIncidentIds, "ignore"],
    },
    config,
  );
  state = machine.transition(
    state,
    { type: "SET_TRANSFER", optionId: config.correctTransferId },
    config,
  );
  state = machine.transition(state, { type: "CHECK_RESPONSE" }, config);
  assert.equal(state.phase, "response");
  assert.equal(state.incidentCorrect, false);
  assert.equal(state.transferCorrect, true);

  state = machine.transition(
    state,
    {
      type: "SET_INCIDENT_SELECTIONS",
      optionIds: config.correctIncidentIds,
    },
    config,
  );
  state = machine.transition(state, { type: "CHECK_RESPONSE" }, config);
  assert.equal(state.phase, "complete");
  assert.equal(state.completed, true);
});

test("sanitization refuses forged completion", () => {
  const forged = {
    ...machine.initialState(data.STORAGE_VERSION),
    phase: "complete",
    completed: true,
    answers: Object.fromEntries(
      data.SCENARIOS.map((scenario) => [scenario.id, scenario.correctChoice]),
    ),
    repairs: {},
    incidentSelections: [],
    transferChoice: null,
  };
  const sanitized = machine.sanitize(forged, config);
  assert.equal(sanitized.phase, "repair");
  assert.equal(sanitized.completed, false);
});

test("progress maps the six states to five completed steps", () => {
  assert.equal(machine.progressForPhase("orientation"), 0);
  assert.equal(machine.progressForPhase("triage"), 1);
  assert.equal(machine.progressForPhase("dossier"), 2);
  assert.equal(machine.progressForPhase("repair"), 3);
  assert.equal(machine.progressForPhase("response"), 4);
  assert.equal(machine.progressForPhase("complete"), 5);
});
