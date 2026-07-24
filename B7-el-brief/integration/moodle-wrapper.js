(function initialiseBriefMoodleBridge(globalScope) {
  "use strict";

  const WIDGET_ID = "b7-el-brief";
  const SUPPORTED_VERSION = "2.1.0";
  const MESSAGE_TYPES = new Set([
    "enti-widget-progress",
    "enti-widget-complete",
    "enti-widget-resize",
  ]);

  function isRecord(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype,
    );
  }

  function exactOrigin(value) {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new TypeError("Origins must use HTTP or HTTPS.");
    }
    return url.origin;
  }

  function validProgress(outcome) {
    return Boolean(
      isRecord(outcome) &&
        Number.isInteger(outcome.step) &&
        outcome.step >= 1 &&
        outcome.step <= 5 &&
        typeof outcome.stepLabel === "string" &&
        outcome.stepLabel.length > 0 &&
        outcome.stepLabel.length <= 80 &&
        Number.isInteger(outcome.percent) &&
        outcome.percent >= 0 &&
        outcome.percent <= 100 &&
        typeof outcome.completed === "boolean",
    );
  }

  function validCompletion(outcome) {
    return Boolean(
      isRecord(outcome) &&
        outcome.completed === true &&
        typeof outcome.restored === "boolean",
    );
  }

  function validResize(outcome) {
    return Boolean(
      isRecord(outcome) &&
        Number.isInteger(outcome.height) &&
        outcome.height >= 200 &&
        outcome.height <= 30_000,
    );
  }

  function validPayload(payload) {
    if (
      !isRecord(payload) ||
      payload.widget !== WIDGET_ID ||
      payload.version !== SUPPORTED_VERSION ||
      !MESSAGE_TYPES.has(payload.type)
    ) {
      return false;
    }
    if (payload.type === "enti-widget-progress") {
      return validProgress(payload.outcome);
    }
    if (payload.type === "enti-widget-complete") {
      return validCompletion(payload.outcome);
    }
    return validResize(payload.outcome);
  }

  function create({
    iframe,
    widgetOrigin,
    onProgress = () => {},
    onComplete = () => {},
    onResize = () => {},
  }) {
    if (!iframe || !("contentWindow" in iframe)) {
      throw new TypeError("A mounted B7 iframe is required.");
    }
    const trustedOrigin = exactOrigin(widgetOrigin);
    const callbacks = {
      "enti-widget-progress": onProgress,
      "enti-widget-complete": onComplete,
      "enti-widget-resize": onResize,
    };

    function receive(event) {
      if (
        event.source !== iframe.contentWindow ||
        event.origin !== trustedOrigin ||
        !validPayload(event.data)
      ) {
        return;
      }
      callbacks[event.data.type](event.data.outcome, event.data);
    }

    globalScope.addEventListener("message", receive);
    return {
      destroy() {
        globalScope.removeEventListener("message", receive);
      },
    };
  }

  function withParentOrigin(
    source,
    parentOrigin = globalScope.location.origin,
  ) {
    const url = new URL(source, globalScope.document.baseURI);
    url.searchParams.set("parentOrigin", exactOrigin(parentOrigin));
    return url.href;
  }

  globalScope.ENTIBriefMoodleBridge = Object.freeze({
    WIDGET_ID,
    SUPPORTED_VERSION,
    create,
    validPayload,
    withParentOrigin,
  });
})(window);
