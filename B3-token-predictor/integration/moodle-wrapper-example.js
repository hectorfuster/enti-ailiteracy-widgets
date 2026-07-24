(function initEntiWidgetBridge(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.EntiWidgetBridge = api;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function bridgeFactory() {
    "use strict";

    function isHttpOrigin(value) {
      try {
        const url = new URL(value);
        return (
          url.origin === value &&
          (url.protocol === "https:" || url.protocol === "http:")
        );
      } catch {
        return false;
      }
    }

    function isCompletionPayload(data) {
      const outcome = data?.outcome;
      return (
        data?.type === "enti-widget-complete" &&
        data?.widget === "b3-token-predictor" &&
        data?.version === "3.0.0" &&
        typeof data.completionId === "string" &&
        /^b3-[a-z0-9-]{8,100}$/i.test(data.completionId) &&
        outcome?.completed === true &&
        Number.isInteger(outcome.predictedScenarios) &&
        outcome.predictedScenarios >= 3 &&
        Number.isInteger(outcome.sampleCount) &&
        outcome.sampleCount >= 10 &&
        Number.isInteger(outcome.temperatureBandCount) &&
        outcome.temperatureBandCount >= 2 &&
        outcome.reflectionCorrect === true &&
        outcome.datasetVersion === "2026.07.24"
      );
    }

    function createBridge({
      iframe,
      allowedOrigin,
      onComplete,
      minHeight = 400,
      maxHeight = 10000,
    }) {
      if (!iframe || !iframe.contentWindow) {
        throw new TypeError("A connected widget iframe is required.");
      }
      if (!isHttpOrigin(allowedOrigin)) {
        throw new TypeError("allowedOrigin must be an exact HTTP(S) origin.");
      }
      if (typeof onComplete !== "function") {
        throw new TypeError("onComplete must be a function.");
      }

      const acceptedCompletionIds = new Set();
      const pendingCompletions = new Map();

      function acknowledge(completionId) {
        iframe.contentWindow.postMessage(
          {
            type: "enti-widget-complete-ack",
            widget: "b3-token-predictor",
            version: "3.0.0",
            completionId,
          },
          allowedOrigin,
        );
      }

      async function receive(event) {
        if (
          event.origin !== allowedOrigin ||
          event.source !== iframe.contentWindow ||
          event.data?.widget !== "b3-token-predictor" ||
          event.data?.version !== "3.0.0"
        ) {
          return;
        }

        if (event.data.type === "enti-widget-resize") {
          const requested = Math.ceil(Number(event.data.height));
          if (!Number.isFinite(requested)) return;
          const height = Math.min(maxHeight, Math.max(minHeight, requested));
          iframe.style.height = `${height}px`;
          return;
        }

        if (!isCompletionPayload(event.data)) {
          return;
        }

        if (acceptedCompletionIds.has(event.data.completionId)) {
          acknowledge(event.data.completionId);
          return;
        }

        let acceptance = pendingCompletions.get(event.data.completionId);
        if (!acceptance) {
          acceptance = Promise.resolve()
            .then(() => onComplete(event.data))
            .then((result) => result !== false)
            .catch(() => false);
          pendingCompletions.set(event.data.completionId, acceptance);
        }
        const accepted = await acceptance;
        if (pendingCompletions.get(event.data.completionId) === acceptance) {
          pendingCompletions.delete(event.data.completionId);
        }
        if (accepted === false) return;
        acceptedCompletionIds.add(event.data.completionId);
        acknowledge(event.data.completionId);
      }

      window.addEventListener("message", receive);
      return function destroyBridge() {
        window.removeEventListener("message", receive);
      };
    }

    return Object.freeze({ createBridge, isCompletionPayload, isHttpOrigin });
  },
);
