const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const { resolve } = require("node:path");

function loadBridge() {
  const listeners = new Map();
  const fakeWindow = {
    location: { origin: "https://moodle.example" },
    document: { baseURI: "https://moodle.example/course/" },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const source = readFileSync(
    resolve(__dirname, "../integration/moodle-wrapper.js"),
    "utf8",
  );
  vm.runInNewContext(source, {
    window: fakeWindow,
    URL,
    Set,
    Object,
    Array,
    Number,
    Boolean,
    TypeError,
  });
  return {
    fakeWindow,
    listeners,
    bridge: fakeWindow.ENTIConsentMirrorMoodleBridge,
  };
}

test("the wrapper accepts only the documented privacy-safe schema", () => {
  const { bridge } = loadBridge();
  const base = {
    widget: "b8-consent-mirror",
    version: "2.1.0",
  };
  assert.equal(
    bridge.validPayload({
      ...base,
      type: "enti-widget-progress",
      outcome: {
        stageId: "mirror",
        step: 4,
        stepLabel: "El mirall · 2 de 5",
        percent: 65,
        completed: false,
      },
    }),
    true,
  );
  assert.equal(
    bridge.validPayload({
      ...base,
      type: "enti-widget-complete",
      outcome: { completed: true, restored: false },
    }),
    true,
  );
  assert.equal(
    bridge.validPayload({
      ...base,
      type: "enti-widget-resize",
      outcome: { height: 900 },
    }),
    true,
  );

  for (const forbidden of ["answers", "reason", "note", "attemptId"]) {
    assert.equal(
      bridge.validPayload({
        ...base,
        type: "enti-widget-complete",
        outcome: { completed: true, restored: false, [forbidden]: "private" },
      }),
      false,
    );
  }
  assert.equal(
    bridge.validPayload({
      ...base,
      type: "enti-widget-progress",
      outcome: {
        stageId: "unknown",
        step: 4,
        stepLabel: "El mirall · 2 de 5",
        percent: 65,
        completed: false,
      },
    }),
    false,
  );
});

test("the receiver enforces both event source and exact origin", () => {
  const { listeners, bridge } = loadBridge();
  const iframeWindow = {};
  const iframe = { contentWindow: iframeWindow };
  let accepted = 0;
  const connection = bridge.create({
    iframe,
    widgetOrigin: "https://widget.example/path",
    onComplete() {
      accepted += 1;
    },
  });
  const payload = {
    widget: "b8-consent-mirror",
    version: "2.1.0",
    type: "enti-widget-complete",
    outcome: { completed: true, restored: false },
  };
  const receive = listeners.get("message");
  receive({
    source: iframeWindow,
    origin: "https://widget.example",
    data: payload,
  });
  receive({
    source: {},
    origin: "https://widget.example",
    data: payload,
  });
  receive({
    source: iframeWindow,
    origin: "https://attacker.example",
    data: payload,
  });
  assert.equal(accepted, 1);
  connection.destroy();
  assert.equal(listeners.has("message"), false);
});

test("parentOrigin is canonicalised and non-HTTP schemes are refused", () => {
  const { bridge } = loadBridge();
  assert.equal(
    bridge
      .withParentOrigin("./widget", "https://moodle.example/course")
      .toString(),
    "https://moodle.example/course/widget?parentOrigin=https%3A%2F%2Fmoodle.example",
  );
  assert.throws(
    () => bridge.withParentOrigin("./widget", "javascript:alert(1)"),
    TypeError,
  );
});
