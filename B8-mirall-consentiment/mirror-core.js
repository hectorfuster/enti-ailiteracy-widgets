(function initB8MirrorCore(globalScope) {
  "use strict";

  const Content = globalScope.B8Content;
  if (!Content) throw new Error("B8Content no s’ha pogut carregar.");

  const STATE_VERSION = 1;
  const SCREENS = new Set([
    "intro",
    "studio",
    "prediction",
    "creator",
    "mirror",
    "revision",
    "transfer",
    "transfer-feedback",
    "commitment",
    "complete",
  ]);
  const PREDICTION_IDS = new Set(Content.PREDICTIONS.map((item) => item.id));
  const REASON_IDS = new Set(Content.DIFFERENCE_REASONS.map((item) => item.id));
  const DISPOSITION_IDS = new Set(Content.DISPOSITIONS.map((item) => item.id));
  const TRANSFER_IDS = new Set(Content.TRANSFER.choices.map((item) => item.id));
  const STANDARD_IDS = new Set(
    Content.COMMITMENT_STANDARDS.map((item) => item.id),
  );
  const EVIDENCE_IDS = new Set(Content.EVIDENCE_CHOICES.map((item) => item.id));
  const LATE_SCREENS = new Set([
    "mirror",
    "revision",
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

  function snapshotAnswers(answers, role) {
    const snapshot = copyAnswers(answers, role);
    return allAnswered(snapshot, role) ? snapshot : null;
  }

  function sanitiseNote(value, maximum = 300) {
    if (typeof value !== "string") return "";
    return value.replace(/\r\n?/g, "\n").slice(0, maximum);
  }

  function sanitiseReflections(raw) {
    const source = isRecord(raw) ? raw : {};
    const reflections = {};
    for (const dimension of Content.DIMENSIONS) {
      const candidate = isRecord(source[dimension.id])
        ? source[dimension.id]
        : {};
      reflections[dimension.id] = {
        reason: REASON_IDS.has(candidate.reason) ? candidate.reason : null,
        disposition: DISPOSITION_IDS.has(candidate.disposition)
          ? candidate.disposition
          : null,
        note: sanitiseNote(candidate.note, 220),
        reviewed: candidate.reviewed === true,
      };
    }
    return reflections;
  }

  function createEmptyReflections() {
    return Object.fromEntries(
      Content.DIMENSIONS.map((dimension) => [
        dimension.id,
        {
          reason: null,
          disposition: null,
          note: "",
          reviewed: false,
        },
      ]),
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
      mirrorIndex: 0,
      studioAnswers: {},
      creatorAnswers: {},
      originalStudioAnswers: null,
      originalCreatorAnswers: null,
      prediction: null,
      reflections: createEmptyReflections(),
      revisions: {},
      transferChoice: null,
      transferReviewed: false,
      commitment: {
        standard: null,
        evidence: null,
        note: "",
      },
      completed: false,
      completionSignalled: false,
    };
  }

  function answersDifferFromOriginal(state, dimensionId) {
    return Boolean(
      state.originalStudioAnswers?.[dimensionId] &&
        state.originalCreatorAnswers?.[dimensionId] &&
        (state.studioAnswers[dimensionId] !==
          state.originalStudioAnswers[dimensionId] ||
          state.creatorAnswers[dimensionId] !==
            state.originalCreatorAnswers[dimensionId]),
    );
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

  function reflectionComplete(state, dimensionId) {
    const reflection = state.reflections?.[dimensionId];
    if (!reflection?.reviewed || !DISPOSITION_IDS.has(reflection.disposition)) {
      return false;
    }
    const comparison = baseComparison(state, dimensionId);
    if (comparison === "different") {
      return REASON_IDS.has(reflection.reason);
    }
    return comparison !== "incomplete";
  }

  function resultForDimension(state, dimensionId) {
    const comparison = baseComparison(state, dimensionId);
    const reflection = state.reflections?.[dimensionId];
    if (!reflectionComplete(state, dimensionId)) {
      return {
        id:
          comparison === "same-principle"
            ? "same-unreviewed"
            : comparison === "need-information"
              ? "need-information-unreviewed"
              : comparison === "different"
                ? "difference-unreviewed"
                : "incomplete",
        comparison,
        reviewed: false,
      };
    }
    if (reflection.disposition === "pending") {
      return {
        id: "need-information",
        comparison,
        reviewed: true,
      };
    }
    if (reflection.disposition === "revisit") {
      return {
        id:
          comparison === "same-principle"
            ? "principle-to-revisit"
            : "difference-to-revisit",
        comparison,
        reviewed: true,
      };
    }
    if (comparison === "same-principle") {
      return {
        id: "shared-principle",
        comparison,
        reviewed: true,
      };
    }
    if (comparison === "need-information") {
      return {
        id: "need-information",
        comparison,
        reviewed: true,
      };
    }
    return {
      id: "difference-examined",
      comparison,
      reviewed: true,
    };
  }

  function allReflectionsComplete(state) {
    return Content.DIMENSIONS.every((dimension) =>
      reflectionComplete(state, dimension.id),
    );
  }

  function canComplete(state) {
    return Boolean(
      allAnswered(state.studioAnswers, "studio") &&
        allAnswered(state.creatorAnswers, "creator") &&
        allAnswered(state.originalStudioAnswers, "studio") &&
        allAnswered(state.originalCreatorAnswers, "creator") &&
        allReflectionsComplete(state) &&
        TRANSFER_IDS.has(state.transferChoice) &&
        state.transferReviewed === true &&
        STANDARD_IDS.has(state.commitment?.standard) &&
        EVIDENCE_IDS.has(state.commitment?.evidence),
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
    state.mirrorIndex = clampIndex(raw.mirrorIndex);
    state.studioAnswers = copyAnswers(raw.studioAnswers, "studio");
    state.creatorAnswers = copyAnswers(raw.creatorAnswers, "creator");
    state.originalStudioAnswers = snapshotAnswers(
      raw.originalStudioAnswers,
      "studio",
    );
    state.originalCreatorAnswers = snapshotAnswers(
      raw.originalCreatorAnswers,
      "creator",
    );
    state.prediction = PREDICTION_IDS.has(raw.prediction)
      ? raw.prediction
      : null;
    state.reflections = sanitiseReflections(raw.reflections);
    state.revisions = {};
    if (isRecord(raw.revisions)) {
      for (const dimension of Content.DIMENSIONS) {
        if (raw.revisions[dimension.id] === true) {
          state.revisions[dimension.id] = true;
        }
      }
    }
    state.transferChoice = TRANSFER_IDS.has(raw.transferChoice)
      ? raw.transferChoice
      : null;
    state.transferReviewed = raw.transferReviewed === true;
    state.commitment = {
      standard: STANDARD_IDS.has(raw.commitment?.standard)
        ? raw.commitment.standard
        : null,
      evidence: EVIDENCE_IDS.has(raw.commitment?.evidence)
        ? raw.commitment.evidence
        : null,
      note: sanitiseNote(raw.commitment?.note, 300),
    };

    if (
      (state.screen === "prediction" || state.screen === "creator") &&
      !allAnswered(state.studioAnswers, "studio")
    ) {
      return null;
    }
    if (
      state.screen === "creator" &&
      !allAnswered(state.originalStudioAnswers, "studio")
    ) {
      return null;
    }
    if (
      LATE_SCREENS.has(state.screen) &&
      (!allAnswered(state.studioAnswers, "studio") ||
        !allAnswered(state.creatorAnswers, "creator") ||
        !allAnswered(state.originalStudioAnswers, "studio") ||
        !allAnswered(state.originalCreatorAnswers, "creator"))
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
      case "revision":
        return {
          step: 4,
          label: `El mirall · ${currentDimension(state.mirrorIndex)}`,
          percent: 60 + state.mirrorIndex * 5,
        };
      case "transfer":
        return { step: 5, label: "Cas de transferència", percent: 86 };
      case "transfer-feedback":
        return { step: 5, label: "Retorn de transferència", percent: 90 };
      case "commitment":
        return { step: 6, label: "Principi reutilitzable", percent: 95 };
      case "complete":
        return { step: 6, label: "Activitat completada", percent: 100 };
      default:
        return { step: 0, label: "Orientació", percent: 0 };
    }
  }

  function resultCounts(state) {
    const counts = {
      shared: 0,
      examined: 0,
      revisit: 0,
      pending: 0,
    };
    for (const dimension of Content.DIMENSIONS) {
      const result = resultForDimension(state, dimension.id);
      if (result.id === "shared-principle") counts.shared += 1;
      else if (result.id === "difference-examined") counts.examined += 1;
      else if (
        result.id === "difference-to-revisit" ||
        result.id === "principle-to-revisit"
      ) {
        counts.revisit += 1;
      } else if (result.id === "need-information") {
        counts.pending += 1;
      }
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
    snapshotAnswers,
    policiesForDimension,
    baseComparison,
    reflectionComplete,
    resultForDimension,
    allReflectionsComplete,
    answersDifferFromOriginal,
    canComplete,
    progressForState,
    resultCounts,
  });

  globalScope.B8MirrorCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
