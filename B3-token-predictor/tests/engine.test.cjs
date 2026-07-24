const test = require("node:test");
const assert = require("node:assert/strict");
const Engine = require("../engine.js");
const Dataset = require("../scenario-data.js");

test("dataset passes all structural and probability checks", () => {
  assert.deepEqual(Engine.validateDataset(Dataset), []);
});

test("temperature 1 preserves every base probability", () => {
  for (const scenario of Dataset.scenarios) {
    const distribution = Engine.applyTemperature(scenario.candidates, 1);
    distribution.forEach((candidate, index) => {
      assert.ok(
        Math.abs(
          candidate.adjustedProbability -
            scenario.candidates[index].probability,
        ) < Engine.EPSILON,
      );
    });
  }
});

test("temperature 0 is deterministic and selects the first maximum", () => {
  for (const scenario of Dataset.scenarios) {
    const distribution = Engine.applyTemperature(scenario.candidates, 0);
    assert.equal(distribution[0].adjustedProbability, 1);
    distribution.slice(1).forEach((candidate) => {
      assert.equal(candidate.adjustedProbability, 0);
    });
  }
});

test("temperature distributions stay normalized and preserve ranking", () => {
  for (const scenario of Dataset.scenarios) {
    for (const temperature of [0, 0.3, 0.5, 1, 1.5, 2]) {
      const distribution = Engine.applyTemperature(
        scenario.candidates,
        temperature,
      );
      const total = distribution.reduce(
        (sum, candidate) => sum + candidate.adjustedProbability,
        0,
      );
      assert.ok(Math.abs(total - 1) < Engine.EPSILON);
      for (let index = 1; index < distribution.length; index += 1) {
        assert.ok(
          distribution[index - 1].adjustedProbability + Engine.EPSILON >=
            distribution[index].adjustedProbability,
        );
      }
    }
  }
});

test("entropy grows as positive temperature flattens each scenario", () => {
  for (const scenario of Dataset.scenarios) {
    const low = Engine.entropy(
      Engine.applyTemperature(scenario.candidates, 0.5),
    );
    const base = Engine.entropy(
      Engine.applyTemperature(scenario.candidates, 1),
    );
    const high = Engine.entropy(
      Engine.applyTemperature(scenario.candidates, 1.5),
    );
    assert.ok(low < base);
    assert.ok(base < high);
  }
});

test("display aggregation happens after temperature and preserves total mass", () => {
  for (const scenario of Dataset.scenarios) {
    const distribution = Engine.applyTemperature(scenario.candidates, 1.5);
    const rows = Engine.aggregateDisplayRows(distribution, 6);
    assert.equal(rows.length, 7);
    assert.equal(rows.at(-1).isAggregate, true);
    const baseTotal = rows.reduce((sum, row) => sum + row.probability, 0);
    const adjustedTotal = rows.reduce(
      (sum, row) => sum + row.adjustedProbability,
      0,
    );
    assert.ok(Math.abs(baseTotal - 1) < Engine.EPSILON);
    assert.ok(Math.abs(adjustedTotal - 1) < Engine.EPSILON);
  }
});

test("seeded draws are exactly reproducible", () => {
  const scenario = Dataset.scenarios[1];
  const parameters = {
    candidates: scenario.candidates,
    temperature: 1.3,
    seed: "repeatable",
    scenarioId: scenario.id,
    startIndex: 0,
    count: 100,
  };
  const first = Engine.sampleBatch(parameters);
  const second = Engine.sampleBatch(parameters);
  assert.deepEqual(first.draws, second.draws);
  assert.deepEqual(first.counts, second.counts);
});

test("large seeded batches approximate the configured probabilities", () => {
  for (const scenario of Dataset.scenarios) {
    const result = Engine.sampleBatch({
      candidates: scenario.candidates,
      temperature: 1,
      seed: "frequency-fixture",
      scenarioId: scenario.id,
      startIndex: 0,
      count: 25000,
    });
    for (const candidate of scenario.candidates) {
      const observed = (result.counts[candidate.id] || 0) / 25000;
      assert.ok(
        Math.abs(observed - candidate.probability) < 0.015,
        `${scenario.id} token ${candidate.id}: ${observed} vs ${candidate.probability}`,
      );
    }
  }
});

test("progress requires meaningful evidence before completion", () => {
  const state = {
    scenarios: {
      one: {
        predictionTokenId: 1,
        drawCount: 5,
        sampledBands: ["natural"],
      },
      two: {
        predictionTokenId: 2,
        drawCount: 5,
        sampledBands: ["high"],
      },
      three: {
        predictionTokenId: 3,
        drawCount: 0,
        sampledBands: [],
      },
    },
    reflectionCorrect: true,
    completed: false,
  };
  const progress = Engine.calculateProgress(state);
  assert.equal(progress.milestones.predictions, true);
  assert.equal(progress.milestones.samples, true);
  assert.equal(progress.milestones.temperatures, true);
  assert.equal(progress.milestones.reflection, true);
  assert.equal(progress.milestones.completed, false);
  assert.equal(progress.readyToComplete, true);
});
