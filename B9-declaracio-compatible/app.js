import {
  ACTIVITY_CONVENTION,
  DISCLOSURE_GROUPS,
  LONG_VAGUE_SELECTIONS,
  TRANSFER_SCENARIOS,
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
import { ACTIVITY_STEPS, ActivityFlow } from "./activity-flow.js";

const REQUIRED_GROUPS = ACTIVITY_CONVENTION.requiredGroupIds;

function byId(id) {
  return document.getElementById(id);
}

function setStatusContent(element, title, detail) {
  const heading = document.createElement("strong");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = detail;
  element.replaceChildren(heading, paragraph);
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

function worldNames(worlds) {
  return worlds.map((world) => world.title).join(", ");
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

  progress(step) {
    this.post("enti.widget.progress", { step, total: 5 });
  }

  complete() {
    if (this.completionSent) {
      return;
    }
    this.completionSent = true;
    this.post("enti.widget.complete", { milestone: "transfer-case-complete" });
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

class DisclosureBuilder {
  constructor({ root, scenario, onStateChange }) {
    this.root = root;
    this.builderId = root.dataset.builderId;
    this.onStateChange = onStateChange;
    this.selections = {};
    this.groupIndex = 0;
    this.maxVisited = 0;
    this.lastTransition = null;
    this.confirmed = false;

    const fragment = byId("builder-template").content.cloneNode(true);
    root.replaceChildren(fragment);

    this.elements = {
      groupPosition: root.querySelector('[data-role="group-position"]'),
      groupTitle: root.querySelector('[data-role="group-title"]'),
      groupHelp: root.querySelector('[data-role="group-help"]'),
      groupHost: root.querySelector('[data-role="group-host"]'),
      previous: root.querySelector('[data-role="previous-group"]'),
      next: root.querySelector('[data-role="next-group"]'),
      declaration: root.querySelector('[data-role="declaration"]'),
      status: root.querySelector('[data-role="status"]'),
      qualityChecks: root.querySelector('[data-role="quality-checks"]'),
      transition: root.querySelector('[data-role="transition"]'),
      worldSummary: root.querySelector('[data-role="world-summary"]'),
      worldList: root.querySelector('[data-role="world-list"]'),
      groupJump: root.querySelector('[data-role="group-jump"]'),
    };

    this.elements.groupTitle.tabIndex = -1;
    this.elements.previous.addEventListener("click", () => this.previousGroup());
    this.elements.next.addEventListener("click", () => this.nextGroup());
    this.setScenario(scenario);
  }

  setScenario(scenario) {
    this.scenario = scenario;
    this.selections = {};
    this.groupIndex = 0;
    this.maxVisited = 0;
    this.lastTransition = null;
    this.confirmed = false;
    this.render();
  }

  reset() {
    this.setScenario(this.scenario);
  }

  loadSelections(selections) {
    const before = this.evaluate();
    this.selections = { ...selections };
    const after = this.evaluate();
    this.lastTransition = compareWorldSets(before.compatible, after.compatible);
    this.groupIndex = DISCLOSURE_GROUPS.length - 1;
    this.maxVisited = this.groupIndex;
    this.confirmed = false;
    this.render();
  }

  evaluate() {
    return evaluateDisclosure({
      worlds: WORLDS,
      groups: DISCLOSURE_GROUPS,
      selections: this.selections,
      targetWorldId: this.scenario.targetWorldId,
      requiredGroupIds: REQUIRED_GROUPS,
    });
  }

  select(groupId, optionId) {
    const before = this.evaluate();
    this.selections[groupId] = optionId;
    const after = this.evaluate();
    this.lastTransition = compareWorldSets(before.compatible, after.compatible);
    this.confirmed = false;
    this.renderSummary();
    this.renderGroupJump();
    this.updateNavigation();
  }

  previousGroup() {
    if (this.groupIndex === 0) {
      return;
    }
    this.groupIndex -= 1;
    this.confirmed = false;
    this.render();
    this.elements.groupTitle.focus();
  }

  nextGroup() {
    const currentGroup = DISCLOSURE_GROUPS[this.groupIndex];
    if (!this.selections[currentGroup.id]) {
      this.elements.status.focus();
      return;
    }

    if (this.groupIndex < DISCLOSURE_GROUPS.length - 1) {
      this.groupIndex += 1;
      this.maxVisited = Math.max(this.maxVisited, this.groupIndex);
      this.render();
      this.elements.groupTitle.focus();
      return;
    }

    const result = this.evaluate();
    this.confirmed = result.success;
    this.renderSummary();
    if (!result.success) {
      this.elements.status.focus();
    }
  }

  render() {
    this.renderGroup();
    this.renderSummary();
    this.renderGroupJump();
    this.updateNavigation();
  }

  renderGroup() {
    const group = DISCLOSURE_GROUPS[this.groupIndex];
    this.elements.groupPosition.textContent =
      `Camp ${this.groupIndex + 1} de ${DISCLOSURE_GROUPS.length}`;
    this.elements.groupTitle.textContent = group.legend;
    this.elements.groupHelp.textContent = group.help;

    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.className = "visually-hidden";
    legend.textContent = group.legend;
    fieldset.append(legend);

    const choices = document.createElement("div");
    choices.className = "choice-list";

    for (const option of group.options) {
      const label = document.createElement("label");
      label.className = "choice choice-wide";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${this.builderId}-${group.id}`;
      input.id = `${this.builderId}-${group.id}-${option.id}`;
      input.value = option.id;
      input.checked = this.selections[group.id] === option.id;
      input.addEventListener("change", () => this.select(group.id, option.id));

      const content = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = option.label;
      const explanation = document.createElement("small");
      explanation.textContent = option.explanation;
      content.append(title, explanation);
      label.append(input, content);
      choices.append(label);
    }

    fieldset.append(choices);
    this.elements.groupHost.replaceChildren(fieldset);
  }

  renderSummary() {
    const result = this.evaluate();
    const declaration =
      result.declaration || "Tria una opció per començar la declaració.";
    this.elements.declaration.textContent = declaration;
    this.elements.declaration.classList.toggle(
      "is-empty",
      !result.declaration,
    );

    this.elements.status.className = `builder-status status-${result.state}`;
    if (result.state === "empty") {
      setStatusContent(
        this.elements.status,
        "Encara no hi ha cap tria",
        "Comença pel camp actual. El cas real es mantindrà visible mentre construeixes.",
      );
    } else if (result.state === "contradiction") {
      const falseChoice = result.falseClauses[0];
      setStatusContent(
        this.elements.status,
        "Hi ha una contradicció",
        `La tria ${falseChoice.option.label} no coincideix amb el cas real. Revisa el camp «${falseChoice.group.stepLabel}».`,
      );
    } else if (result.state === "incomplete") {
      const labels = result.missingGroupIds
        .map((id) => getGroup(DISCLOSURE_GROUPS, id)?.stepLabel)
        .join(", ");
      setStatusContent(
        this.elements.status,
        "La declaració encara és incompleta",
        `Falten camps obligatoris: ${labels}. Un sol detall precís no substitueix una declaració completa.`,
      );
    } else if (result.state === "ambiguous") {
      setStatusContent(
        this.elements.status,
        "És fidel, però encara ambigua",
        `${result.compatible.length} casos de prova continuen sent compatibles. Afegeix un detall que descrigui el procés.`,
      );
    } else {
      setStatusContent(
        this.elements.status,
        "Declaració fidel, completa i precisa",
        "El cas real continua sent possible, els quatre camps són presents i cap altre cas de prova encaixa.",
      );
    }

    this.renderQualityChecks(result);
    this.renderTransition(result);
    this.renderCompatibleWorlds(result);
    this.onStateChange?.(result, { confirmed: this.confirmed });
  }

  renderQualityChecks(result) {
    const explicitTool = Boolean(
      getOption(
        DISCLOSURE_GROUPS,
        "tool",
        this.selections.tool,
      )?.fulfills,
    );
    const completedFields = REQUIRED_GROUPS.length - result.missingGroupIds.length;
    const checks = [
      {
        label: "Fidel al cas",
        value: result.truthful ? "sí" : "no",
        state: result.selectedCount === 0 ? "pending" : result.truthful ? "pass" : "fail",
      },
      {
        label: "Ús d'IA explícit",
        value: explicitTool ? "sí" : "falta",
        state: explicitTool ? "pass" : "fail",
      },
      {
        label: "Camps de pràctica",
        value: `${completedFields}/${REQUIRED_GROUPS.length}`,
        state: result.complete ? "pass" : "pending",
      },
      {
        label: "Casos encara compatibles",
        value: String(result.compatible.length),
        state: result.specific ? "pass" : result.truthful ? "pending" : "fail",
      },
      {
        label: "Ús permès",
        value: "mira la consigna",
        state: "pending",
      },
    ];

    this.elements.qualityChecks.replaceChildren(
      ...checks.map((check) => {
        const item = document.createElement("li");
        item.className = `is-${check.state}`;
        const mark = document.createElement("span");
        mark.className = "check-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent =
          check.state === "pass" ? "✓" : check.state === "fail" ? "×" : "·";
        const label = document.createElement("span");
        label.textContent = check.label;
        const value = document.createElement("span");
        value.className = "check-value";
        value.textContent = check.value;
        item.append(mark, label, value);
        return item;
      }),
    );
  }

  renderTransition(result) {
    if (!this.lastTransition || result.selectedCount === 0) {
      this.elements.transition.textContent = "";
      return;
    }

    const messages = [];
    if (this.lastTransition.removed.length > 0) {
      messages.push(
        `${this.lastTransition.removed.length} ${this.lastTransition.removed.length === 1 ? "cas descartat" : "casos descartats"}: ${worldNames(this.lastTransition.removed)}.`,
      );
    }
    if (this.lastTransition.reopened.length > 0) {
      messages.push(
        `${this.lastTransition.reopened.length} ${this.lastTransition.reopened.length === 1 ? "cas reobert" : "casos reoberts"}: ${worldNames(this.lastTransition.reopened)}.`,
      );
    }
    if (messages.length === 0) {
      messages.push(
        "Aquesta tria no separa els casos de prova. Pot completar o documentar un camp, però no explica per si sola el procés.",
      );
    }

    this.elements.transition.textContent = messages.join(" ");
  }

  renderCompatibleWorlds(result) {
    this.elements.worldSummary.textContent =
      result.compatible.length === 0
        ? "Cap cas compatible"
        : `${result.compatible.length} ${result.compatible.length === 1 ? "cas encara compatible" : "casos encara compatibles"}`;

    if (result.compatible.length === 0) {
      const item = document.createElement("li");
      item.textContent =
        "Les tries es contradiuen. Revisa el camp indicat abans de continuar.";
      this.elements.worldList.replaceChildren(item);
      return;
    }

    this.elements.worldList.replaceChildren(
      ...result.compatible.map((world) => {
        const item = document.createElement("li");
        if (world.id === this.scenario.targetWorldId) {
          item.classList.add("is-target");
        }
        const title = document.createElement("strong");
        title.textContent =
          world.id === this.scenario.targetWorldId
            ? `${world.title} · cas real`
            : world.title;
        const description = document.createElement("span");
        description.textContent = world.description;
        item.append(title, description);
        return item;
      }),
    );
  }

  renderGroupJump() {
    this.elements.groupJump.replaceChildren(
      ...DISCLOSURE_GROUPS.map((group, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${index + 1}. ${group.stepLabel}`;
        button.disabled = index > this.maxVisited;
        if (index === this.groupIndex) {
          button.setAttribute("aria-current", "step");
        }
        const option = getOption(
          DISCLOSURE_GROUPS,
          group.id,
          this.selections[group.id],
        );
        if (option?.fulfills) {
          button.classList.add("is-complete");
        }
        button.addEventListener("click", () => {
          this.groupIndex = index;
          this.confirmed = false;
          this.render();
          this.elements.groupTitle.focus();
        });
        return button;
      }),
    );
  }

  updateNavigation() {
    const group = DISCLOSURE_GROUPS[this.groupIndex];
    this.elements.previous.disabled = this.groupIndex === 0;
    this.elements.next.disabled = !this.selections[group.id];
    this.elements.next.textContent =
      this.groupIndex === DISCLOSURE_GROUPS.length - 1
        ? "Comprova la declaració"
        : "Camp següent";
  }
}

const contentErrors = validateContent({
  worlds: WORLDS,
  groups: DISCLOSURE_GROUPS,
  policy: ACTIVITY_CONVENTION,
  scenarios: [WORKED_SCENARIO, ...TRANSFER_SCENARIOS],
});

if (contentErrors.length > 0) {
  const notice = document.createElement("div");
  notice.className = "notice notice-error";
  notice.setAttribute("role", "alert");
  notice.textContent =
    "L'activitat no s'ha pogut carregar perquè el contingut no ha superat la validació.";
  byId("activity").prepend(notice);
  throw new Error(contentErrors.join("\n"));
}

const bridge = new MoodleBridge();
const activityFlow = new ActivityFlow();
let transferBuilder;
let transferScenario;

function updateProgress(step) {
  document.querySelectorAll("[data-progress-step]").forEach((item) => {
    const itemStep = Number(item.dataset.progressStep);
    item.classList.toggle("is-complete", itemStep < step);
    if (itemStep === step) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

function showStep(step, { focus = true } = {}) {
  if (!activityFlow.enter(step)) {
    return false;
  }

  document.querySelectorAll(".activity-step").forEach((section) => {
    section.hidden = Number(section.dataset.step) !== step;
  });
  updateProgress(step);
  bridge.progress(step);

  if (step === 5) {
    const result = transferBuilder?.evaluate();
    byId("final-declaration").textContent =
      result?.declaration ?? "No hi ha cap declaració disponible.";
    bridge.complete();
  }

  if (focus) {
    const heading = document.querySelector(
      `.activity-step[data-step="${step}"] h2`,
    );
    heading?.focus();
  }
  return true;
}

function renderOpeningWorlds() {
  byId("opening-worlds").replaceChildren(
    ...WORLDS.map((world) => {
      const article = document.createElement("article");
      article.className = "world-card";
      const title = document.createElement("h3");
      title.textContent = world.title;
      const description = document.createElement("p");
      description.textContent = world.description;
      article.append(title, description);
      return article;
    }),
  );
}

function resetTransferState() {
  document
    .querySelectorAll('input[name="transfer-scenario"]')
    .forEach((input) => {
      input.checked = false;
    });
  byId("transfer-workspace").hidden = true;
  byId("to-step-5").hidden = true;
  transferScenario = undefined;
  transferBuilder = undefined;
  activityFlow.resetTransfer();
  byId("transfer-builder").replaceChildren();
}

function resetReflectionAndTransferState() {
  document
    .querySelectorAll('input[name="reflection"]')
    .forEach((input) => {
      input.checked = false;
    });
  byId("reflection-feedback").hidden = true;
  byId("to-step-4").hidden = true;
  activityFlow.setReflectionCorrect(false);
  resetTransferState();
}

byId("prediction-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = document.querySelector(
    'input[name="prediction"]:checked',
  );
  if (!selected) {
    const first = document.querySelector('input[name="prediction"]');
    first.setCustomValidity("Tria una resposta abans de continuar.");
    first.reportValidity();
    first.addEventListener(
      "change",
      () => first.setCustomValidity(""),
      { once: true },
    );
    return;
  }

  const guessedEight = selected.value === "8";
  byId("prediction-result").hidden = false;
  setStatusContent(
    byId("prediction-status"),
    guessedEight ? "Exacte: tots vuit" : `Has triat ${selected.value}; la resposta és 8`,
    "La frase no concreta ni la tasca, ni l'abast, ni què va fer l'estudiant. Per això tots els processos encara hi caben.",
  );
  renderOpeningWorlds();
  activityFlow.revealPrediction();
});

byId("to-step-2").addEventListener("click", () => showStep(2));

byId("worked-case-title").textContent = WORKED_SCENARIO.title;
listFacts(byId("worked-case-facts"), WORKED_SCENARIO.facts);

const workedBuilder = new DisclosureBuilder({
  root: byId("worked-builder"),
  scenario: WORKED_SCENARIO,
  onStateChange: (result, { confirmed }) => {
    const accepted = result.success && confirmed;
    activityFlow.setWorkedCaseConfirmed(accepted);
    byId("to-step-3").hidden = !accepted;
    if (!accepted) {
      resetReflectionAndTransferState();
    }
  },
});

byId("load-vague").addEventListener("click", () => {
  workedBuilder.loadSelections(LONG_VAGUE_SELECTIONS);
});
byId("reset-worked").addEventListener("click", () => workedBuilder.reset());
byId("to-step-3").addEventListener("click", () => showStep(3));

byId("reflection-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = document.querySelector(
    'input[name="reflection"]:checked',
  );
  if (!selected) {
    const first = document.querySelector('input[name="reflection"]');
    first.setCustomValidity("Tria una resposta abans de continuar.");
    first.reportValidity();
    first.addEventListener(
      "change",
      () => first.setCustomValidity(""),
      { once: true },
    );
    return;
  }

  const feedback = byId("reflection-feedback");
  feedback.hidden = false;
  const correct = selected.value === "process";
  feedback.className = `notice ${correct ? "notice-success" : "notice-error"}`;
  setStatusContent(
    feedback,
    correct ? "Correcte" : "Encara no",
    correct
      ? "La part afectada, l'abast i la contribució humana descriuen el repartiment del procés. La procedència de l'eina pot ser necessària, però no substitueix aquests detalls."
      : "El producte o la llargada poden afegir context, però no expliquen com es va repartir el treball. Torna-ho a provar.",
  );
  activityFlow.setReflectionCorrect(correct);
  byId("to-step-4").hidden = !correct;
  if (!correct) {
    resetTransferState();
  }
});

byId("to-step-4").addEventListener("click", () => showStep(4));

function renderScenarioChoices() {
  byId("scenario-choices").replaceChildren(
    ...TRANSFER_SCENARIOS.map((scenario) => {
      const label = document.createElement("label");
      label.className = "choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "transfer-scenario";
      input.value = scenario.id;
      const content = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = scenario.title;
      const summary = document.createElement("small");
      summary.textContent = scenario.summary;
      content.append(title, summary);
      label.append(input, content);
      return label;
    }),
  );
}

renderScenarioChoices();

byId("scenario-form").addEventListener("change", (event) => {
  const selectedId = event.target.value;
  transferScenario = TRANSFER_SCENARIOS.find(
    (scenario) => scenario.id === selectedId,
  );
  if (!transferScenario) {
    return;
  }

  byId("transfer-workspace").hidden = false;
  byId("transfer-case-title").textContent = transferScenario.title;
  byId("transfer-case-summary").textContent = transferScenario.summary;
  listFacts(byId("transfer-case-facts"), transferScenario.facts);
  activityFlow.setTransferConfirmed(false);
  byId("to-step-5").hidden = true;

  if (!transferBuilder) {
    transferBuilder = new DisclosureBuilder({
      root: byId("transfer-builder"),
      scenario: transferScenario,
      onStateChange: (result, { confirmed }) => {
        const accepted = result.success && confirmed;
        activityFlow.setTransferConfirmed(accepted);
        byId("to-step-5").hidden = !accepted;
      },
    });
  } else {
    transferBuilder.setScenario(transferScenario);
  }
});

byId("to-step-5").addEventListener("click", () => showStep(5));

document.querySelectorAll("[data-go-step]").forEach((button) => {
  button.addEventListener("click", () => {
    showStep(Number(button.dataset.goStep));
  });
});

byId("copy-declaration").addEventListener("click", async () => {
  const text = byId("final-declaration").textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    byId("copy-status").textContent =
      "Declaració copiada. Revisa-la contra la consigna abans d'entregar.";
  } catch {
    byId("copy-status").textContent =
      "El navegador no ha permès copiar-la. Selecciona el text i copia'l manualment.";
  }
});

byId("try-another").addEventListener("click", () => {
  resetTransferState();
  showStep(4);
});

byId("restart-activity").addEventListener("click", () => {
  window.location.reload();
});

bridge.ready();
bridge.observeResize();
showStep(ACTIVITY_STEPS.PREDICTION, { focus: false });
byId("startup-status").hidden = true;
document.documentElement.dataset.widgetReady = "true";
