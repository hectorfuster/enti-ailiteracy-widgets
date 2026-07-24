(function initHarness() {
  "use strict";

  const iframe = document.getElementById("widgetFrame");
  const log = document.getElementById("messageLog");
  const entries = [];

  function record(type, outcome) {
    entries.push({ type, outcome });
    log.textContent = JSON.stringify(entries, null, 2);
  }

  window.ENTIConsentMirrorMoodleBridge.create({
    iframe,
    widgetOrigin: window.location.origin,
    onProgress(outcome) {
      record("progress", outcome);
    },
    onComplete(outcome) {
      record("complete", outcome);
    },
    onResize(outcome) {
      iframe.style.height = `${outcome.height}px`;
      record("resize", outcome);
    },
  });

  iframe.src =
    window.ENTIConsentMirrorMoodleBridge.withParentOrigin("../index.html");
})();
