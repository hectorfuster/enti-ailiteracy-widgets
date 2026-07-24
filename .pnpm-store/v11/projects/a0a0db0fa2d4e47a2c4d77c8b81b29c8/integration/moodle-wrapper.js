(function initConsentMirrorBridge(globalScope) {
  "use strict";

  const WIDGET_ID = "b8-consent-mirror";
  const SUPPORTED_VERSION = "2.1.0";
  const MESSAGE_TYPES = new Set([
    "enti-widget-progress",
    "enti-widget-complete",
    "enti-widget-resize",
  ]);
  const STAGE_IDS = new Set([
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
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new TypeError("L’origen ha d’utilitzar HTTP o HTTPS.");
    }
    return url.origin;
  }

  function hasOnlyKeys(record, allowed) {
    return Object.keys(record).every((key) => allowed.has(key));
  }

  function validProgress(outcome) {
    return (
      isRecord(outcome) &&
      hasOnlyKeys(
        outcome,
        new Set(["stageId", "step", "stepLabel", "percent", "completed"]),
      ) &&
      STAGE_IDS.has(outcome.stageId) &&
      Number.isInteger(outcome.step) &&
      outcome.step >= 0 &&
      outcome.step <= 6 &&
      typeof outcome.stepLabel === "string" &&
      outcome.stepLabel.length <= 100 &&
      Number.isInteger(outcome.percent) &&
      outcome.percent >= 0 &&
      outcome.percent <= 100 &&
      typeof outcome.completed === "boolean"
    );
  }

  function validResize(outcome) {
    return (
      isRecord(outcome) &&
      hasOnlyKeys(outcome, new Set(["height"])) &&
      Number.isInteger(outcome.height) &&
      outcome.height >= 200 &&
      outcome.height <= 30_000
    );
  }

  function validCompletion(outcome) {
    return (
      isRecord(outcome) &&
      hasOnlyKeys(outcome, new Set(["completed", "restored"])) &&
      outcome.completed === true &&
      typeof outcome.restored === "boolean"
    );
  }

  function validPayload(payload) {
    if (
      !isRecord(payload) ||
      !hasOnlyKeys(
        payload,
        new Set(["type", "widget", "version", "outcome"]),
      ) ||
      !MESSAGE_TYPES.has(payload.type) ||
      payload.widget !== WIDGET_ID ||
      payload.version !== SUPPORTED_VERSION
    ) {
      return false;
    }
    if (payload.type === "enti-widget-progress") {
      return validProgress(payload.outcome);
    }
    if (payload.type === "enti-widget-resize") {
      return validResize(payload.outcome);
    }
    return validCompletion(payload.outcome);
  }

  function create({
    iframe,
    widgetOrigin,
    onProgress = () => {},
    onComplete = () => {},
    onResize = () => {},
  }) {
    if (!iframe || !("contentWindow" in iframe)) {
      throw new TypeError("Cal un iframe vàlid.");
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

  globalScope.ENTIConsentMirrorMoodleBridge = Object.freeze({
    WIDGET_ID,
    SUPPORTED_VERSION,
    create,
    validPayload,
    withParentOrigin,
  });
})(window);
