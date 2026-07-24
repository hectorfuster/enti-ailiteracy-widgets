import {
  ACTIVITY_CONVENTION,
  DISCLOSURE_GROUPS,
  LONG_VAGUE_SELECTIONS,
  WIDGET_ID,
  WIDGET_VERSION,
  WORKED_SCENARIO,
  WORLDS,
} from "./content.js";
import {
  compareWorldSets,
  evaluateDisclosure,
  getGroup,
  getOption,
  validateContent,
} from "./disclosure-core.js";

const REQUIRED_GROUPS = ACTIVITY_CONVENTION.requiredGroupIds;
const PROCESS_GROUP_IDS = ["purpose", "extent", "human"];
const VISIBLE_OPTIONS = Object.freeze({
  purpose: [
    "purpose-vague",
    "purpose-structure",
    "purpose-full-draft",
    "purpose-translate",
  ],
  extent: [
    "extent-document",
    "extent-outline-only",
    "extent-full-draft",
    "extent-outline-section",
  ],
  human: [
    "human-reviewed",
    "human-authored-all",
    "human-outline",
    "human-full-draft",
  ],
});

function byId(id) {
  return document.getElementById(id);
}

function listFacts(element, facts) {
  element.replaceChildren(
    ...facts.map((fact) => {
      const item = document.createElement("li");
      item.textContent = fact;
      return item;
    }),
  );
}

class MoodleBridge {
  constructor() {
    const configuredOrigin =
      document
        .querySelector('meta[name="enti-parent-origin"]')
        ?.getAttribute("content")
        ?.trim() ?? "";
    this.parentOrigin = this.normalizeOrigin(configuredOrigin);
    this.enabled = Boolean(
      this.parentOrigin && window.parent && window.parent !== window,
    );
    this.completionSent = false;
    this.resizeTimer = undefined;
  }

  normalizeOrigin(value) {
    if (!value) {
      return "";
    }
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

  post(type, payload = {}) {
    if (!this.enabled) {
      return;
    }
    window.parent.postMessage(
      {
        namespace: "enti.ai-literacy.widget",
        type,
        protocolVersion: 1,
        widgetId: WIDGET_ID,
        widgetVersion: WIDGET_VERSION,
        ...payload,
      },
      this.parentOrigin,
    );
  }

  ready() {
    this.post("enti.widget.ready", {
      height: Math.ceil(document.documentElement.scrollHeight),
    });
  }

  progress(done) {
    this.post("enti.widget.progress", { step: done ? 1 : 0, total: 1 });
  }

  complete() {
    if (this.completionSent) {
      return;
    }
    this.completionSent = true;
    this.post("enti.widget.complete", {
      milestone: "disclosure-case-complete",
    });
  }

  observeResize() {
    if (!this.enabled || !("ResizeObserver" in window)) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        this.post("enti.widget.resize", {
          height: Math.ceil(document.documentElement.scrollHeight),
        });
      }, 120);
    });
    this.resizeObserver.observe(document.body);
  }
}

const contentErrors = validateContent({
  worlds: WORLDS,
  groups: DISCLOSURE_GROUPS,
  policy: ACTIVITY_CONVENTION,
  scenarios: [WORKED_SCENARIO],
});

if (contentErrors.length > 0) {
  byId("startup-status").className = "notice notice-error";
  byId("startup-status").replaceChildren(
    "El contingut de l'activitat no ha superat la validació.",
  );
  throw new Error(contentErrors.join("\n"));
}

const bridge = new MoodleBridge();
let selections = { tool: "tool-generic" };
let previousCompatible = [...WORLDS];

function evaluate() {
  return evaluateDisclosure({
    worlds: WORLDS,
    groups: DISCLOSURE_GROUPS,
    selections,
    targetWorldId: WORKED_SCENARIO.targetWorldId,
    requiredGroupIds: REQUIRED_GROUPS,
  });
}

function renderGroups() {
  byId("groups").replaceChildren(
    ...PROCESS_GROUP_IDS.map((groupId, index) => {
      const group = getGroup(DISCLOSURE_GROUPS, groupId);
      const fieldset = document.createElement("fieldset");
      fieldset.className = "disclosure-field";

      const legend = document.createElement("legend");
      legend.textContent = `${index + 1}. ${group.stepLabel}`;

      const choices = document.createElement("div");
      choices.className = "choice-list";

      for (const optionId of VISIBLE_OPTIONS[groupId]) {
        const option = getOption(DISCLOSURE_GROUPS, groupId, optionId);
        const label = document.createElement("label");
        label.className = "choice";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = groupId;
        input.value = optionId;
        input.checked = selections[groupId] === optionId;
        input.addEventListener("change", () => {
          selections[groupId] = optionId;
          render();
        });

        const text = document.createElement("span");
        text.textContent = option.label.replaceAll("«", "").replaceAll("»", "");
        label.append(input, text);
        choices.append(label);
      }

      fieldset.append(legend, choices);
      return fieldset;
    }),
  );
}

