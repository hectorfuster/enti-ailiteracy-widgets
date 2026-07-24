(function initialiseHarness() {
  "use strict";

  const iframe = document.getElementById("widgetFrame");
  const log = document.getElementById("messageLog");
  const entries = [];

  function record(type, outcome) {
    entries.push({ type, outcome });
    window.__B7_TEST_EVENTS__ = entries;
    log.textContent = JSON.stringify(entries, null, 2);
  }

  iframe.src = window.ENTIBriefMoodleBridge.withParentOrigin("../index.html");
  window.__B7_TEST_BRIDGE__ = window.ENTIBriefMoodleBridge.create({
    iframe,
    widgetOrigin: window.location.origin,
    onProgress(outcome) {
      record("progress", outcome);
    },
    onComplete(outcome) {
      record("complete", outcome);
    },
    onResize(outcome) {
      iframe.height = String(outcome.height);
      record("resize", outcome);
    },
  });
})();
