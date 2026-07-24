# Moodle wrapper integration

The learner-facing widget deliberately has no direct Moodle dependency. A
course-specific parent wrapper translates its completion event into the
completion mechanism selected by the Moodle administrator.

## Embed

Pass the exact parent origin to the widget and give the iframe a descriptive
title:

```html
<iframe
  id="b3-widget"
  title="Activitat B3: laboratori del token següent"
  src="https://widgets.example.edu/B3-token-predictor/?parentOrigin=https%3A%2F%2Fmoodle.example.edu"
  loading="lazy"
></iframe>
```

Do not use a wildcard origin.

## Bridge

Load `moodle-wrapper-example.js` from the Moodle-controlled parent and provide
the real completion adapter:

```js
const iframe = document.getElementById("b3-widget");

EntiWidgetBridge.createBridge({
  iframe,
  allowedOrigin: "https://widgets.example.edu",
  async onComplete(payload) {
    // Validate the user/session and call the approved Moodle-side completion
    // endpoint. Return true only after Moodle accepts the update.
    return markActivityComplete(payload);
  },
});
```

The bridge:

- checks the exact message origin and `event.source`;
- accepts only the exact widget ID, contract version, completion ID, and
  learning-outcome schema;
- clamps resize messages before changing the iframe height;
- coalesces concurrent duplicates and acknowledges completion only after
  `onComplete` succeeds.

The widget distinguishes local completion, completion sent to a parent, and a
Moodle-acknowledged completion. It never claims Moodle has recorded progress
without the acknowledgement.

`completionId` is stable across retries. The example bridge suppresses
duplicates for its current page lifetime; the real Moodle adapter must also
store or otherwise enforce this idempotency key across parent reloads. Return
`false` or throw from `onComplete` when Moodle did not accept the update.

The static iframe is suitable for Moodle web and online in-app webviews that
allow the configured widget origin. It is not an offline Moodle-app package.
If offline attempts, grading, or standards-based attempt reporting are
required, package the activity as H5P/SCORM or use an LTI integration and test
that delivery path separately.

Serve both origins over HTTPS and apply the response headers in `../SECURITY.md`.
