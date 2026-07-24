(function startWidget() {
  "use strict";

  const data = globalThis.B6ScenarioData;
  const engine = globalThis.B6InferenceEngine;
  const machine = globalThis.B6StateMachine;
  const STORAGE_KEY = "enti-b6-auditoria-v3";
  const WIDGET_ID = "b6-auditoria-fuga";
  const MESSAGE_SOURCE = "enti-ai-literacy-widget";
  const TOTAL_STEPS = 5;
  const PHASE_LABELS = {
    orientation: "Orientació",
    triage: "Classificació",
    dossier: "Reconstrucció",
    repair: "Redacció segura",
    response: "Resposta i transferència",
    complete: "Completada",
  };
  const STEP_LABELS = [
    "Orienta't",
    "Classifica",
    "Reconstrueix",
    "Redacta",
    "Respon",
  ];
  const PANEL_IDS = {
    orientation: "orientationPanel",
    triage: "triagePanel",
    dossier: "dossierPanel",
    repair: "repairPanel",
    response: "responsePanel",
    complete: "completionPanel",
  };
  const HEADING_IDS = {
    orientation: "orientationTitle",
    triage: "triageTitle",
    dossier: "dossierTitle",
    repair: "repairTitle",
    response: "responseTitle",
    complete: "completionTitle",
  };

  let state;
  let parentOrigin = null;
  let completionSent = false;
  let resizeObserver = null;
  let resizeFrame = 0;
  let lastReportedHeight = 0;

  const byId = (id) => document.getElementById(id);

  function element(tagName, options = {}) {
    const node = document.createElement(tagName);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.attrs) {
      for (const [name, value] of Object.entries(options.attrs)) {
        if (value !== null && value !== undefined)
          node.setAttribute(name, String(value));
      }
    }
    return node;
  }

  function replaceChildren(target, children) {
    target.replaceChildren(...children.filter(Boolean));
  }

  function announce(message) {
    const live = byId("liveRegion");
    live.textContent = "";
    window.requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  function reducedMotion() {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function focusAndReveal(id) {
    window.requestAnimationFrame(() => {
      const target = byId(id);
      if (!target || target.closest("[hidden]")) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        block: "start",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
    });
  }

  function machineConfig() {
    return {
      storageVersion: data.STORAGE_VERSION,
      scenarioIds: data.SCENARIOS.map((scenario) => scenario.id),
      choiceIds: data.CHOICES.map((choice) => choice.id),
      repairIds: data.REPAIR_CASES.map((repair) => repair.id),
      correctRepairs: Object.fromEntries(
        data.REPAIR_CASES.map((repair) => [
          repair.id,
          repair.options.find((option) => option.correct).id,
        ]),
      ),
      incidentOptionIds: data.INCIDENT_OPTIONS.map((option) => option.id),
      correctIncidentIds: data.INCIDENT_OPTIONS.filter(
        (option) => option.correct,
      ).map((option) => option.id),
      transferOptionIds: data.TRANSFER.options.map((option) => option.id),
      correctTransferId: data.TRANSFER.options.find((option) => option.correct)
        .id,
    };
  }

  function readStoredState() {
    try {
      const stored = globalThis.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return machine.initialState(data.STORAGE_VERSION);
      return machine.sanitize(JSON.parse(stored), machineConfig());
    } catch {
      return machine.initialState(data.STORAGE_VERSION);
    }
  }

  function storeState() {
    try {
      globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The activity remains fully usable when storage is unavailable.
    }
  }

  function clearStoredState() {
    try {
      globalThis.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // There is no persisted state to clear when storage is unavailable.
    }
  }

  function parseParentOrigin() {
    const requested = new URL(globalThis.location.href).searchParams.get(
      "parentOrigin",
    );
    if (!requested) return null;
    try {
      const parsed = new URL(requested);
      if (!["http:", "https:"].includes(parsed.protocol)) return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }

  function postToParent(type, outcome) {
    if (!parentOrigin || globalThis.parent === globalThis) return;
    globalThis.parent.postMessage(
      {
        source: MESSAGE_SOURCE,
        widget: WIDGET_ID,
        version: data.VERSION,
        type,
        outcome,
      },
      parentOrigin,
    );
  }

  function progressOutcome() {
    const completedSteps = machine.progressForPhase(state.phase);
    return {
      phase: state.phase,
      completedSteps,
      totalSteps: TOTAL_STEPS,
      scenariosAnswered: Object.keys(state.answers).length,
      scenariosTotal: data.SCENARIOS.length,
      repairsAnswered: Object.keys(state.repairs).length,
      completed: state.completed,
    };
  }

  function emitProgress(restored = false) {
    postToParent("enti-widget-progress", {
      ...progressOutcome(),
      restored,
    });
  }

  function emitCompletion(restored = false) {
    if (completionSent || !state.completed) return;
    completionSent = true;
    postToParent("enti-widget-complete", {
      completed: true,
      completedSteps: TOTAL_STEPS,
      totalSteps: TOTAL_STEPS,
      restored,
    });
  }

  function reportHeight() {
    if (!parentOrigin || globalThis.parent === globalThis) return;
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (height === lastReportedHeight) return;
    lastReportedHeight = height;
    postToParent("enti-widget-resize", { height });
  }

  function scheduleHeightReport() {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      reportHeight();
    });
  }

  function commit(event, options = {}) {
    const next = machine.transition(state, event, machineConfig());
    if (next === state) return false;
    state = next;
    storeState();
    if (!options.skipRender) render(options);
    emitProgress(false);
    if (state.completed) emitCompletion(false);
    scheduleHeightReport();
    return true;
  }

  function renderAturaList(targetId) {
    const items = data.ATURA.map((item) => {
      const row = element("li");
      row.append(
        element("span", {
          className: "atura-letter",
          text: item.letter,
          attrs: { "aria-hidden": "true" },
        }),
      );
      const copy = element("span", { className: "atura-copy" });
      copy.append(
        element("strong", { text: item.title }),
        element("span", { text: item.text }),
      );
      row.append(copy);
      return row;
    });
    replaceChildren(byId(targetId), items);
  }

  function renderProgress() {
    const completedSteps = machine.progressForPhase(state.phase);
    byId("progressText").textContent =
      `${completedSteps} de ${TOTAL_STEPS} passos`;
    byId("phaseName").textContent = PHASE_LABELS[state.phase];

    const steps = STEP_LABELS.map((label, index) => {
      const item = element("li", {
        attrs: { "aria-label": `Pas ${index + 1}: ${label}` },
      });
      if (index < completedSteps) item.classList.add("is-complete");
      if (index === completedSteps && completedSteps < TOTAL_STEPS)
        item.setAttribute("aria-current", "step");
      return item;
    });
    replaceChildren(byId("progressSteps"), steps);
  }

  function renderPanelVisibility() {
    for (const [phase, panelId] of Object.entries(PANEL_IDS)) {
      byId(panelId).hidden = state.phase !== phase;
    }
    byId("restartButton").disabled = state.phase === "orientation";
  }

  function scenarioById(id) {
    return data.SCENARIOS.find((scenario) => scenario.id === id);
  }

  function choiceById(id) {
    return data.CHOICES.find((choice) => choice.id === id);
  }

  function renderChoiceOption(choice, scenario, checked) {
    const wrapper = element("div", { className: "choice-option" });
    const inputId = `triage-${scenario.id}-${choice.id}`;
    const input = element("input", {
      attrs: {
        id: inputId,
        type: "radio",
        name: "triage-choice",
        value: choice.id,
      },
    });
    input.checked = checked;
    const label = element("label", { attrs: { for: inputId } });
    label.append(
      element("strong", { text: choice.label }),
      element("span", { text: choice.description }),
    );
    wrapper.append(input, label);
    return wrapper;
  }

  function renderScenarioFeedback(scenario, selectedChoice) {
    const panel = byId("scenarioFeedback");
    if (!selectedChoice) {
      panel.hidden = true;
      return;
    }

    const aligned = selectedChoice === scenario.correctChoice;
    panel.hidden = false;
    panel.classList.toggle("is-aligned", aligned);
    panel.classList.toggle("needs-review", !aligned);
    byId("scenarioVerdict").textContent = aligned
      ? "Alineada amb l'escenari"
      : "Revisa aquesta ruta";
    byId("scenarioFeedbackText").textContent =
      scenario.feedback[selectedChoice];

    const types = scenario.dataTypes.map((type) =>
      element("span", {
        className: "data-type",
        text: data.DATA_TYPES[type],
      }),
    );
    const typeList = element("div", { className: "data-type-list" });
    typeList.append(...types);
    replaceChildren(byId("scenarioDataTypes"), [typeList]);

    byId("scenarioSafeAlternative").textContent = scenario.safeAlternative;
    const details = byId("postSendDetails");
    details.hidden = scenario.postSendActions.length === 0;
    replaceChildren(
      byId("postSendActions"),
      scenario.postSendActions.map((action) => element("li", { text: action })),
    );
  }

  function renderTriage(options = {}) {
    const scenario = data.SCENARIOS[state.currentScenarioIndex];
    const savedChoice = state.answers[scenario.id] || null;
    const answered = Object.keys(state.answers).length;

    byId("scenarioPosition").textContent =
      `Conversa ${state.currentScenarioIndex + 1} de ${data.SCENARIOS.length}`;
    byId("scenarioAnswered").textContent =
      `${answered} ${answered === 1 ? "resposta desada" : "respostes desades"}`;
    byId("scenarioProgress").setAttribute(
      "aria-valuemax",
      data.SCENARIOS.length,
    );
    byId("scenarioProgress").setAttribute("aria-valuenow", answered);
    byId("scenarioProgressFill").style.width =
      `${(answered / data.SCENARIOS.length) * 100}%`;
    byId("scenarioTaskType").textContent = scenario.taskType;
    byId("scenarioNumber").textContent =
      `Conversa ${String(scenario.number).padStart(2, "0")}`;
    byId("scenarioTitle").textContent = scenario.title;
    byId("scenarioPrompt").textContent = scenario.prompt;

    replaceChildren(
      byId("triageChoices"),
      data.CHOICES.map((choice) =>
        renderChoiceOption(choice, scenario, choice.id === savedChoice),
      ),
    );

    renderScenarioFeedback(scenario, savedChoice);
    byId("previousScenarioButton").disabled = state.currentScenarioIndex === 0;
    const confirm = byId("confirmScenarioButton");
    confirm.disabled = !savedChoice;
    if (savedChoice) {
      if (
        state.currentScenarioIndex === data.SCENARIOS.length - 1 &&
        answered === data.SCENARIOS.length
      ) {
        confirm.textContent = "Obre el dossier";
      } else {
        confirm.textContent = "Següent conversa";
      }
    } else {
      confirm.textContent = "Confirma la decisió";
    }

    if (options.focusFeedback && savedChoice)
      focusAndReveal("scenarioFeedbackTitle");
    else if (options.focusScenario) focusAndReveal("scenarioTitle");
  }

  function summaryCard(label, value, description) {
    const card = element("article", { className: "summary-card" });
    card.append(
      element("span", { className: "micro-label", text: label }),
      element("strong", { text: value }),
      element("p", { text: description }),
    );
    return card;
  }

  function renderEvidencePath(path) {
    const container = element("section", { className: "evidence-path" });
    const title = element("div", { className: "evidence-path__title" });
    title.append(
      element("span", { text: path.label }),
      element("span", {
        text: path.active ? "Via completa" : "Via interrompuda",
      }),
    );
    const list = element("ul", { className: "evidence-list" });
    for (const evidence of path.evidence) {
      const scenario = scenarioById(evidence.scenarioId);
      const item = element("li");
      const message = element("details", {
        className: "evidence-message",
        attrs: { "data-scenario-id": scenario.id },
      });
      message.open = evidence.exposed;
      const messageSummary = element("summary");
      messageSummary.append(
        element("strong", {
          text: `Conversa ${scenario.number} · ${scenario.title}`,
        }),
        element("span", {
          className: "evidence-message__clue",
          text: evidence.label,
        }),
        element("span", {
          className: "evidence-message__toggle",
          text: "Missatge original",
        }),
      );
      message.append(
        messageSummary,
        element("blockquote", {
          className: "evidence-message__prompt",
          text: scenario.prompt,
        }),
      );
      item.append(
        element("span", {
          className: `evidence-status${evidence.exposed ? " is-exposed" : ""}`,
          text: evidence.exposed ? "Enviada" : "Aturada",
        }),
        message,
      );
      list.append(item);
    }
    container.append(title, list);
    return container;
  }

  function renderInferenceCard(inference) {
    const card = element("article", {
      className: `inference-card ${inference.active ? "is-active" : "is-blocked"}`,
    });
    const top = element("div", { className: "inference-card__top" });
    const heading = element("div");
    heading.append(
      element("span", {
        className: "micro-label",
        text: `${inference.kind === "direct" ? "Exposició directa" : "Inferència acumulativa"} · Confiança ${inference.confidence}`,
      }),
      element("h3", { text: inference.title }),
    );
    top.append(
      heading,
      element("span", {
        className: "inference-state",
        text: inference.active ? "Encara possible" : "Interrompuda",
      }),
    );
    card.append(
      top,
      element("p", {
        className: "inference-card__summary",
        text: inference.summary,
      }),
      element("p", {
        className: "inference-card__consequence",
        text: inference.consequence,
      }),
    );

    const paths = element("div", { className: "evidence-paths" });
    paths.append(...inference.paths.map(renderEvidencePath));
    card.append(paths);

    const assumptions = element("ul", { className: "assumption-list" });
    assumptions.append(
      ...inference.assumptions.map((assumption) =>
        element("li", { text: `Supòsit: ${assumption}` }),
      ),
    );
    card.append(assumptions);
    return card;
  }

  function renderDossier() {
    const submitted = state.submittedAnswers || state.answers;
    const learner = engine.evaluateExposure(
      data.SCENARIOS,
      data.INFERENCES,
      submitted,
    );
    const original = engine.evaluateExposure(
      data.SCENARIOS,
      data.INFERENCES,
      {},
      "original",
    );
    const summary = engine.answerSummary(data.SCENARIOS, submitted);

    replaceChildren(byId("comparisonSummary"), [
      summaryCard(
        "Historial original",
        `${original.activeInferences.length}`,
        "conclusions directes o acumulatives possibles si s'envia tot",
      ),
      summaryCard(
        "La teva ruta",
        `${learner.activeInferences.length}`,
        "conclusions que encara conserven una via completa",
      ),
      summaryCard(
        "Decisions de referència",
        `${summary.aligned}/${summary.total}`,
        "coincidències amb la política fictícia d'aquest escenari",
      ),
    ]);

    replaceChildren(
      byId("inferenceList"),
      learner.inferences.map(renderInferenceCard),
    );

    const directTarget = byId("directExposureList");
    if (learner.directDisclosures.length === 0) {
      replaceChildren(directTarget, [
        element("p", {
          className: "empty-state",
          text: "Cap dada directa de l'historial original arriba al servei públic amb les teves decisions.",
        }),
      ]);
    } else {
      const list = element("ul", { className: "direct-exposure-list" });
      list.append(
        ...learner.directDisclosures.map((disclosure) => {
          const scenario = scenarioById(disclosure.scenarioId);
          return element("li", {
            text: `Conversa ${scenario.number}: ${disclosure.label}`,
          });
        }),
      );
      replaceChildren(directTarget, [list]);
    }
  }

  function repairOption(repair, option, selected, showFeedback) {
    const wrapper = element("div", { className: "repair-option" });
    const inputId = `${repair.id}-${option.id}`;
    const input = element("input", {
      attrs: {
        id: inputId,
        type: "radio",
        name: repair.id,
        value: option.id,
      },
    });
    input.checked = selected;
    const label = element("label", { attrs: { for: inputId } });
    label.append(
      element("span", {
        className: "fake-control fake-control--radio",
        attrs: { "aria-hidden": "true" },
      }),
      element("span", { className: "option-copy", text: option.text }),
    );
    wrapper.append(input, label);
    if (showFeedback && selected) {
      wrapper.append(
        element("p", {
          className: `repair-feedback${option.correct ? " is-correct" : ""}`,
          text: option.explanation,
        }),
      );
    }
    return wrapper;
  }

  function renderRepair(options = {}) {
    const cards = data.REPAIR_CASES.map((repair) => {
      const card = element("section", {
        className: "repair-card",
        attrs: { "aria-labelledby": `${repair.id}-title` },
      });
      card.append(
        element("span", {
          className: "micro-label",
          text: `Cas ${data.REPAIR_CASES.indexOf(repair) + 1} de ${data.REPAIR_CASES.length}`,
        }),
        element("h3", {
          text: repair.title,
          attrs: { id: `${repair.id}-title` },
        }),
        element("p", {
          className: "repair-card__question",
          text: repair.question,
        }),
      );
      const optionsNode = element("div", { className: "repair-options" });
      optionsNode.append(
        ...repair.options.map((option) =>
          repairOption(
            repair,
            option,
            state.repairs[repair.id] === option.id,
            state.repairChecked,
          ),
        ),
      );
      card.append(optionsNode);
      return card;
    });
    replaceChildren(byId("repairList"), cards);

    const summary = byId("repairSummary");
    summary.hidden = !state.repairChecked;
    summary.classList.remove("is-success");
    if (state.repairChecked)
      summary.textContent =
        "Encara hi ha alguna alternativa que conserva dades innecessàries o confia en un control insuficient. Revisa les explicacions.";

    byId("checkRepairButton").disabled =
      Object.keys(state.repairs).length !== data.REPAIR_CASES.length;
    if (options.focusSummary && state.repairChecked)
      focusAndReveal("repairSummary");
  }

  function responseOption(option, kind, selected, showFeedback) {
    const wrapper = element("div", { className: "response-option" });
    const inputId = `${kind}-${option.id}`;
    const input = element("input", {
      attrs: {
        id: inputId,
        type: kind === "incident" ? "checkbox" : "radio",
        name: kind,
        value: option.id,
      },
    });
    input.checked = selected;
    const label = element("label", { attrs: { for: inputId } });
    label.append(
      element("span", {
        className: `fake-control${kind === "transfer" ? " fake-control--radio" : ""}`,
        attrs: { "aria-hidden": "true" },
      }),
      element("span", { className: "option-copy", text: option.label }),
    );
    wrapper.append(input, label);
    if (showFeedback && selected) {
      wrapper.append(
        element("p", {
          className: `response-feedback${option.correct ? " is-correct" : ""}`,
          text: option.explanation,
        }),
      );
    }
    return wrapper;
  }

  function renderResponse(options = {}) {
    replaceChildren(
      byId("incidentOptions"),
      data.INCIDENT_OPTIONS.map((option) =>
        responseOption(
          option,
          "incident",
          state.incidentSelections.includes(option.id),
          state.responseChecked,
        ),
      ),
    );
    byId("transferTitle").textContent = data.TRANSFER.title;
    byId("transferPrompt").textContent = data.TRANSFER.prompt;
    replaceChildren(
      byId("transferOptions"),
      data.TRANSFER.options.map((option) =>
        responseOption(
          option,
          "transfer",
          state.transferChoice === option.id,
          state.responseChecked,
        ),
      ),
    );

    const summary = byId("responseSummary");
    summary.hidden = !state.responseChecked;
    summary.classList.remove("is-success");
    if (state.responseChecked) {
      const parts = [];
      if (!state.incidentCorrect)
        parts.push(
          "A la resposta a l'incident hi ha una acció inadequada o en falta una d'útil.",
        );
      if (!state.transferCorrect)
        parts.push(
          "El cas del playtest encara necessita una altra aplicació d'ATURA.",
        );
      summary.textContent = parts.join(" ");
    }
    if (options.focusSummary && state.responseChecked)
      focusAndReveal("responseSummary");
  }

  function renderThreatModels() {
    replaceChildren(
      byId("threatModelTable"),
      data.THREAT_MODELS.map((model) => {
        const card = element("article", { className: "threat-model-card" });
        const list = element("dl");
        list.append(
          element("dt", { text: "Autorització" }),
          element("dd", { text: model.authorization }),
          element("dt", { text: "Tractament" }),
          element("dd", { text: model.handling }),
          element("dt", { text: "Decisió" }),
          element("dd", { text: model.decision }),
        );
        card.append(element("h4", { text: model.title }), list);
        return card;
      }),
    );
  }

  function render(options = {}) {
    renderProgress();
    renderPanelVisibility();
    if (state.phase === "triage") renderTriage(options);
    if (state.phase === "dossier") renderDossier();
    if (state.phase === "repair") renderRepair(options);
    if (state.phase === "response") renderResponse(options);
    if (options.focusPhase) focusAndReveal(HEADING_IDS[state.phase]);
  }

  function selectedTriageChoice() {
    return document.querySelector(
      '#triageForm input[name="triage-choice"]:checked',
    )?.value;
  }

  function setTemporaryTriageState() {
    const scenario = data.SCENARIOS[state.currentScenarioIndex];
    const selected = selectedTriageChoice();
    const changed = selected && selected !== state.answers[scenario.id];
    byId("scenarioFeedback").hidden = changed || !state.answers[scenario.id];
    const button = byId("confirmScenarioButton");
    button.disabled = !selected;
    if (changed) button.textContent = "Confirma la decisió";
    scheduleHeightReport();
  }

  function handleTriageSubmit(event) {
    event.preventDefault();
    const scenario = data.SCENARIOS[state.currentScenarioIndex];
    const selected = selectedTriageChoice();
    if (!selected) {
      announce("Selecciona una decisió abans de continuar.");
      return;
    }

    if (state.answers[scenario.id] !== selected) {
      commit(
        {
          type: "ANSWER_SCENARIO",
          scenarioId: scenario.id,
          choiceId: selected,
        },
        { focusFeedback: true },
      );
      announce("Decisió desada. Llegeix-ne el retorn abans de continuar.");
      return;
    }

    const isLast = state.currentScenarioIndex === data.SCENARIOS.length - 1;
    const allAnswered =
      Object.keys(state.answers).length === data.SCENARIOS.length;
    if (isLast && allAnswered) {
      commit({ type: "SUBMIT_TRIAGE" }, { focusPhase: true });
      announce("Dossier reconstruït a partir de les teves decisions.");
      return;
    }

    const nextIndex = Math.min(
      state.currentScenarioIndex + 1,
      data.SCENARIOS.length - 1,
    );
    commit({ type: "SET_SCENARIO", index: nextIndex }, { focusScenario: true });
  }

  function handleRepairChange(event) {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;
    commit(
      {
        type: "ANSWER_REPAIR",
        repairId: input.name,
        optionId: input.value,
      },
      { skipRender: true },
    );
    byId("repairSummary").hidden = true;
    byId("checkRepairButton").disabled =
      Object.keys(state.repairs).length !== data.REPAIR_CASES.length;
  }

  function handleRepairSubmit(event) {
    event.preventDefault();
    if (Object.keys(state.repairs).length !== data.REPAIR_CASES.length) {
      const summary = byId("repairSummary");
      summary.hidden = false;
      summary.textContent = "Tria una alternativa en cadascun dels tres casos.";
      focusAndReveal("repairSummary");
      return;
    }
    const phaseBefore = state.phase;
    commit({ type: "CHECK_REPAIRS" }, { focusSummary: true });
    if (phaseBefore !== state.phase) {
      focusAndReveal("responseTitle");
      announce("Alternatives reparades. Ara respon a l'incident.");
    } else {
      announce("Revisa les alternatives indicades.");
    }
  }

  function currentIncidentSelections() {
    return [
      ...document.querySelectorAll(
        '#responseForm input[name="incident"]:checked',
      ),
    ].map((input) => input.value);
  }

  function currentTransferChoice() {
    return document.querySelector(
      '#responseForm input[name="transfer"]:checked',
    )?.value;
  }

  function handleResponseChange(event) {
    if (event.target.name === "incident") {
      commit(
        {
          type: "SET_INCIDENT_SELECTIONS",
          optionIds: currentIncidentSelections(),
        },
        { skipRender: true },
      );
    }
    if (event.target.name === "transfer") {
      commit(
        {
          type: "SET_TRANSFER",
          optionId: currentTransferChoice(),
        },
        { skipRender: true },
      );
    }
    byId("responseSummary").hidden = true;
  }

  function handleResponseSubmit(event) {
    event.preventDefault();
    if (currentIncidentSelections().length === 0 || !currentTransferChoice()) {
      const summary = byId("responseSummary");
      summary.hidden = false;
      summary.textContent =
        "Marca les accions de resposta i tria una decisió per al cas nou.";
      focusAndReveal("responseSummary");
      return;
    }
    const phaseBefore = state.phase;
    commit({ type: "CHECK_RESPONSE" }, { focusSummary: true });
    if (phaseBefore !== state.phase) {
      focusAndReveal("completionTitle");
      announce("Activitat completada. La targeta ATURA està disponible.");
    } else {
      announce("Hi ha algun element per revisar abans de completar.");
    }
  }

  function aturaClipboardText() {
    return [
      "ATURA abans d'enviar",
      ...data.ATURA.map(
        (item) => `${item.letter} — ${item.title}: ${item.text}`,
      ),
    ].join("\n");
  }

  async function copyAtura() {
    const text = aturaClipboardText();
    try {
      await navigator.clipboard.writeText(text);
      announce("Targeta ATURA copiada. No inclou cap resposta de l'activitat.");
      return;
    } catch {
      const textarea = element("textarea", {
        attrs: { readonly: "", "aria-hidden": "true" },
      });
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      announce(
        copied
          ? "Targeta ATURA copiada. No inclou cap resposta de l'activitat."
          : "No s'ha pogut copiar. Pots imprimir la targeta.",
      );
    }
  }

  function resetActivity(fromParent = false) {
    state = machine.initialState(data.STORAGE_VERSION);
    completionSent = false;
    clearStoredState();
    render({ focusPhase: !fromParent });
    emitProgress(false);
    postToParent("enti-widget-reset", {
      completedSteps: 0,
      totalSteps: TOTAL_STEPS,
    });
    announce("Activitat reiniciada.");
    scheduleHeightReport();
  }

  function bindEvents() {
    byId("startButton").addEventListener("click", () => {
      commit({ type: "START" }, { focusPhase: true });
      announce("Auditoria iniciada. Conversa 1 de 9.");
    });

    byId("triageForm").addEventListener("change", setTemporaryTriageState);
    byId("triageForm").addEventListener("submit", handleTriageSubmit);
    byId("previousScenarioButton").addEventListener("click", () => {
      commit(
        {
          type: "SET_SCENARIO",
          index: state.currentScenarioIndex - 1,
        },
        { focusScenario: true },
      );
    });
    byId("reviseTriageButton").addEventListener("click", () => {
      commit({ type: "REVISE_TRIAGE" }, { focusScenario: true });
      announce(
        "Resultat retirat. Les decisions es conserven perquè les puguis revisar.",
      );
    });
    byId("startRepairButton").addEventListener("click", () => {
      commit({ type: "START_REPAIR" }, { focusPhase: true });
      announce("Taller d'alternatives segures.");
    });
    byId("repairForm").addEventListener("change", handleRepairChange);
    byId("repairForm").addEventListener("submit", handleRepairSubmit);
    byId("responseForm").addEventListener("change", handleResponseChange);
    byId("responseForm").addEventListener("submit", handleResponseSubmit);
    byId("copyAturaButton").addEventListener("click", copyAtura);
    byId("printButton").addEventListener("click", () => globalThis.print());
    byId("restartButton").addEventListener("click", () => resetActivity());

    globalThis.addEventListener("message", (event) => {
      if (
        !parentOrigin ||
        event.origin !== parentOrigin ||
        event.source !== globalThis.parent
      ) {
        return;
      }
      if (
        event.data?.source === MESSAGE_SOURCE &&
        event.data?.widget === WIDGET_ID &&
        event.data?.type === "enti-widget-reset"
      ) {
        resetActivity(true);
      }
    });
  }

  function initResizeObserver() {
    if (!("ResizeObserver" in globalThis)) {
      globalThis.addEventListener("resize", scheduleHeightReport);
      return;
    }
    resizeObserver = new ResizeObserver(scheduleHeightReport);
    resizeObserver.observe(document.documentElement);
  }

  function showRuntimeError(message) {
    for (const panelId of Object.values(PANEL_IDS)) byId(panelId).hidden = true;
    byId("runtimeError").hidden = false;
    byId("runtimeErrorText").textContent = message;
    byId("restartButton").disabled = true;
  }

  function initialize() {
    if (!data || !engine || !machine)
      throw new Error("Falten mòduls necessaris de l'activitat.");
    const contentErrors = engine.validateContent(data);
    if (contentErrors.length)
      throw new Error(`El contingut no és vàlid: ${contentErrors.join("; ")}`);

    parentOrigin = parseParentOrigin();
    state = readStoredState();
    renderAturaList("aturaList");
    renderAturaList("completionAturaList");
    renderThreatModels();
    bindEvents();
    render();
    initResizeObserver();

    postToParent("enti-widget-ready", {
      privacy: "aggregate-session-state-only",
      totalSteps: TOTAL_STEPS,
    });
    emitProgress(true);
    emitCompletion(true);
    scheduleHeightReport();
  }

  try {
    initialize();
  } catch (error) {
    console.error(error);
    showRuntimeError(
      "L'activitat no ha pogut validar el contingut local. Recarrega la pàgina i, si continua, informa el professorat.",
    );
  }
})();
