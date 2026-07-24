(function initialiseBriefCore(globalScope, factory) {
  "use strict";

  let data = globalScope.B7Data;
  if (!data && typeof module !== "undefined" && module.exports) {
    data = require("./scenario-data.js");
  }

  const api = factory(data);
  globalScope.B7Core = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildCore(Data) {
    "use strict";

    if (!Data) {
      throw new Error("B7Data is required before B7Core.");
    }

    const STATE_VERSION = 2;
    const DIMENSION_IDS = Data.DIMENSIONS.map((dimension) => dimension.id);
    const SCREEN_IDS = new Set([
      "intro",
      "round-brief",
      "round-priority",
      "round-question",
      "round-workflow",
      "round-commit",
      "debrief",
      "transfer",
      "complete",
    ]);
    const ROUND_SCREEN_ORDER = [
      "round-brief",
      "round-priority",
      "round-question",
      "round-workflow",
      "round-commit",
    ];

    function blankRound() {
      return {
        priorities: [],
        question: null,
        workflow: null,
        safeguard: null,
        committed: false,
      };
    }

    function blankTransfer() {
      return {
        priorities: [],
        question: null,
        workflow: null,
        safeguard: null,
        trigger: null,
        complete: false,
      };
    }

    function createInitialState() {
      return {
        version: STATE_VERSION,
        contentVersion: Data.CONTENT_VERSION,
        screen: "intro",
        roundIndex: 0,
        rounds: Data.ROUNDS.map(blankRound),
        transfer: blankTransfer(),
        completed: false,
      };
    }

    function uniqueValidIds(values, allowed, max) {
      if (!Array.isArray(values)) return [];
      const seen = new Set();
      const output = [];
      for (const value of values) {
        if (!allowed.includes(value) || seen.has(value)) continue;
        seen.add(value);
        output.push(value);
        if (output.length === max) break;
      }
      return output;
    }

    function validItemId(items, value) {
      return items.some((item) => item.id === value) ? value : null;
    }

    function roundSelectionComplete(selection) {
      return Boolean(
        selection &&
          selection.priorities.length === 2 &&
          selection.question &&
          selection.workflow &&
          selection.safeguard,
      );
    }

    function transferSelectionComplete(selection) {
      return Boolean(
        selection &&
          selection.priorities.length === 2 &&
          selection.question &&
          selection.workflow &&
          selection.safeguard &&
          selection.trigger,
      );
    }

    function sanitiseRound(raw, round) {
      const safe = blankRound();
      if (!raw || typeof raw !== "object") return safe;
      safe.priorities = uniqueValidIds(raw.priorities, DIMENSION_IDS, 2);
      safe.question = validItemId(round.questions, raw.question);
      safe.workflow = validItemId(round.workflows, raw.workflow);
      safe.safeguard = validItemId(round.safeguards, raw.safeguard);
      safe.committed = Boolean(raw.committed && roundSelectionComplete(safe));
      return safe;
    }

    function sanitiseTransfer(raw) {
      const safe = blankTransfer();
      if (!raw || typeof raw !== "object") return safe;
      safe.priorities = uniqueValidIds(raw.priorities, DIMENSION_IDS, 2);
      safe.question = validItemId(Data.TRANSFER.questions, raw.question);
      safe.workflow = validItemId(Data.TRANSFER.workflows, raw.workflow);
      safe.safeguard = validItemId(Data.TRANSFER.safeguards, raw.safeguard);
      safe.trigger = validItemId(Data.TRANSFER.triggers, raw.trigger);
      safe.complete = Boolean(raw.complete && transferSelectionComplete(safe));
      return safe;
    }

    function earliestRoundScreen(selection) {
      if (selection.priorities.length !== 2) return "round-priority";
      if (!selection.question) return "round-question";
      if (!selection.workflow || !selection.safeguard) return "round-workflow";
      return "round-commit";
    }

    function screenAllowedForRound(screen, selection) {
      if (screen === "round-brief" || screen === "round-priority") return true;
      if (screen === "round-question") return selection.priorities.length === 2;
      if (screen === "round-workflow") {
        return selection.priorities.length === 2 && Boolean(selection.question);
      }
      if (screen === "round-commit") {
        return roundSelectionComplete(selection);
      }
      return false;
    }

    function sanitiseState(raw) {
      if (
        !raw ||
        typeof raw !== "object" ||
        raw.version !== STATE_VERSION ||
        raw.contentVersion !== Data.CONTENT_VERSION
      ) {
        return null;
      }

      const state = createInitialState();
      state.rounds = Data.ROUNDS.map((round, index) =>
        sanitiseRound(raw.rounds?.[index], round),
      );

      let firstUncommitted = state.rounds.findIndex(
        (selection) => !selection.committed,
      );
      if (firstUncommitted === -1) firstUncommitted = Data.ROUNDS.length;

      for (
        let index = firstUncommitted + 1;
        index < state.rounds.length;
        index++
      ) {
        state.rounds[index] = blankRound();
      }

      state.roundIndex = Math.min(firstUncommitted, Data.ROUNDS.length - 1);
      state.transfer = sanitiseTransfer(raw.transfer);
      const requestedScreen = SCREEN_IDS.has(raw.screen) ? raw.screen : "intro";

      if (firstUncommitted === Data.ROUNDS.length) {
        state.completed = Boolean(raw.completed && state.transfer.complete);
        if (state.completed) {
          state.screen = "complete";
        } else if (requestedScreen === "transfer") {
          state.screen = "transfer";
        } else {
          state.screen = "debrief";
        }
        return state;
      }

      state.transfer = blankTransfer();
      state.completed = false;
      const selection = state.rounds[state.roundIndex];
      if (
        ROUND_SCREEN_ORDER.includes(requestedScreen) &&
        screenAllowedForRound(requestedScreen, selection)
      ) {
        state.screen = requestedScreen;
      } else if (requestedScreen === "intro" && firstUncommitted === 0) {
        state.screen = "intro";
      } else {
        state.screen = earliestRoundScreen(selection);
      }
      return state;
    }

    function dimension(id) {
      return Data.DIMENSIONS.find((item) => item.id === id);
    }

    function dimensionNames(ids) {
      return ids.map((id) => dimension(id)?.name || id);
    }

    function formatList(items) {
      if (items.length === 0) return "";
      if (items.length === 1) return items[0];
      return `${items.slice(0, -1).join(", ")} i ${items.at(-1)}`;
    }

    function roundItem(roundIndex, type, id) {
      const round = Data.ROUNDS[roundIndex];
      return round?.[type]?.find((item) => item.id === id) || null;
    }

    function evaluateRound(roundIndex, selection) {
      const round = Data.ROUNDS[roundIndex];
      if (!round || !roundSelectionComplete(selection)) return null;

      const workflow = roundItem(roundIndex, "workflows", selection.workflow);
      const safeguard = roundItem(
        roundIndex,
        "safeguards",
        selection.safeguard,
      );
      const question = roundItem(roundIndex, "questions", selection.question);
      let status = workflow.baseStatus;

      for (const priority of selection.priorities) {
        if (workflow.priorityStatus?.[priority]) {
          status = workflow.priorityStatus[priority];
        }
      }
      if (workflow.safeguardStatus?.[selection.safeguard]) {
        status = workflow.safeguardStatus[selection.safeguard];
      }

      const pressureChosen = selection.priorities.filter((id) =>
        round.pressure.includes(id),
      );
      const priorityNames = dimensionNames(selection.priorities);
      const pressureNames = dimensionNames(round.pressure);
      const alignment =
        pressureChosen.length > 0
          ? `Has prioritzat ${formatList(priorityNames)}. El brief pressionava especialment ${formatList(pressureNames)}; la teva tria n’ha recollit ${pressureChosen.length} de ${round.pressure.length}.`
          : `Has prioritzat ${formatList(priorityNames)}, mentre el brief pressionava especialment ${formatList(pressureNames)}. Pot ser deliberat, però convé fer explícit què acceptes a canvi.`;

      return {
        status,
        statusLabel: Data.STATUS[status].label,
        statusTitle: Data.STATUS[status].title,
        workflow,
        safeguard,
        question,
        alignment,
        evidence: `Vas preguntar «${question.label}» i vas descobrir: ${question.reveal}`,
        benefit: workflow.benefit,
        tradeoff: workflow.tradeoff,
        safeguardEffect: safeguard.effect,
        reconsider: workflow.reconsider,
      };
    }

    function evaluateTransfer(selection) {
      if (!transferSelectionComplete(selection)) return null;
      const workflow = Data.TRANSFER.workflows.find(
        (item) => item.id === selection.workflow,
      );
      const safeguard = Data.TRANSFER.safeguards.find(
        (item) => item.id === selection.safeguard,
      );
      const question = Data.TRANSFER.questions.find(
        (item) => item.id === selection.question,
      );
      const trigger = Data.TRANSFER.triggers.find(
        (item) => item.id === selection.trigger,
      );
      let status = workflow.status;

      if (
        workflow.id === "single-auto" &&
        selection.safeguard === "human-escalation"
      ) {
        status = "defensible";
      }
      if (
        workflow.id === "approved-cloud" &&
        ["evaluation", "data-gate"].includes(selection.safeguard)
      ) {
        status = "proportionate";
      }
      if (workflow.id === "human-rules" && selection.safeguard === "fallback") {
        status = "proportionate";
      }

      const priorities = formatList(dimensionNames(selection.priorities));
      const triggerComment = trigger.strong
        ? "El desencadenant és mesurable i lligat al brief: la decisió queda oberta a evidència nova."
        : "El desencadenant encara depèn d’autoritat o inèrcia. Una decisió robusta es revisa quan canvien mesures, restriccions o context.";

      return {
        status,
        statusLabel: Data.STATUS[status].label,
        statusTitle: Data.STATUS[status].title,
        workflow,
        safeguard,
        question,
        trigger,
        summary: `Has prioritzat ${priorities}, has demanat «${question.label}» i has combinat «${workflow.title}» amb «${safeguard.title}».`,
        feedback: workflow.feedback,
        safeguardEffect: safeguard.effect,
        triggerComment,
      };
    }

    function samplingMargin(
      population,
      sample,
      confidenceZ = 1.96,
      proportion = 0.5,
    ) {
      if (
        !Number.isFinite(population) ||
        !Number.isFinite(sample) ||
        population <= 1 ||
        sample <= 0 ||
        sample > population ||
        proportion < 0 ||
        proportion > 1
      ) {
        return null;
      }
      const standardError = Math.sqrt((proportion * (1 - proportion)) / sample);
      const finiteCorrection = Math.sqrt(
        (population - sample) / (population - 1),
      );
      return confidenceZ * standardError * finiteCorrection;
    }

    function progressForState(state) {
      if (state.screen === "intro") {
        return {
          step: 1,
          label: "Les cinc dimensions",
          percent: 0,
          detail: "Introducció",
        };
      }
      if (state.screen.startsWith("round-")) {
        const substep = Math.max(0, ROUND_SCREEN_ORDER.indexOf(state.screen));
        return {
          step: state.roundIndex + 2,
          label: `Brief ${state.roundIndex + 1}`,
          percent: 8 + state.roundIndex * 21 + substep * 4,
          detail: `Decisió ${substep + 1} de ${ROUND_SCREEN_ORDER.length}`,
        };
      }
      if (state.screen === "debrief") {
        return {
          step: 5,
          label: "Mapa de decisions",
          percent: 76,
          detail: "Conseqüències",
        };
      }
      if (state.screen === "transfer") {
        return {
          step: 5,
          label: "Transferència",
          percent: 88,
          detail: "Cas nou",
        };
      }
      return {
        step: 5,
        label: "Activitat completada",
        percent: 100,
        detail: "Transferència completada",
      };
    }

    function validateData() {
      const errors = [];
      if (Data.DIMENSIONS.length !== 5) {
        errors.push("Exactly five dimensions are required.");
      }
      if (new Set(DIMENSION_IDS).size !== DIMENSION_IDS.length) {
        errors.push("Dimension ids must be unique.");
      }
      if (Data.ROUNDS.length !== 3) {
        errors.push("Exactly three brief rounds are required.");
      }

      for (const [roundIndex, round] of Data.ROUNDS.entries()) {
        for (const collection of ["questions", "workflows", "safeguards"]) {
          if (
            !Array.isArray(round[collection]) ||
            round[collection].length < 3
          ) {
            errors.push(
              `Round ${roundIndex + 1} needs at least three ${collection}.`,
            );
            continue;
          }
          const ids = round[collection].map((item) => item.id);
          if (new Set(ids).size !== ids.length) {
            errors.push(
              `Round ${roundIndex + 1} has duplicate ${collection} ids.`,
            );
          }
        }
        if (
          !Array.isArray(round.pressure) ||
          round.pressure.some((id) => !DIMENSION_IDS.includes(id))
        ) {
          errors.push(
            `Round ${roundIndex + 1} has invalid pressure dimensions.`,
          );
        }
        for (const workflow of round.workflows) {
          if (!Data.STATUS[workflow.baseStatus]) {
            errors.push(
              `Round ${roundIndex + 1} workflow ${workflow.id} has an invalid status.`,
            );
          }
        }
      }
      return errors;
    }

    return {
      STATE_VERSION,
      DIMENSION_IDS,
      SCREEN_IDS,
      ROUND_SCREEN_ORDER,
      createInitialState,
      sanitiseState,
      roundSelectionComplete,
      transferSelectionComplete,
      dimension,
      dimensionNames,
      formatList,
      roundItem,
      evaluateRound,
      evaluateTransfer,
      samplingMargin,
      progressForState,
      validateData,
    };
  },
);
