(function initEngine(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.B3Engine = api;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildEngine() {
    "use strict";

    const EPSILON = 1e-9;

    function clampTemperature(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return 1;
      return Math.min(2, Math.max(0, Math.round(numeric * 10) / 10));
    }

    function applyTemperature(candidates, temperature) {
      const safeTemperature = clampTemperature(temperature);
      if (!Array.isArray(candidates) || candidates.length === 0) return [];

      if (safeTemperature === 0) {
        let maxIndex = 0;
        for (let index = 1; index < candidates.length; index += 1) {
          if (
            candidates[index].probability > candidates[maxIndex].probability
          ) {
            maxIndex = index;
          }
        }
        return candidates.map((candidate, index) => ({
          ...candidate,
          adjustedProbability: index === maxIndex ? 1 : 0,
        }));
      }

      const inverse = 1 / safeTemperature;
      const weighted = candidates.map((candidate) =>
        Math.pow(candidate.probability, inverse),
      );
      const total = weighted.reduce((sum, probability) => sum + probability, 0);

      return candidates.map((candidate, index) => ({
        ...candidate,
        adjustedProbability: total > 0 ? weighted[index] / total : 0,
      }));
    }

    function hashString(value) {
      let hash = 2166136261;
      const text = String(value);
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function mulberry32(seed) {
      let value = seed >>> 0;
      return function random() {
        value += 0x6d2b79f5;
        let result = value;
        result = Math.imul(result ^ (result >>> 15), result | 1);
        result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomForDraw(seed, scenarioId, drawIndex) {
      const random = mulberry32(
        hashString(
          `${String(seed)}:${String(scenarioId)}:${Number(drawIndex)}`,
        ),
      );
      return random();
    }

    function selectCandidate(distribution, randomValue) {
      if (!Array.isArray(distribution) || distribution.length === 0)
        return null;
      const safeRandom = Math.min(
        1 - Number.EPSILON,
        Math.max(0, Number(randomValue) || 0),
      );
      let cumulative = 0;
      for (const candidate of distribution) {
        cumulative += candidate.adjustedProbability;
        if (safeRandom < cumulative + EPSILON) return candidate;
      }
      return distribution[distribution.length - 1];
    }

    function sampleBatch({
      candidates,
      temperature,
      seed,
      scenarioId,
      startIndex = 0,
      count = 1,
    }) {
      const distribution = applyTemperature(candidates, temperature);
      const draws = [];
      const counts = {};
      const safeCount = Math.max(0, Math.floor(Number(count) || 0));

      for (let offset = 0; offset < safeCount; offset += 1) {
        const drawIndex = startIndex + offset;
        const randomValue = randomForDraw(seed, scenarioId, drawIndex);
        const candidate = selectCandidate(distribution, randomValue);
        if (!candidate) continue;
        counts[candidate.id] = (counts[candidate.id] || 0) + 1;
        draws.push({
          drawIndex,
          randomValue,
          tokenId: candidate.id,
          tokenText: candidate.text,
          temperature: clampTemperature(temperature),
        });
      }

      return { distribution, draws, counts };
    }

    function aggregateDisplayRows(distribution, visibleCount = 6) {
      const safeVisibleCount = Math.max(1, Math.floor(visibleCount));
      const visible = distribution
        .slice(0, safeVisibleCount)
        .map((candidate) => ({
          ...candidate,
          isAggregate: false,
          aggregateCount: 1,
        }));
      const hidden = distribution.slice(safeVisibleCount);
      if (hidden.length === 0) return visible;

      visible.push({
        id: "other",
        text: "",
        probability: hidden.reduce(
          (sum, candidate) => sum + candidate.probability,
          0,
        ),
        adjustedProbability: hidden.reduce(
          (sum, candidate) => sum + candidate.adjustedProbability,
          0,
        ),
        isAggregate: true,
        aggregateCount: hidden.length,
      });
      return visible;
    }

    function entropy(distribution) {
      return distribution.reduce((sum, candidate) => {
        const probability = candidate.adjustedProbability;
        return probability > 0
          ? sum - probability * Math.log2(probability)
          : sum;
      }, 0);
    }

    function temperatureBand(temperature) {
      const value = clampTemperature(temperature);
      if (value <= 0.7) return "low";
      if (value >= 1.3) return "high";
      return "natural";
    }

    function calculateProgress(state) {
      const scenarioStates = Object.values(state.scenarios || {});
      const predictedScenarios = scenarioStates.filter(
        (scenarioState) => scenarioState.predictionTokenId != null,
      ).length;
      const sampleCount = scenarioStates.reduce(
        (total, scenarioState) =>
          total +
          (Number.isFinite(scenarioState.drawCount)
            ? scenarioState.drawCount
            : (scenarioState.draws || []).length),
        0,
      );
      const bands = new Set();
      scenarioStates.forEach((scenarioState) => {
        (scenarioState.sampledBands || []).forEach((band) => bands.add(band));
        (scenarioState.draws || []).forEach((draw) =>
          bands.add(temperatureBand(draw.temperature)),
        );
      });

      const alreadyCompleted = state.completed === true;
      const milestones = {
        predictions: alreadyCompleted || predictedScenarios >= 3,
        samples: alreadyCompleted || sampleCount >= 10,
        temperatures: alreadyCompleted || bands.size >= 2,
        reflection: alreadyCompleted || state.reflectionCorrect === true,
        completed: alreadyCompleted,
      };

      return {
        milestones,
        completedCount: Object.values(milestones).filter(Boolean).length,
        totalMilestones: Object.keys(milestones).length,
        predictedScenarios,
        sampleCount,
        temperatureBands: Array.from(bands),
        readyToComplete:
          milestones.predictions &&
          milestones.samples &&
          milestones.temperatures &&
          milestones.reflection,
      };
    }

    function validateDataset(dataset) {
      const errors = [];
      if (!dataset || !dataset.metadata || !Array.isArray(dataset.scenarios)) {
        return ["El conjunt de dades no té l'estructura esperada."];
      }

      const metadata = dataset.metadata;
      if (
        !Number.isInteger(metadata.schemaVersion) ||
        typeof metadata.datasetVersion !== "string" ||
        metadata.mode !== "didactic-simulation" ||
        typeof metadata.generatedAt !== "string" ||
        metadata.license !== "MIT" ||
        metadata.contentDigestAlgorithm !== "sha256" ||
        !/^[a-f0-9]{64}$/.test(metadata.contentDigest || "") ||
        metadata.tokenizer?.id !== "o200k_base" ||
        metadata.tokenizer?.implementationVersion !== "3.4.0"
      ) {
        errors.push("Les metadades de procedència no són vàlides.");
      }

      const scenarioIds = new Set();
      dataset.scenarios.forEach((scenario, scenarioIndex) => {
        const prefix = `Escenari ${scenarioIndex + 1}`;
        if (!scenario.id || scenarioIds.has(scenario.id)) {
          errors.push(`${prefix}: identificador absent o duplicat.`);
        }
        scenarioIds.add(scenario.id);

        if (
          !Array.isArray(scenario.promptTokens) ||
          scenario.promptTokens.map((token) => token.text).join("") !==
            scenario.prompt
        ) {
          errors.push(
            `${prefix}: els tokens del context no reconstrueixen el text.`,
          );
        }

        if (
          !Array.isArray(scenario.candidates) ||
          scenario.candidates.length < 2
        ) {
          errors.push(`${prefix}: calen almenys dos candidats.`);
          return;
        }

        const tokenIds = new Set();
        let previousProbability = Infinity;
        let totalProbability = 0;
        scenario.candidates.forEach((candidate) => {
          if (
            !Number.isInteger(candidate.id) ||
            tokenIds.has(candidate.id) ||
            typeof candidate.text !== "string" ||
            candidate.text.length === 0
          ) {
            errors.push(`${prefix}: candidat de token invàlid o duplicat.`);
          }
          tokenIds.add(candidate.id);
          if (
            !Number.isFinite(candidate.probability) ||
            candidate.probability <= 0 ||
            candidate.probability > 1
          ) {
            errors.push(`${prefix}: probabilitat invàlida.`);
          }
          if (candidate.probability > previousProbability + EPSILON) {
            errors.push(`${prefix}: els candidats no estan ordenats.`);
          }
          previousProbability = candidate.probability;
          totalProbability += candidate.probability;
        });

        if (Math.abs(totalProbability - 1) > EPSILON) {
          errors.push(
            `${prefix}: les probabilitats sumen ${totalProbability}, no 1.`,
          );
        }

        const predictionIds = scenario.predictionTokenIds || [];
        if (
          predictionIds.length < 2 ||
          predictionIds.some((tokenId) => !tokenIds.has(tokenId))
        ) {
          errors.push(`${prefix}: opcions de predicció invàlides.`);
        }
      });
      return errors;
    }

    return Object.freeze({
      EPSILON,
      aggregateDisplayRows,
      applyTemperature,
      calculateProgress,
      clampTemperature,
      entropy,
      hashString,
      randomForDraw,
      sampleBatch,
      selectCandidate,
      temperatureBand,
      validateDataset,
    });
  },
);
