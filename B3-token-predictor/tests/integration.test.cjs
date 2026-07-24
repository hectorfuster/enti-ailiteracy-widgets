const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBridge,
  isCompletionPayload,
  isHttpOrigin,
} = require("../integration/moodle-wrapper-example.js");

test("Moodle bridge accepts only exact HTTP(S) origins", () => {
  assert.equal(isHttpOrigin("https://moodle.example.edu"), true);
  assert.equal(isHttpOrigin("http://localhost:8080"), true);
  assert.equal(isHttpOrigin("https://moodle.example.edu/path"), false);
  assert.equal(isHttpOrigin("javascript:alert(1)"), false);
  assert.equal(isHttpOrigin("*"), false);
  assert.equal(isHttpOrigin("not an origin"), false);
});

test("Moodle bridge validates the complete learning-outcome schema", () => {
  const valid = {
    type: "enti-widget-complete",
    widget: "b3-token-predictor",
    version: "3.0.0",
    completionId: "b3-12345678",
    outcome: {
      completed: true,
      predictedScenarios: 3,
      sampleCount: 10,
      temperatureBandCount: 2,
      reflectionCorrect: true,
      datasetVersion: "2026.07.24",
    },
  };
  assert.equal(isCompletionPayload(valid), true);
  assert.equal(
    isCompletionPayload({
      ...valid,
      outcome: { ...valid.outcome, sampleCount: 9 },
    }),
    false,
  );
  assert.equal(isCompletionPayload({ ...valid, version: "2.0.0" }), false);
});

test("Moodle bridge validates source/origin, clamps resize, and acknowledges accepted completion", async () => {
  const listeners = new Map();
  const acknowledgements = [];
  const fakeWindow = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const iframeWindow = {
    postMessage(message, targetOrigin) {
      acknowledgements.push({ message, targetOrigin });
    },
  };
  const iframe = {
    contentWindow: iframeWindow,
    style: {},
  };
  const completions = [];
  global.window = fakeWindow;

  const destroy = createBridge({
    iframe,
    allowedOrigin: "https://widgets.example.edu",
    async onComplete(payload) {
      completions.push(payload);
      return true;
    },
    minHeight: 400,
    maxHeight: 1200,
  });
  const receive = listeners.get("message");

  await receive({
    origin: "https://attacker.example",
    source: iframeWindow,
    data: {
      type: "enti-widget-complete",
      widget: "b3-token-predictor",
      outcome: { completed: true },
    },
  });
  assert.equal(completions.length, 0);

  await receive({
    origin: "https://widgets.example.edu",
    source: iframeWindow,
    data: {
      type: "enti-widget-resize",
      widget: "b3-token-predictor",
      version: "3.0.0",
      height: 99999,
    },
  });
  assert.equal(iframe.style.height, "1200px");

  const payload = {
    type: "enti-widget-complete",
    widget: "b3-token-predictor",
    version: "3.0.0",
    completionId: "b3-12345678",
    outcome: {
      completed: true,
      predictedScenarios: 3,
      sampleCount: 10,
      temperatureBandCount: 2,
      reflectionCorrect: true,
      datasetVersion: "2026.07.24",
    },
  };
  await receive({
    origin: "https://widgets.example.edu",
    source: iframeWindow,
    data: payload,
  });
  await receive({
    origin: "https://widgets.example.edu",
    source: iframeWindow,
    data: payload,
  });
  assert.deepEqual(completions, [payload]);
  assert.deepEqual(acknowledgements, [
    {
      message: {
        type: "enti-widget-complete-ack",
        widget: "b3-token-predictor",
        version: "3.0.0",
        completionId: "b3-12345678",
      },
      targetOrigin: "https://widgets.example.edu",
    },
    {
      message: {
        type: "enti-widget-complete-ack",
        widget: "b3-token-predictor",
        version: "3.0.0",
        completionId: "b3-12345678",
      },
      targetOrigin: "https://widgets.example.edu",
    },
  ]);

  destroy();
  assert.equal(listeners.has("message"), false);
  delete global.window;
});
