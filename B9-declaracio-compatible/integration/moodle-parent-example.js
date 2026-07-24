const NAMESPACE = "enti.ai-literacy.widget";
const PROTOCOL_VERSION = 1;
const WIDGET_ID = "B9-declaracio-compatible";
const WIDGET_VERSION = "2.0.0";
const ALLOWED_TYPES = new Set([
  "enti.widget.ready",
  "enti.widget.resize",
  "enti.widget.progress",
  "enti.widget.complete",
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHttpOrigin(value) {
  try {
    const url = new URL(value);
    const originOnly =
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      (url.pathname === "/" || url.pathname === "") &&
      !url.search &&
      !url.hash;
    return originOnly ? url.origin : "";
  } catch {
    return "";
  }
}

export function validateWidgetMessage(data) {
  if (
    !isRecord(data) ||
    data.namespace !== NAMESPACE ||
    data.protocolVersion !== PROTOCOL_VERSION ||
    data.widgetId !== WIDGET_ID ||
    data.widgetVersion !== WIDGET_VERSION ||
    !ALLOWED_TYPES.has(data.type)
  ) {
    return false;
  }

  if (data.type === "enti.widget.ready" || data.type === "enti.widget.resize") {
    return Number.isFinite(data.height);
  }

  if (data.type === "enti.widget.progress") {
    return (
      Number.isInteger(data.step) &&
      Number.isInteger(data.total) &&
      data.step >= 1 &&
      data.total === 5 &&
      data.step <= data.total
    );
  }

  return data.milestone === "transfer-case-complete";
}

export function clampWidgetHeight(height) {
  return Math.max(320, Math.min(5000, Math.ceil(height)));
}

/**
 * Example parent-side adapter.
 *
 * `onComplete` must call a supported Moodle activity/plugin API owned by the
 * deployment. A postMessage event alone is not Moodle completion.
 */
export function createMoodleParentBridge({
  hostWindow,
  iframe,
  widgetOrigin,
  onProgress = () => {},
  onComplete = () => {},
}) {
  const allowedOrigin = normalizeHttpOrigin(widgetOrigin);
  if (!allowedOrigin) {
    throw new TypeError("widgetOrigin must be an exact HTTP(S) origin");
  }
  if (
    !hostWindow?.addEventListener ||
    !hostWindow?.removeEventListener ||
    !iframe?.contentWindow ||
    !iframe?.style
  ) {
    throw new TypeError("A host window and iframe are required");
  }

  let completionHandled = false;

  const handleMessage = (event) => {
    if (
      event.origin !== allowedOrigin ||
      event.source !== iframe.contentWindow ||
      !validateWidgetMessage(event.data)
    ) {
      return;
    }

    const { data } = event;
    if (
      data.type === "enti.widget.ready" ||
      data.type === "enti.widget.resize"
    ) {
      iframe.style.height = `${clampWidgetHeight(data.height)}px`;
      return;
    }

    if (data.type === "enti.widget.progress") {
      onProgress({ step: data.step, total: data.total });
      return;
    }

    if (!completionHandled) {
      completionHandled = true;
      onComplete({
        milestone: data.milestone,
        widgetId: data.widgetId,
        widgetVersion: data.widgetVersion,
      });
    }
  };

  hostWindow.addEventListener("message", handleMessage);

  return {
    disconnect() {
      hostWindow.removeEventListener("message", handleMessage);
    },
  };
}
