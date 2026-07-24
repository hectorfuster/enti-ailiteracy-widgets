(function initializeEntiWidgetBridge(global) {
  "use strict";

  const MESSAGE_SCHEMA_VERSION = 1;
  const DEFAULT_WIDGET = "B5-domain-check";
  const MINIMUM_HEIGHT = 200;
  const MAXIMUM_HEIGHT = 30_000;

  function iframeOrigin(iframe) {
    const url = new URL(iframe.src, global.location.href);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("The widget iframe must use an HTTP(S) URL.");
    }
    return url.origin;
  }

  function attach(iframe, options = {}) {
    if (!(iframe instanceof HTMLIFrameElement)) {
      throw new TypeError("attach() requires an iframe element.");
    }

    const expectedOrigin = iframeOrigin(iframe);
    const expectedWidget = options.widget || DEFAULT_WIDGET;
    let completionHandled = false;

    function handleMessage(event) {
      if (
        event.source !== iframe.contentWindow ||
        event.origin !== expectedOrigin ||
        !event.data ||
        event.data.schemaVersion !== MESSAGE_SCHEMA_VERSION ||
        event.data.widget !== expectedWidget
      ) {
        return;
      }

      if (event.data.type === "enti-widget-resize") {
        const height = Number(event.data.height);
        if (
          !Number.isInteger(height) ||
          height < MINIMUM_HEIGHT ||
          height > MAXIMUM_HEIGHT
        ) {
          return;
        }
        iframe.style.height = `${height}px`;
        options.onResize?.(event.data);
        return;
      }

      if (
        event.data.type !== "enti-widget-complete" ||
        event.data.outcome?.completed !== true ||
        completionHandled
      ) {
        return;
      }

      completionHandled = true;
      options.onComplete?.(event.data);
      iframe.contentWindow.postMessage(
        {
          type: "enti-widget-complete-ack",
          schemaVersion: MESSAGE_SCHEMA_VERSION,
          widget: expectedWidget,
        },
        expectedOrigin,
      );
    }

    global.addEventListener("message", handleMessage);
    return function detach() {
      global.removeEventListener("message", handleMessage);
    };
  }

  global.ENTIWidgetBridge = Object.freeze({
    attach,
    messageSchemaVersion: MESSAGE_SCHEMA_VERSION,
  });
})(window);
