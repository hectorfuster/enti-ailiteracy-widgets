(function initializeHarness() {
  "use strict";

  const iframe = document.getElementById("widget");
  const events = document.getElementById("events");
  const origin = globalThis.location.origin;
  iframe.src = `../index.html?parentOrigin=${encodeURIComponent(origin)}`;

  const bridge = globalThis.EntiWidgetMoodle.createBridge({
    iframe,
    widgetOrigin: origin,
    widget: "b6-auditoria-fuga",
    onEvent(event) {
      events.textContent += `${JSON.stringify(event, null, 2)}\n`;
    },
  });

  document.getElementById("reset").addEventListener("click", () => {
    bridge.reset();
  });
})();
