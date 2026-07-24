(function initInferenceEngine(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.B6InferenceEngine = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createEngine() {
    "use strict";

    const PROTECTIVE_CHOICES = new Set([
      "minimize",
      "approved",
      "block",
      "depends",
    ]);

    function unique(values) {
      return [...new Set(values)];
    }

    function scenarioMap(scenarios) {
      return new Map(scenarios.map((scenario) => [scenario.id, scenario]));
    }

    function clueMap(scenarios) {
      const map = new Map();
      for (const scenario of scenarios) {
        for (const clue of scenario.clues) {
          map.set(clue.id, { ...clue, scenarioId: scenario.id });
        }
      }
      return map;
    }

    function exposedScenarioIds(scenarios, answers, mode) {
      if (mode === "original") return scenarios.map((scenario) => scenario.id);
      return scenarios
        .filter((scenario) => answers[scenario.id] === "send")
        .map((scenario) => scenario.id);
    }

    function evaluateInferences(
      scenarios,
      inferences,
      answers,
      mode = "learner",
    ) {
      const exposedIds = new Set(exposedScenarioIds(scenarios, answers, mode));
      const clues = clueMap(scenarios);
      const exposedClues = new Set();

      for (const scenario of scenarios) {
        if (!exposedIds.has(scenario.id)) continue;
        for (const clue of scenario.clues) exposedClues.add(clue.id);
      }

      return inferences.map((inference) => {
        const paths = inference.evidenceRules.map((rule) => {
          const evidence = rule.allOf.map((clueId) => {
            const clue = clues.get(clueId);
            return {
              ...clue,
              id: clueId,
              exposed: exposedClues.has(clueId),
            };
          });
          return {
            id: rule.id,
            label: rule.label,
            active: evidence.every((item) => item.exposed),
            evidence,
          };
        });
        return {
          ...inference,
          active: paths.some((path) => path.active),
          activePathCount: paths.filter((path) => path.active).length,
          paths,
        };
      });
    }

    function evaluateExposure(
      scenarios,
      inferences,
      answers,
      mode = "learner",
    ) {
      const exposedIds = new Set(exposedScenarioIds(scenarios, answers, mode));
      const directDisclosures = scenarios.flatMap((scenario) =>
        exposedIds.has(scenario.id)
          ? scenario.directDisclosures.map((label) => ({
              label,
              scenarioId: scenario.id,
            }))
          : [],
      );
      const inferenceResults = evaluateInferences(
        scenarios,
        inferences,
        answers,
        mode,
      );

      return {
        directDisclosures,
        exposedScenarioIds: [...exposedIds],
        activeInferences: inferenceResults.filter((item) => item.active),
        inferences: inferenceResults,
      };
    }

    function answerSummary(scenarios, answers) {
      const answered = scenarios.filter((scenario) => answers[scenario.id]);
      const aligned = answered.filter(
        (scenario) => answers[scenario.id] === scenario.correctChoice,
      );
      const paused = answered.filter((scenario) =>
        PROTECTIVE_CHOICES.has(answers[scenario.id]),
      );
      return {
        aligned: aligned.length,
        answered: answered.length,
        paused: paused.length,
        total: scenarios.length,
      };
    }

    function validateContent(data) {
      const errors = [];
      const choiceIds = new Set(data.CHOICES.map((choice) => choice.id));
      const scenarioIds = new Set();
      const clueIds = new Set();
      const repairIds = new Set();

      function error(message) {
        errors.push(message);
      }

      for (const scenario of data.SCENARIOS) {
        if (scenarioIds.has(scenario.id))
          error(`Identificador d'escenari duplicat: ${scenario.id}`);
        scenarioIds.add(scenario.id);
        if (!choiceIds.has(scenario.correctChoice))
          error(`Opció correcta inexistent a ${scenario.id}`);
        for (const choiceId of choiceIds) {
          if (!scenario.feedback[choiceId])
            error(`Falta feedback ${choiceId} a ${scenario.id}`);
        }
        if (
          scenario.correctChoice !== "send" &&
          (!scenario.safeAlternative || scenario.postSendActions.length === 0)
        ) {
          error(`Falta alternativa o resposta posterior a ${scenario.id}`);
        }
        for (const clue of scenario.clues) {
          if (clueIds.has(clue.id))
            error(`Identificador de pista duplicat: ${clue.id}`);
          clueIds.add(clue.id);
        }
        for (const type of scenario.dataTypes) {
          if (!data.DATA_TYPES[type])
            error(`Tipus de dada desconegut ${type} a ${scenario.id}`);
        }
      }

      let genuinelyCumulative = 0;
      for (const inference of data.INFERENCES) {
        if (!inference.assumptions.length)
          error(`La inferència ${inference.id} no declara supòsits`);
        if (!inference.evidenceRules.length)
          error(`La inferència ${inference.id} no té vies d'evidència`);
        if (
          inference.evidenceRules.some((rule) => rule.allOf.length >= 2) &&
          inference.kind === "cumulative"
        ) {
          genuinelyCumulative += 1;
        }
        for (const rule of inference.evidenceRules) {
          if (unique(rule.allOf).length !== rule.allOf.length)
            error(`La via ${rule.id} repeteix pistes`);
          for (const clueId of rule.allOf) {
            if (!clueIds.has(clueId))
              error(
                `La via ${rule.id} referencia una pista inexistent: ${clueId}`,
              );
          }
        }
      }
      if (genuinelyCumulative < 3)
        error("Calen almenys tres inferències realment acumulatives");

      for (const repair of data.REPAIR_CASES) {
        if (repairIds.has(repair.id))
          error(`Identificador de reparació duplicat: ${repair.id}`);
        repairIds.add(repair.id);
        if (!scenarioIds.has(repair.scenarioId))
          error(`Reparació ${repair.id} referencia un escenari inexistent`);
        if (repair.options.filter((option) => option.correct).length !== 1)
          error(`Reparació ${repair.id} ha de tenir una opció correcta`);
      }

      if (
        data.TRANSFER.options.filter((option) => option.correct).length !== 1
      ) {
        error("La transferència ha de tenir exactament una opció correcta");
      }
      if (!data.INCIDENT_OPTIONS.some((option) => option.correct))
        error("La resposta a l'incident no té cap acció correcta");
      if (!data.INCIDENT_OPTIONS.some((option) => !option.correct))
        error("La resposta a l'incident no té distractors");

      return errors;
    }

    return Object.freeze({
      PROTECTIVE_CHOICES,
      answerSummary,
      evaluateExposure,
      evaluateInferences,
      validateContent,
    });
  },
);
