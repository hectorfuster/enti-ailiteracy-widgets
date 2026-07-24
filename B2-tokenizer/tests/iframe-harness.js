"use strict";

const eventLog = [];
const frame = document.getElementById("widget");
const output = document.getElementById("events");

const bridge = ENTITokenizerMoodleBridge.create({
  iframe: frame,
  widgetOrigin: window.location.origin,
  onEvent(payload) {
    eventLog.push(payload);
    window.__B2_TEST_EVENTS__ = eventLog;
    output.textContent = JSON.stringify(eventLog.slice(-8), null, 2);
  },
  onResize(height) {
    frame.dataset.reportedHeight = String(height);
  },
});

window.__B2_TEST_BRIDGE__ = bridge;
frame.src = `../index.html?parentOrigin=${encodeURIComponent(window.location.origin)}`;
