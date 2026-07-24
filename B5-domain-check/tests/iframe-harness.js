"use strict";

window.widgetMessages = [];
const widget = document.getElementById("widget");
widget.src = `/index.html?parentOrigin=${encodeURIComponent(window.location.origin)}`;

window.detachWidget = window.ENTIWidgetBridge.attach(widget, {
  onComplete(payload) {
    window.widgetMessages.push(payload);
  },
  onResize(payload) {
    window.widgetMessages.push(payload);
  },
});