function syncGroupInputs() {
  byId("groups")
    .querySelectorAll('input[type="radio"]')
    .forEach((input) => {
      input.checked = selections[input.name] === input.value;
    });
}

function renderWorlds(result) {
  const compatibleIds = new Set(result.compatible.map((world) => world.id));

  byId("worlds").replaceChildren(
    ...WORLDS.map((world) => {
      const isTarget = world.id === WORKED_SCENARIO.targetWorldId;
      const isCompatible = compatibleIds.has(world.id);
      const article = document.createElement("article");
      article.className = "world-card";
      article.classList.toggle("is-target", isTarget);
      article.classList.toggle("is-compatible", isCompatible);
      article.classList.toggle("is-excluded", !isCompatible);

      const badge = document.createElement("span");
      badge.className = "world-state";
      badge.textContent = isTarget
        ? "cas real"
        : isCompatible
          ? "encara encaixa"
          : "descartat";

      const title = document.createElement("h3");
      title.textContent = world.title;
      const description = document.createElement("p");
      description.textContent = world.description;
      article.append(badge, title, description);
      return article;
    }),
  );
}

function renderMessage(result, transition) {
  const processChoices = PROCESS_GROUP_IDS.filter(
    (groupId) => selections[groupId],
  ).length;
  let title;
  let detail;

  if (processChoices === 0) {
    title = "Encara no has concretat el procés";
    detail =
      "Els vuit casos encaixen amb la declaració inicial. Prova una opció i observa què descarta.";
  } else if (!result.truthful) {
    const falseChoice = result.falseClauses[0];
    title = "Aquesta declaració ja no descriu el cas real";
    detail = `${falseChoice.option.label} contradiu els fets que tens a dalt.`;
  } else if (result.success) {
    title = "Ara només encaixa el cas real";
    detail =
      "La declaració concreta la finalitat, l'abast i la contribució humana sense afegir cap afirmació falsa.";
  } else if (result.complete) {
    title = `${result.compatible.length} casos encara encaixen`;
    detail = result.vagueGroupIds.length
      ? "Ja només queda el cas real, però alguna frase encara és genèrica. Concreta què vas fer, per a què o sobre quina part."
      : "La declaració és certa i té els tres detalls, però encara no separa prou bé el cas real.";
  } else {
    const remaining = 3 - processChoices;
    title = `${result.compatible.length} casos encara encaixen`;
    detail = `La tria és compatible amb el cas real. Encara ${remaining === 1 ? "falta un detall" : `falten ${remaining} detalls`}.`;
  }

  byId("result-title").textContent = title;
  byId("result-detail").textContent = detail;
  byId("compatible-count").textContent = String(result.compatible.length);
  byId("result-message").className = `result-message status-${result.state}`;

  if (processChoices === 0 || !transition) {
    byId("transition-note").textContent = "";
  } else if (transition.removed.length === 0) {
    byId("transition-note").textContent =
      "L'última tria no ha descartat cap cas: afegeix paraules, però no precisió.";
  } else {
    byId("transition-note").textContent =
      `${transition.removed.length} ${transition.removed.length === 1 ? "cas descartat" : "casos descartats"} amb l'última tria.`;
  }
}

function render() {
  const result = evaluate();
  const transition = compareWorldSets(previousCompatible, result.compatible);
  previousCompatible = result.compatible;

  byId("declaration-preview").textContent = result.declaration;
  byId("copy-declaration").hidden = !result.success;
  byId("copy-status").textContent = "";
  renderWorlds(result);
  renderMessage(result, transition);
  bridge.progress(result.success);
  if (result.success) {
    bridge.complete();
  }
}

byId("case-title").textContent = WORKED_SCENARIO.title.replace(
  "Cas guiat: ",
  "",
);
listFacts(byId("case-facts"), WORKED_SCENARIO.facts);

byId("load-vague").addEventListener("click", () => {
  selections = { ...LONG_VAGUE_SELECTIONS, tool: "tool-generic" };
  syncGroupInputs();
  render();
});

byId("reset").addEventListener("click", () => {
  selections = { tool: "tool-generic" };
  previousCompatible = [...WORLDS];
  syncGroupInputs();
  render();
});

byId("copy-declaration").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(byId("declaration-preview").textContent);
    byId("copy-status").textContent = "Declaració copiada.";
  } catch {
    byId("copy-status").textContent =
      "No s'ha pogut copiar. Selecciona el text manualment.";
  }
});

bridge.ready();
bridge.observeResize();
renderGroups();
render();
byId("startup-status").hidden = true;
document.documentElement.dataset.widgetReady = "true";
