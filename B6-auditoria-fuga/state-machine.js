(function initStateMachine(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.B6StateMachine = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createMachine() {
    "use strict";

    const PHASES = [
      "orientation",
      "triage",
      "dossier",
      "repair",
      "response",
      "complete",
    ];

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function initialState(storageVersion) {
      return {
        storageVersion,
        phase: "orientation",
        currentScenarioIndex: 0,
        answers: {},
        submittedAnswers: null,
        repairs: {},
        repairChecked: false,
        incidentSelections: [],
        transferChoice: null,
        responseChecked: false,
        incidentCorrect: false,
        transferCorrect: false,
        completed: false,
      };
    }

    function allPresent(ids, values) {
      return ids.every((id) => Boolean(values[id]));
    }

    function sameSet(left, right) {
      if (left.length !== right.length) return false;
      const rightSet = new Set(right);
      return left.every((value) => rightSet.has(value));
    }

    function transition(current, event, config) {
      const state = clone(current);
      const scenarioIds = config.scenarioIds;
      const choiceIds = new Set(config.choiceIds);
      const repairIds = config.repairIds;

      switch (event.type) {
        case "START":
          if (state.phase !== "orientation") return current;
          state.phase = "triage";
          return state;

        case "SET_SCENARIO": {
          if (state.phase !== "triage") return current;
          const index = Number(event.index);
          if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= scenarioIds.length
          ) {
            return current;
          }
          state.currentScenarioIndex = index;
          return state;
        }

        case "ANSWER_SCENARIO":
          if (
            state.phase !== "triage" ||
            !scenarioIds.includes(event.scenarioId) ||
            !choiceIds.has(event.choiceId)
          ) {
            return current;
          }
          state.answers[event.scenarioId] = event.choiceId;
          state.submittedAnswers = null;
          return state;

        case "SUBMIT_TRIAGE":
          if (
            state.phase !== "triage" ||
            !allPresent(scenarioIds, state.answers)
          ) {
            return current;
          }
          state.submittedAnswers = clone(state.answers);
          state.phase = "dossier";
          return state;

        case "REVISE_TRIAGE":
          if (
            !["dossier", "repair", "response", "complete"].includes(state.phase)
          )
            return current;
          state.phase = "triage";
          state.currentScenarioIndex = 0;
          state.submittedAnswers = null;
          state.repairs = {};
          state.repairChecked = false;
          state.incidentSelections = [];
          state.transferChoice = null;
          state.responseChecked = false;
          state.incidentCorrect = false;
          state.transferCorrect = false;
          state.completed = false;
          return state;

        case "START_REPAIR":
          if (state.phase !== "dossier" || !state.submittedAnswers)
            return current;
          state.phase = "repair";
          return state;

        case "ANSWER_REPAIR":
          if (
            state.phase !== "repair" ||
            !repairIds.includes(event.repairId) ||
            !event.optionId
          ) {
            return current;
          }
          state.repairs[event.repairId] = event.optionId;
          state.repairChecked = false;
          return state;

        case "CHECK_REPAIRS": {
          if (
            state.phase !== "repair" ||
            !allPresent(repairIds, state.repairs)
          ) {
            return current;
          }
          const correct = repairIds.every(
            (id) => state.repairs[id] === config.correctRepairs[id],
          );
          state.repairChecked = true;
          if (correct) {
            state.phase = "response";
            state.repairChecked = false;
          }
          return state;
        }

        case "SET_INCIDENT_SELECTIONS":
          if (state.phase !== "response") return current;
          state.incidentSelections = [
            ...new Set(
              event.optionIds.filter((id) =>
                config.incidentOptionIds.includes(id),
              ),
            ),
          ];
          state.responseChecked = false;
          state.incidentCorrect = false;
          return state;

        case "SET_TRANSFER":
          if (
            state.phase !== "response" ||
            !config.transferOptionIds.includes(event.optionId)
          ) {
            return current;
          }
          state.transferChoice = event.optionId;
          state.responseChecked = false;
          state.transferCorrect = false;
          return state;

        case "CHECK_RESPONSE": {
          if (
            state.phase !== "response" ||
            !state.transferChoice ||
            state.incidentSelections.length === 0
          ) {
            return current;
          }
          state.incidentCorrect = sameSet(
            state.incidentSelections,
            config.correctIncidentIds,
          );
          state.transferCorrect =
            state.transferChoice === config.correctTransferId;
          state.responseChecked = true;
          if (state.incidentCorrect && state.transferCorrect) {
            state.phase = "complete";
            state.completed = true;
          }
          return state;
        }

        case "RESET":
          return initialState(config.storageVersion);

        default:
          return current;
      }
    }

    function sanitize(candidate, config) {
      const fallback = initialState(config.storageVersion);
      if (
        !candidate ||
        candidate.storageVersion !== config.storageVersion ||
        !PHASES.includes(candidate.phase)
      ) {
        return fallback;
      }

      const state = fallback;
      state.answers = {};
      for (const id of config.scenarioIds) {
        if (config.choiceIds.includes(candidate.answers?.[id]))
          state.answers[id] = candidate.answers[id];
      }
      state.currentScenarioIndex = Math.max(
        0,
        Math.min(
          config.scenarioIds.length - 1,
          Number.isInteger(candidate.currentScenarioIndex)
            ? candidate.currentScenarioIndex
            : 0,
        ),
      );

      const triageComplete = allPresent(config.scenarioIds, state.answers);
      state.phase =
        candidate.phase === "orientation"
          ? "orientation"
          : triageComplete
            ? candidate.phase
            : "triage";

      if (["dossier", "repair", "response", "complete"].includes(state.phase)) {
        state.submittedAnswers = clone(state.answers);
      }

      for (const id of config.repairIds) {
        const optionId = candidate.repairs?.[id];
        if (optionId) state.repairs[id] = optionId;
      }
      const repairsCorrect = config.repairIds.every(
        (id) => state.repairs[id] === config.correctRepairs[id],
      );
      if (["response", "complete"].includes(state.phase) && !repairsCorrect) {
        state.phase = "repair";
      }

      state.incidentSelections = [
        ...new Set(
          (candidate.incidentSelections || []).filter((id) =>
            config.incidentOptionIds.includes(id),
          ),
        ),
      ];
      state.transferChoice = config.transferOptionIds.includes(
        candidate.transferChoice,
      )
        ? candidate.transferChoice
        : null;
      state.incidentCorrect = sameSet(
        state.incidentSelections,
        config.correctIncidentIds,
      );
      state.transferCorrect = state.transferChoice === config.correctTransferId;

      if (
        state.phase === "complete" &&
        !(state.incidentCorrect && state.transferCorrect)
      ) {
        state.phase = "response";
      }
      state.completed = state.phase === "complete";
      state.responseChecked = Boolean(
        candidate.responseChecked && state.phase === "response",
      );
      return state;
    }

    function progressForPhase(phase) {
      return Math.max(0, PHASES.indexOf(phase));
    }

    return Object.freeze({
      PHASES,
      initialState,
      progressForPhase,
      sanitize,
      transition,
    });
  },
);
