(function initMoodleWrapper(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EntiWidgetMoodle = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createApi() {
  "use strict";

  const SOURCE = "enti-ai-literacy-widget";
  const VALID_TYPES = new Set([
    "enti-widget-ready",
    "enti-widget-resize",
    "enti-widget-progress",
    "enti-widget-complete",
    "enti-widget-reset",
  ]);

  function createBridge(options) {
    const iframe = options.iframe;
    const widgetOrigin = new URL(options.widgetOrigin).origin;
    const widget = options.widget || "b6-auditoria-fuga";
    const onEvent =
      typeof options.onEvent === "function" ? options.onEvent : () => {};

    function receive(event) {
      if (
        event.origin !== widgetOrigin ||
        event.source !== iframe.contentWindow ||
        event.data?.source !== SOURCE ||
        event.data?.widget !== widget ||
        !VALID_TYPES.has(event.data?.type)
      ) {
        return;
      }

      if (event.data.type === "enti-widget-resize") {
        const height = Number(event.data.outcome?.height);
        if (Number.isFinite(height) && height >= 240 && height <= 20000) {
          iframe.style.height = `${Math.ceil(height)}px`;
          iframe.dataset.reportedHeight = String(Math.ceil(height));
        }
      }
      onEvent(event.data);
    }

    globalThis.addEventListener("message", receive);

    return Object.freeze({
      destroy() {
        globalThis.removeEventListener("message", receive);
      },
      reset() {
        iframe.contentWindow?.postMessage(
          {
            source: SOURCE,
            widget,
            type: "enti-widget-reset",
          },
          widgetOrigin,
        );
      },
    });
  }

  return Object.freeze({ createBridge });
});
