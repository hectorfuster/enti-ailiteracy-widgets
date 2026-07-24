(function exposeTokenizerMoodleBridge(root) {
  "use strict";

  const WIDGET_ID = "b2-tokenizer";
  const SUPPORTED_VERSIONS = new Set(["2.0.0", "2.1.0", "2.2.0"]);
  const EVENT_TYPES = new Set([
    "enti-widget-progress",
    "enti-widget-complete",
    "enti-widget-resize",
  ]);

  function normalizeOrigin(value) {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new TypeError("widgetOrigin must use http or https.");
    }
    return url.origin;
  }

  function validPayload(payload) {
    return Boolean(
      payload &&
        typeof payload === "object" &&
        payload.widget === WIDGET_ID &&
        SUPPORTED_VERSIONS.has(payload.version) &&
        EVENT_TYPES.has(payload.type) &&
        payload.outcome &&
        typeof payload.outcome === "object",
    );
  }

  function create(options = {}) {
    const iframe = options.iframe;
    if (!iframe || !iframe.contentWindow) {
      throw new TypeError("A mounted tokenizer iframe is required.");
    }

    const widgetOrigin = normalizeOrigin(options.widgetOrigin);
    const onEvent =
      typeof options.onEvent === "function" ? options.onEvent : () => {};
    const onProgress =
      typeof options.onProgress === "function" ? options.onProgress : () => {};
    const onComplete =
      typeof options.onComplete === "function" ? options.onComplete : () => {};
    const onResize =
      typeof options.onResize === "function" ? options.onResize : () => {};

    function handleMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.origin !== widgetOrigin) return;
      if (!validPayload(event.data)) return;

      const payload = event.data;
      onEvent(payload);
      if (payload.type === "enti-widget-progress")
        onProgress(payload.outcome, payload);
      if (payload.type === "enti-widget-complete")
        onComplete(payload.outcome, payload);
      if (payload.type === "enti-widget-resize") {
        const height = Number(payload.outcome.height);
        if (!Number.isFinite(height) || height < 200 || height > 30000) return;
        onResize(height, payload);
      }
    }

    window.addEventListener("message", handleMessage);
    return {
      widgetOrigin,
      destroy() {
        window.removeEventListener("message", handleMessage);
      },
    };
  }

  root.ENTITokenizerMoodleBridge = Object.freeze({
    create,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
