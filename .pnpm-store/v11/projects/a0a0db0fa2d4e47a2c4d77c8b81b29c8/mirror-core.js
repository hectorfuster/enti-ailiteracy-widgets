(function initB8MirrorCore(globalScope) {
  "use strict";

  const Content = globalScope.B8Content;
  if (!Content) throw new Error("B8Content no s’ha pogut carregar.");

  const STATE_VERSION = 2;
  const SCREENS = new Set([
    "intro",
    "studio",
    "prediction",
    "creator",
    "mirror",
    "transfer",
    "transfer-feedback",
    "commitment",
    "complete",
  ]);
  const PREDICTION_IDS = new Set(Content.PREDICTIONS.map((item) => item.id));
  const TRANSFER_IDS = new Set(Content.TRANSFER.choices.map((item) => item.id));
  const STANDARD_IDS = new Set(
    Content.COMMITMENT_STANDARDS.map((item) => item.id),
  );
  const LATE_SCREENS = new Set([
    "mirror",
    "transfer",
    "transfer-feedback",
    "commitment",
    "complete",
  ]);

  function isRecord(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype,
    );
  }

  function safeAttemptId(value) {
    return typeof value === "string" && /^[A-Za-z0-9-]{8,80}$/.test(value)
      ? value
      : null;
  }

  function clampIndex(value) {
    return Number.isInteger(value) &&
      value >= 0 &&
      value < Content.DIMENSIONS.length
      ? value
      : 0;
  }

  function dimensionById(dimensionId) {
    return (
      Content.DIMENSIONS.find((dimension) => dimension.id === dimensionId) ||
      null
    );
  }

  function choiceFor(dimensionId, role, choiceId) {
    const dimension = dimensionById(dimensionId);
    if (!dimension || (role !== "studio" && role !== "creator")) return null;
    return (
      dimension[role].choices.find((choice) => choice.id === choiceId) || null
    );
  }

  function validAnswer(dimensionId, role, choiceId) {
    return Boolean(choiceFor(dimensionId, role, choiceId));
  }

  function copyAnswers(raw, role) {
    const source = isRecord(raw) ? raw : {};
    const result = {};
    for (const dimension of Content.DIMENSIONS) {
      if (validAnswer(dimension.id, role, source[dimension.id])) {
        result[dimension.id] = source[dimension.id];
      }
    }
    return result;
  }

  function allAnswered(answers, role) {
    return Content.DIMENSIONS.every((dimension) =>
      validAnswer(dimension.id, role, answers?.[dimension.id]),
    );
  }

  function createInitialState(attemptId) {
    const safeId = safeAttemptId(attemptId);
    if (!safeId) throw new TypeError("attemptId no és vàlid.");
    return {
      stateVersion: STATE_VERSION,
      attemptId: safeId,
      screen: "intro",
      studioIndex: 0,
      creatorIndex: 0,
      studioAnswers: {},
      creatorAnswers: {},
      prediction: null,
      mirrorReviewed: false,
      transferChoice: null,
      transferReviewed: false,
      commitment: {
        standard: null,
      },
      completed: false,
      completionSignalled: false,
    };
  }

  function policiesForDimension(state, dimensionId) {
    const studioChoice = choiceFor(
      dimensionId,
      "studio",
      state.studioAnswers?.[dimensionId],
    );
    const creatorChoice = choiceFor(
      dimensionId,
      "creator",
      state.creatorAnswers?.[dimensionId],
    );
    if (!studioChoice || !creatorChoice) return null;
    return {
      studioChoice,
      creatorChoice,
      studioPolicy: studioChoice.policy,
      creatorPolicy: creatorChoice.policy,
    };
  }

  function baseComparison(state, dimensionId) {
    const policies = policiesForDimension(state, dimensionId);
    if (!policies) return "incomplete";
    if (
      policies.studioPolicy === "need-evidence" ||
      policies.creatorPolicy === "need-evidence"
    ) {
      return "need-information";
    }
    return policies.studioPolicy === policies.creatorPolicy
      ? "same-principle"
      : "different";
  }

  function resultForDimension(state, dimensionId) {
    const comparison = baseComparison(state, dimensionId);
    const ids = {
      "same-principle": "shared-principle",
      different: "application-different",
      "need-information": "need-information",
      incomplete: "incomplete",
    };
    return {
      id: ids[comparison],
      comparison,
      reviewed: state.mirrorReviewed === true,
    };
  }

  function canComplete(state) {
    return Boolean(
      allAnswered(state.studioAnswers, "studio") &&
        allAnswered(state.creatorAnswers, "creator") &&
        PREDICTION_IDS.has(state.prediction) &&
        state.mirrorReviewed === true &&
        TRANSFER_IDS.has(state.transferChoice) &&
        state.transferReviewed === true &&
        STANDARD_IDS.has(state.commitment?.standard),
    );
  }

  function sanitiseState(raw) {
    if (
      !isRecord(raw) ||
      raw.stateVersion !== STATE_VERSION ||
      !safeAttemptId(raw.attemptId) ||
      !SCREENS.has(raw.screen)
    ) {
      return null;
    }

    const state = createInitialState(raw.attemptId);
    state.screen = raw.screen;
    state.studioIndex = clampIndex(raw.studioIndex);
    state.creatorIndex = clampIndex(raw.creatorIndex);
    state.studioAnswers = copyAnswers(raw.studioAnswers, "studio");
    state.creatorAnswers = copyAnswers(raw.creatorAnswers, "creator");
    state.prediction = PREDICTION_IDS.has(raw.prediction)
      ? raw.prediction
      : null;
    state.mirrorReviewed = raw.mirrorReviewed === true;
    state.transferChoice = TRANSFER_IDS.has(raw.transferChoice)
      ? raw.transferChoice
      : null;
    state.transferReviewed = raw.transferReviewed === true;
    state.commitment = {
      standard: STANDARD_IDS.has(raw.commitment?.standard)
        ? raw.commitment.standard
        : null,
    };

    if (
      (state.screen === "prediction" || state.screen === "creator") &&
      !allAnswered(state.studioAnswers, "studio")
    ) {
      return null;
    }
    if (state.screen === "creator" && !PREDICTION_IDS.has(state.prediction)) {
      return null;
    }
    if (
      LATE_SCREENS.has(state.screen) &&
      (!allAnswered(state.studioAnswers, "studio") ||
        !allAnswered(state.creatorAnswers, "creator") ||
        !PREDICTION_IDS.has(state.prediction))
    ) {
      return null;
    }
    if (
      (state.screen === "transfer" ||
        state.screen === "transfer-feedback" ||
        state.screen === "commitment" ||
        state.screen === "complete") &&
      !state.mirrorReviewed
    ) {
      return null;
    }
    if (
      (state.screen === "transfer-feedback" ||
        state.screen === "commitment" ||
        state.screen === "complete") &&
      !TRANSFER_IDS.has(state.transferChoice)
    ) {
      return null;
    }
    if (
      (state.screen === "commitment" || state.screen === "complete") &&
      !state.transferReviewed
    ) {
      return null;
    }

    state.completed = raw.completed === true && canComplete(state);
    state.completionSignalled =
      state.completed && raw.completionSignalled === true;
    if (state.screen === "complete" && !state.completed) return null;
    if (state.completed) state.screen = "complete";
    return state;
  }

  function progressForState(state) {
    const currentDimension = (index) =>
      `${index + 1} de ${Content.DIMENSIONS.length}`;
    switch (state.screen) {
      case "intro":
        return { step: 0, label: "Orientació", percent: 0 };
      case "studio":
        return {
          step: 1,
          label: `Decisions d’estudi · ${currentDimension(state.studioIndex)}`,
          percent: 5 + state.studioIndex * 5,
        };
      case "prediction":
        return { step: 2, label: "Predicció", percent: 30 };
      case "creator":
        return {
          step: 3,
          label: `Decisions de creador · ${currentDimension(
            state.creatorIndex,
          )}`,
          percent: 35 + state.creatorIndex * 5,
        };
      case "mirror":
        return { step: 4, label: "El mirall", percent: 65 };
      case "transfer":
        return { step: 5, label: "Cas de transferència", percent: 78 };
      case "transfer-feedback":
        return { step: 5, label: "Retorn de transferència", percent: 88 };
      case "commitment":
        return { step: 6, label: "Principi reutilitzable", percent: 94 };
      case "complete":
        return { step: 6, label: "Activitat completada", percent: 100 };
      default:
        return { step: 0, label: "Orientació", percent: 0 };
    }
  }

  function resultCounts(state) {
    const counts = {
      shared: 0,
      different: 0,
      pending: 0,
    };
    for (const dimension of Content.DIMENSIONS) {
      const result = resultForDimension(state, dimension.id);
      if (result.id === "shared-principle") counts.shared += 1;
      else if (result.id === "application-different") counts.different += 1;
      else if (result.id === "need-information") counts.pending += 1;
    }
    return counts;
  }

  const api = Object.freeze({
    STATE_VERSION,
    SCREENS,
    createInitialState,
    sanitiseState,
    dimensionById,
    choiceFor,
    validAnswer,
    allAnswered,
    policiesForDimension,
    baseComparison,
    resultForDimension,
    canComplete,
    progressForState,
    resultCounts,
  });

  globalScope.B8MirrorCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
