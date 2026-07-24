import assert from "node:assert/strict";
import test from "node:test";

import {
  clampWidgetHeight,
  createMoodleParentBridge,
  normalizeHttpOrigin,
  validateWidgetMessage,
} from "../integration/moodle-parent-example.js";

const baseMessage = {
  namespace: "enti.ai-literacy.widget",
  protocolVersion: 1,
  widgetId: "B9-declaracio-compatible",
  widgetVersion: "2.0.0",
};

function fakeHost() {
  let listener;
  return {
    addEventListener(type, callback) {
      assert.equal(type, "message");
      listener = callback;
    },
    removeEventListener(type, callback) {
      assert.equal(type, "message");
      assert.equal(callback, listener);
      listener = undefined;
    },
    send(event) {
      listener?.(event);
    },
    hasListener() {
      return Boolean(listener);
    },
  };
}

test("origin normalization accepts origins and rejects paths or unsafe schemes", () => {
  assert.equal(
    normalizeHttpOrigin("https://widgets.example.edu/"),
    "https://widgets.example.edu",
  );
  assert.equal(normalizeHttpOrigin("https://widgets.example.edu/path"), "");
  assert.equal(
    normalizeHttpOrigin("https://user:secret@widgets.example.edu"),
    "",
  );
  assert.equal(normalizeHttpOrigin("javascript:alert(1)"), "");
  assert.equal(normalizeHttpOrigin("not a URL"), "");
});

test("message validator enforces namespace, version, type, and payload", () => {
  assert.equal(
    validateWidgetMessage({
      ...baseMessage,
      type: "enti.widget.progress",
      step: 4,
      total: 5,
    }),
    true,
  );
  assert.equal(
    validateWidgetMessage({
      ...baseMessage,
      type: "enti.widget.progress",
      step: 7,
      total: 5,
    }),
    false,
  );
  assert.equal(
    validateWidgetMessage({
      ...baseMessage,
      type: "unknown",
    }),
    false,
  );
  assert.equal(
    validateWidgetMessage({
      ...baseMessage,
      protocolVersion: 2,
      type: "enti.widget.resize",
      height: 900,
    }),
    false,
  );
  assert.equal(
    validateWidgetMessage({
      ...baseMessage,
      widgetVersion: "3.0.0",
      type: "enti.widget.resize",
      height: 900,
    }),
    false,
  );
});

test("height clamp rejects iframe extremes", () => {
  assert.equal(clampWidgetHeight(10), 320);
  assert.equal(clampWidgetHeight(842.2), 843);
  assert.equal(clampWidgetHeight(10000), 5000);
});

test("parent bridge validates origin/source, resizes, reports progress, and completes once", () => {
  const hostWindow = fakeHost();
  const contentWindow = {};
  const iframe = { contentWindow, style: {} };
  const progress = [];
  const completions = [];

  const bridge = createMoodleParentBridge({
    hostWindow,
    iframe,
    widgetOrigin: "https://widgets.example.edu",
    onProgress: (value) => progress.push(value),
    onComplete: (value) => completions.push(value),
  });

  hostWindow.send({
    origin: "https://evil.example",
    source: contentWindow,
    data: { ...baseMessage, type: "enti.widget.resize", height: 900 },
  });
  hostWindow.send({
    origin: "https://widgets.example.edu",
    source: {},
    data: { ...baseMessage, type: "enti.widget.resize", height: 900 },
  });
  assert.equal(iframe.style.height, undefined);

  hostWindow.send({
    origin: "https://widgets.example.edu",
    source: contentWindow,
    data: { ...baseMessage, type: "enti.widget.resize", height: 842.2 },
  });
  assert.equal(iframe.style.height, "843px");

  hostWindow.send({
    origin: "https://widgets.example.edu",
    source: contentWindow,
    data: {
      ...baseMessage,
      type: "enti.widget.progress",
      step: 4,
      total: 5,
    },
  });
  assert.deepEqual(progress, [{ step: 4, total: 5 }]);

  const completionMessage = {
    ...baseMessage,
    type: "enti.widget.complete",
    milestone: "transfer-case-complete",
  };
  hostWindow.send({
    origin: "https://widgets.example.edu",
    source: contentWindow,
    data: completionMessage,
  });
  hostWindow.send({
    origin: "https://widgets.example.edu",
    source: contentWindow,
    data: completionMessage,
  });
  assert.equal(completions.length, 1);
  assert.deepEqual(completions[0], {
    milestone: "transfer-case-complete",
    widgetId: "B9-declaracio-compatible",
    widgetVersion: "2.0.0",
  });

  bridge.disconnect();
  assert.equal(hostWindow.hasListener(), false);
});

test("parent bridge rejects incomplete configuration", () => {
  assert.throws(
    () =>
      createMoodleParentBridge({
        hostWindow: fakeHost(),
        iframe: { contentWindow: {}, style: {} },
        widgetOrigin: "https://widgets.example.edu/path",
      }),
    /exact HTTP\(S\) origin/,
  );
});
