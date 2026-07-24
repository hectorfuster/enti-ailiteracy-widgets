/**
 * ENTI widget ↔ Moodle iframe bridge (lightweight).
 *
 * Message contract (never use postMessage target "*"):
 *   { type, widget, version, outcome }
 *
 * Types:
 *   enti-widget-complete  — activity finished (once per attempt)
 *   enti-widget-progress  — coarse stage update (optional; no PII)
 *   enti-widget-resize    — { height } in CSS pixels for parent iframe
 *   enti-widget-complete-ack — parent → widget acknowledgement (optional)
 *
 * Parent origin: ?parentOrigin=https://moodle.example.edu  (preferred)
 *                or document.referrer when embedded.
 *
 * See README.md § Moodle iframe contract for the parent listener snippet.
 */
(function (global) {
  "use strict";

  function validParentOrigin() {
    var configured = null;
    try {
      configured = new URLSearchParams(global.location.search).get("parentOrigin");
    } catch (_) {
      /* ignore */
    }
    var candidates = [configured, global.document && global.document.referrer];
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (!candidate) continue;
      try {
        var origin = new URL(candidate).origin;
        if (origin.indexOf("http://") === 0 || origin.indexOf("https://") === 0) {
          return origin;
        }
      } catch (_) {
        /* try next */
      }
    }
    return null;
  }

  /**
   * @param {{ widget: string, version?: string, root?: Element }} options
   */
  function createEntiBridge(options) {
    var widget = options.widget;
    var version = options.version || "1.0.0";
    var root = options.root || global.document.documentElement;
    var completionSent = false;
    var resizeRaf = 0;

    function emit(type, outcome) {
      var payload = {
        type: type,
        widget: widget,
        version: version,
        outcome: outcome || {},
      };
      try {
        global.document.dispatchEvent(
          new CustomEvent(type, { detail: payload })
        );
      } catch (_) {
        /* CustomEvent may fail in very old hosts */
      }
      if (global.parent && global.parent !== global) {
        var targetOrigin = validParentOrigin();
        if (targetOrigin) {
          global.parent.postMessage(payload, targetOrigin);
        }
      }
      return payload;
    }

    function emitComplete(outcome) {
      if (completionSent) return null;
      var base = { completed: true };
      if (outcome && typeof outcome === "object") {
        for (var k in outcome) {
          if (Object.prototype.hasOwnProperty.call(outcome, k)) {
            base[k] = outcome[k];
          }
        }
      }
      var payload = emit("enti-widget-complete", base);
      completionSent = true;
      return payload;
    }

    function emitProgress(outcome) {
      return emit("enti-widget-progress", outcome || {});
    }

    function measureHeight() {
      var doc = global.document.documentElement;
      var body = global.document.body;
      var heights = [
        doc ? doc.scrollHeight : 0,
        doc ? doc.offsetHeight : 0,
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        root && root.scrollHeight ? root.scrollHeight : 0,
      ];
      var h = 0;
      for (var i = 0; i < heights.length; i++) {
        if (heights[i] > h) h = heights[i];
      }
      return Math.max(200, Math.ceil(h));
    }

    function emitResize() {
      return emit("enti-widget-resize", { height: measureHeight() });
    }

    function startResizeObserver() {
      var target =
        root === global.document.documentElement
          ? global.document.body || root
          : root;
      emitResize();
      if (!target || typeof global.ResizeObserver === "undefined") {
        global.addEventListener("load", emitResize);
        return;
      }
      var ro = new global.ResizeObserver(function () {
        global.cancelAnimationFrame(resizeRaf);
        resizeRaf = global.requestAnimationFrame(emitResize);
      });
      ro.observe(target);
      if (global.document.body && target !== global.document.body) {
        ro.observe(global.document.body);
      }
    }

    function onCompleteAck(cb) {
      global.addEventListener("message", function (event) {
        var origin = validParentOrigin();
        if (!origin || event.origin !== origin) return;
        var data = event.data;
        if (
          data &&
          data.type === "enti-widget-complete-ack" &&
          data.widget === widget
        ) {
          cb(data);
        }
      });
    }

    function resetCompletionFlag() {
      completionSent = false;
    }

    startResizeObserver();

    return {
      validParentOrigin: validParentOrigin,
      emit: emit,
      emitComplete: emitComplete,
      emitProgress: emitProgress,
      emitResize: emitResize,
      onCompleteAck: onCompleteAck,
      resetCompletionFlag: resetCompletionFlag,
    };
  }

  global.createEntiBridge = createEntiBridge;
  global.EntiWidgetBridge = { create: createEntiBridge, validParentOrigin: validParentOrigin };
})(typeof window !== "undefined" ? window : globalThis);
