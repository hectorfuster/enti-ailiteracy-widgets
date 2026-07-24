# B9 — Què és compatible amb això?

Small, local-first Moodle companion activity about precise AI-use disclosure.

The learner sees the real process and all eight comparison cases before making
any choice. They then choose three details:

1. the purpose of the AI use;
2. the affected scope;
3. the human contribution.

The page immediately shows which cases still fit the declaration. There is no
prediction quiz, reflection quiz, transfer round, score, or forced tutorial.

## Run

Open `index.html` directly or serve the repository:

```powershell
python -m http.server 8000 --directory ..
```

The deployable runtime is `widget.js`, a classic script that works without
`file:` module imports.

## Develop and validate

The source remains modular:

- `content.js` — cases and disclosure clauses;
- `disclosure-core.js` — pure evaluator and content validation;
- `app.js` — single-screen interaction and optional Moodle bridge;
- `styles.css` — responsive and accessible presentation;
- `widget.js` — generated deployable runtime.

After editing source:

```powershell
npm.cmd run build
npm.cmd run validate
```

Validation checks bundle freshness, all disclosure combinations, wrong-case and
contradiction handling, content integrity, Moodle messaging, runtime size,
local-only assets, and structural accessibility hooks. No install step is
required.

## Moodle modes

With an empty `enti-parent-origin` meta value, the widget is standalone and
sends nothing.

A trusted wrapper may set an exact origin:

```html
<meta name="enti-parent-origin" content="https://moodle.example.edu">
```

The iframe then sends only:

| Type | Payload |
|---|---|
| `enti.widget.ready` | document height |
| `enti.widget.resize` | updated document height |
| `enti.widget.progress` | `0/1` or `1/1` |
| `enti.widget.complete` | `disclosure-case-complete` |

Every message uses protocol version 1 and widget version 2.1.0. No choice,
scenario identifier, compatible-case set, or declaration text leaves the
widget. The tested parent adapter is
`integration/moodle-parent-example.js`.

## Content boundary

The activity checks whether a structured declaration is truthful, complete, and
specific within eight fictional teaching cases. It does not decide whether the
AI use was allowed. Course-specific disclosure requirements must still be
stated next to the Moodle activity.

## Release checks

`npm.cmd run validate` must pass. Before production, also complete the compact
manual matrix in `VALIDATION.md`, especially keyboard, mobile reflow,
assistive-technology announcements, and the real Moodle iframe.
