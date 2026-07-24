(function initialiseBriefApp() {
  "use strict";

  const Data = window.B7Data;
  const Core = window.B7Core;
  if (!Data || !Core) {
    throw new Error("B7 data and core must load before the application.");
  }

  const STORAGE_KEY = "enti-b7-el-brief-v2";
  const WIDGET_ID = "b7-el-brief";
  const WIDGET_VERSION = "2.0.0";

  const app = document.getElementById("app");
  const activityStatus = document.getElementById("activityStatus");
  const progressShell = document.getElementById("progressShell");
  const progressLabel = document.getElementById("progressLabel");
  const progressValue = document.getElementById("progressValue");
  const progressBar = document.getElementById("progressBar");
  const progressSteps = document.getElementById("progressSteps");
  const restartButton = document.getElementById("restartButton");
  const restartDialog = document.getElementById("restartDialog");

  let restored = false;
  let progressSignature = "";
  let completionSignature = "";
  let resizeFrame = 0;
  let restartInvoker = null;

  function loadState() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return Core.createInitialState();
      const safe = Core.sanitiseState(JSON.parse(raw));
      if (!safe) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return Core.createInitialState();
      }
      restored = true;
      return safe;
    } catch {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // The activity remains usable when storage is unavailable.
      }
      return Core.createInitialState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage is an enhancement; interaction must continue without it.
    }
  }

  function clearState() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else needs to be cleared.
    }
  }

  function validParentOrigin() {
    const value = new URL(window.location.href).searchParams.get(
      "parentOrigin",
    );
    if (!value) return null;
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  const parentOrigin = validParentOrigin();

  function emitWidgetEvent(type, outcome) {
    const payload = {
      type,
      widget: WIDGET_ID,
      version: WIDGET_VERSION,
      outcome,
    };
    document.dispatchEvent(new CustomEvent(type, { detail: payload }));
    if (window.parent !== window && parentOrigin) {
      window.parent.postMessage(payload, parentOrigin);
    }
  }

  function emitProgress() {
    const progress = Core.progressForState(state);
    const signature = `${progress.step}:${progress.percent}:${state.completed}`;
    if (signature === progressSignature) return;
    progressSignature = signature;
    emitWidgetEvent("enti-widget-progress", {
      step: progress.step,
      stepLabel: progress.label,
      percent: progress.percent,
      completed: state.completed,
    });
  }

  function emitCompletion() {
    if (!state.completed) return;
    const signature = `${state.completed}:${restored}`;
    if (signature === completionSignature) return;
    completionSignature = signature;
    emitWidgetEvent("enti-widget-complete", {
      completed: true,
      restored,
    });
  }

  function emitResize() {
    resizeFrame = 0;
    const height = Math.ceil(document.documentElement.scrollHeight);
    emitWidgetEvent("enti-widget-resize", { height });
  }

  function scheduleResize() {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(emitResize);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function screenShell({ stamp, title, lead, className = "" }) {
    const section = element("section", `screen card ${className}`.trim());
    if (stamp) section.append(element("p", "stamp", stamp));
    const heading = element("h2", "screen-title", title);
    heading.tabIndex = -1;
    section.append(heading);
    if (lead) section.append(element("p", "screen-lead", lead));
    return { section, heading };
  }

  function createButton(label, className, onClick) {
    const button = element("button", `button ${className}`.trim(), label);
    button.type = "button";
    if (onClick) button.addEventListener("click", onClick);
    return button;
  }

  function createButtonRow(...buttons) {
    const row = element("div", "button-row");
    row.append(...buttons.filter(Boolean));
    return row;
  }

  function createFieldset(legendText, description) {
    const fieldset = element("fieldset", "choice-group");
    fieldset.append(element("legend", "", legendText));
    if (description) {
      fieldset.append(element("p", "field-hint", description));
    }
    return fieldset;
  }

  function createChoice({
    type,
    name,
    value,
    title,
    description,
    checked,
    onChange,
  }) {
    const label = element("label", "choice");
    const input = document.createElement("input");
    input.type = type;
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.addEventListener("change", (event) => {
      if (type === "radio" && input.checked) {
        for (const peer of document.getElementsByName(name)) {
          peer
            .closest(".choice")
            ?.classList.toggle("is-selected", peer.checked);
        }
      } else {
        label.classList.toggle("is-selected", input.checked);
      }
      onChange(event, label);
    });
    const copy = element("span", "choice-copy");
    copy.append(element("span", "choice-title", title));
    if (description) {
      copy.append(element("span", "choice-description", description));
    }
    label.classList.toggle("is-selected", checked);
    label.append(input, copy);
    return label;
  }

  function createStatusBadge(status, label) {
    return element("span", `status-badge status-${status}`, label);
  }

  function announce(message) {
    activityStatus.textContent = "";
    window.requestAnimationFrame(() => {
      activityStatus.textContent = message || "";
    });
  }

  function focusScreenHeading(heading) {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    window.requestAnimationFrame(() => {
      heading.focus({ preventScroll: true });
    });
  }

  function updateProgress() {
    const progress = Core.progressForState(state);
    const show = state.screen !== "intro";
    progressShell.hidden = !show;
    restartButton.hidden = !show;
    if (!show) return;

    progressLabel.textContent = `${progress.label} · ${progress.detail}`;
    progressValue.textContent = `${progress.percent} %`;
    progressBar.value = progress.percent;
    progressBar.textContent = `${progress.percent} %`;
    progressBar.setAttribute(
      "aria-label",
      `${progress.label}: ${progress.percent} %`,
    );

    for (const item of progressSteps.querySelectorAll("[data-progress-step]")) {
      const itemStep = Number(item.dataset.progressStep);
      item.classList.toggle(
        "is-complete",
        itemStep < progress.step || state.completed,
      );
      if (itemStep === progress.step && !state.completed) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    }
  }

  function currentRound() {
    return Data.ROUNDS[state.roundIndex];
  }

  function currentSelection() {
    return state.rounds[state.roundIndex];
  }

  function transition(screen, message) {
    state.screen = screen;
    saveState();
    render(message);
  }

  function renderIntro() {
    const { section, heading } = screenShell({
      stamp: "Laboratori de decisions · 6–8 minuts",
      title: "Una eina no guanya: encaixa o no encaixa",
      lead: "Durant catorze mesos rebràs tres encàrrecs. A cada brief prioritzaràs dimensions, investigaràs un fet, dissenyaràs un flux i hi afegiràs una salvaguarda. Les conseqüències arribaran més tard.",
      className: "intro-screen",
    });

    const orientation = element("div", "orientation-grid");
    const outcome = element("section", "mini-panel");
    outcome.append(
      element("h3", "", "La competència"),
      element(
        "p",
        "",
        "No memoritzar una família, sinó justificar una decisió sota condicions i saber què et faria revisar-la.",
      ),
    );
    const privacy = element("section", "mini-panel");
    privacy.append(
      element("h3", "", "La teva privadesa"),
      element(
        "p",
        "",
        "No escriuràs text lliure. Les tries es queden en aquesta pestanya i no compten per a cap nota.",
      ),
    );
    orientation.append(outcome, privacy);
    section.append(orientation);

    section.append(element("h3", "section-heading", "Les cinc dimensions"));
    const dimensions = element("div", "dimension-grid");
    for (const item of Data.DIMENSIONS) {
      const card = element("article", "dimension-card");
      card.append(
        element("h4", "", item.name),
        element("p", "", item.short),
        element("p", "dimension-question", item.question),
      );
      dimensions.append(card);
    }
    section.append(dimensions);

    const distinction = element("aside", "callout callout-key");
    distinction.append(
      element("h3", "", "Obert no vol dir privat"),
      element(
        "p",
        "",
        "L’obertura descriu què pots inspeccionar o executar; la privadesa depèn d’on s’executa i de què hi envies. Un model obert en una web aliena continua sent núvol. Un model local evita que l’entrada hagi de viatjar, però encara necessita una màquina i una operació segures.",
      ),
    );
    section.append(distinction);

    const start = createButton(
      "Comença el primer brief",
      "button-primary",
      () => {
        state.roundIndex = 0;
        transition(
          "round-brief",
          "Comença el primer brief. Llegeix els fets abans de prioritzar.",
        );
      },
    );
    section.append(
      createButtonRow(start),
      element(
        "p",
        "content-meta",
        `Escenari ${Data.CONTENT_VERSION} · Revisió de contingut ${Data.CONTENT_REVIEW_DATE}`,
      ),
    );
    return { node: section, heading };
  }

  function createConsequence(roundIndex) {
    const result = Core.evaluateRound(roundIndex, state.rounds[roundIndex]);
    const previousRound = Data.ROUNDS[roundIndex];
    const aside = element("aside", `consequence status-panel-${result.status}`);
    const top = element("div", "consequence-header");
    top.append(
      element("p", "stamp", "Mentrestant, conseqüències"),
      createStatusBadge(result.status, result.statusLabel),
    );
    aside.append(
      top,
      element("h3", "", previousRound.title),
      element("p", "consequence-title", result.statusTitle),
      element("p", "", result.benefit),
      element("p", "", result.tradeoff),
    );
    const safeguardLine = element("p", "evidence-line");
    safeguardLine.append(
      element("strong", "", "Salvaguarda: "),
      document.createTextNode(result.safeguardEffect),
    );
    const reconsiderLine = element("p", "reconsider-line");
    reconsiderLine.append(
      element("strong", "", "Revisa la decisió "),
      document.createTextNode(result.reconsider),
      document.createTextNode("."),
    );
    aside.append(safeguardLine, reconsiderLine);
    return aside;
  }

  function renderRoundBrief() {
    const round = currentRound();
    const { section, heading } = screenShell({
      stamp: round.stamp,
      title: round.title,
      lead: round.brief,
    });

    if (state.roundIndex > 0) {
      section.insertBefore(
        createConsequence(state.roundIndex - 1),
        section.children[2],
      );
    }

    const facts = element("section", "brief-facts");
    facts.append(element("h3", "", "El que ja saps"));
    const list = element("ul", "");
    for (const fact of round.facts) list.append(element("li", "", fact));
    facts.append(list);
    section.append(facts);

    const note = element("p", "instruction-note");
    note.append(
      element("strong", "", "No hi ha una família guanyadora. "),
      document.createTextNode(
        "El teu objectiu és fer explícit què protegeixes, què assumes i com ho comprovaràs.",
      ),
    );
    section.append(note);

    const next = createButton("Construeix el brief", "button-primary", () => {
      transition(
        "round-priority",
        `Brief ${state.roundIndex + 1}. Tria exactament dues dimensions prioritàries.`,
      );
    });
    section.append(createButtonRow(next));
    return { node: section, heading };
  }

  function renderRoundPriority() {
    const round = currentRound();
    const selection = currentSelection();
    const { section, heading } = screenShell({
      stamp: `${round.stamp} · Decisió 2 de 5`,
      title: "Quines dues dimensions manen?",
      lead: "Prioritzar no elimina les altres dimensions. Declara quines dues guiaran primer la decisió.",
    });

    const fieldset = createFieldset(
      "Tria exactament dues dimensions",
      "Pots desmarcar-ne una per canviar la prioritat.",
    );
    const error = element("p", "form-error");
    error.tabIndex = -1;
    error.hidden = true;
    const counter = element(
      "p",
      "selection-counter",
      `${selection.priorities.length} de 2 seleccionades`,
    );
    const next = createButton("Investiga un fet", "button-primary", () => {
      if (selection.priorities.length !== 2) {
        error.textContent =
          "Selecciona exactament dues dimensions per continuar.";
        error.hidden = false;
        error.focus();
        return;
      }
      transition(
        "round-question",
        "Prioritats registrades. Ara decideix quin fet necessites abans de triar.",
      );
    });
    next.disabled = selection.priorities.length !== 2;

    for (const item of Data.DIMENSIONS) {
      const choice = createChoice({
        type: "checkbox",
        name: "priority",
        value: item.id,
        title: item.name,
        description: item.short,
        checked: selection.priorities.includes(item.id),
        onChange(event, label) {
          const input = event.currentTarget;
          const priorities = selection.priorities;
          if (input.checked && !priorities.includes(item.id)) {
            if (priorities.length >= 2) {
              input.checked = false;
              label.classList.remove("is-selected");
              error.textContent =
                "Ja n’has triat dues. Desmarca’n una abans d’afegir-ne una altra.";
              error.hidden = false;
              announce(error.textContent);
              return;
            }
            priorities.push(item.id);
          } else if (!input.checked) {
            selection.priorities = priorities.filter((id) => id !== item.id);
          }
          error.hidden = true;
          counter.textContent = `${selection.priorities.length} de 2 seleccionades`;
          next.disabled = selection.priorities.length !== 2;
          saveState();
        },
      });
      fieldset.append(choice);
    }

    const back = createButton("Torna als fets", "button-quiet", () => {
      transition("round-brief", "Has tornat als fets del brief.");
    });
    section.append(fieldset, counter, error, createButtonRow(back, next));
    return { node: section, heading };
  }

  function renderRoundQuestion() {
    const round = currentRound();
    const selection = currentSelection();
    const { section, heading } = screenShell({
      stamp: `${round.stamp} · Decisió 3 de 5`,
      title: "Què necessites saber abans de triar?",
      lead: "En un projecte real no investigaries tot alhora. Tria la incertesa que canviaria més la decisió.",
    });

    const fieldset = createFieldset(
      "Escull una pregunta",
      "Totes són legítimes; només en pots investigar una en aquesta passada.",
    );
    const reveal = element("aside", "reveal-panel");
    const revealTitle = element("h3", "", "Dada revelada");
    const revealText = element("p", "");
    reveal.hidden = !selection.question;
    reveal.append(revealTitle, revealText);
    const next = createButton("Dissenya el flux", "button-primary", () => {
      if (!selection.question) return;
      transition(
        "round-workflow",
        "Fet revelat. Tria ara un flux de treball i una salvaguarda.",
      );
    });
    next.disabled = !selection.question;

    function updateReveal() {
      const question = round.questions.find(
        (item) => item.id === selection.question,
      );
      reveal.hidden = !question;
      revealText.textContent = question?.reveal || "";
      next.disabled = !question;
      scheduleResize();
    }

    for (const question of round.questions) {
      fieldset.append(
        createChoice({
          type: "radio",
          name: `question-${round.id}`,
          value: question.id,
          title: question.label,
          checked: selection.question === question.id,
          onChange() {
            selection.question = question.id;
            saveState();
            updateReveal();
            announce(`Dada revelada: ${question.reveal}`);
          },
        }),
      );
    }
    updateReveal();

    const back = createButton("Revisa les prioritats", "button-quiet", () => {
      transition("round-priority", "Has tornat a les prioritats del brief.");
    });
    section.append(fieldset, reveal, createButtonRow(back, next));
    return { node: section, heading };
  }

  function renderRoundWorkflow() {
    const round = currentRound();
    const selection = currentSelection();
    const { section, heading } = screenShell({
      stamp: `${round.stamp} · Decisions 4 i 5 de 5`,
      title: "Dissenya un flux, no només una eina",
      lead: "Combina una base de treball amb una salvaguarda. La salvaguarda pot convertir una aposta en una decisió contrastable.",
    });

    const workflowFieldset = createFieldset(
      "1. Tria el flux base",
      "Les descripcions exposen el mecanisme, no una resposta correcta.",
    );
    const safeguardFieldset = createFieldset(
      "2. Afegeix una salvaguarda",
      "Tria la barrera que més reforça la teva hipòtesi.",
    );
    const next = createButton("Revisa abans de comprometre", "button-primary");

    function updateNext() {
      next.disabled = !(selection.workflow && selection.safeguard);
      saveState();
    }

    for (const workflow of round.workflows) {
      workflowFieldset.append(
        createChoice({
          type: "radio",
          name: `workflow-${round.id}`,
          value: workflow.id,
          title: workflow.title,
          description: workflow.summary,
          checked: selection.workflow === workflow.id,
          onChange() {
            selection.workflow = workflow.id;
            updateNext();
          },
        }),
      );
    }
    for (const safeguard of round.safeguards) {
      safeguardFieldset.append(
        createChoice({
          type: "radio",
          name: `safeguard-${round.id}`,
          value: safeguard.id,
          title: safeguard.title,
          description: safeguard.description,
          checked: selection.safeguard === safeguard.id,
          onChange() {
            selection.safeguard = safeguard.id;
            updateNext();
          },
        }),
      );
    }
    next.addEventListener("click", () => {
      if (!(selection.workflow && selection.safeguard)) return;
      transition(
        "round-commit",
        "Flux complet. Revisa la hipòtesi abans de comprometre-la.",
      );
    });
    updateNext();

    const back = createButton("Investiga un altre fet", "button-quiet", () => {
      transition("round-question", "Has tornat a la pregunta del brief.");
    });
    section.append(
      workflowFieldset,
      safeguardFieldset,
      createButtonRow(back, next),
    );
    return { node: section, heading };
  }

  function summaryItem(label, title, description) {
    const item = element("article", "summary-item");
    item.append(element("p", "summary-label", label), element("h3", "", title));
    if (description) item.append(element("p", "", description));
    return item;
  }

  function renderRoundCommit() {
    const round = currentRound();
    const selection = currentSelection();
    const workflow = round.workflows.find(
      (item) => item.id === selection.workflow,
    );
    const safeguard = round.safeguards.find(
      (item) => item.id === selection.safeguard,
    );
    const question = round.questions.find(
      (item) => item.id === selection.question,
    );
    const { section, heading } = screenShell({
      stamp: `${round.stamp} · Compromís`,
      title: "Aquest és el teu brief de decisió",
      lead: "Encara pots revisar-lo. Quan el comprometis, el projecte avançarà i les conseqüències arribaran més endavant.",
    });

    const summary = element("div", "summary-grid");
    summary.append(
      summaryItem(
        "Prioritats",
        Core.formatList(Core.dimensionNames(selection.priorities)),
        "Les altres dimensions continuen existint; aquestes guien primer.",
      ),
      summaryItem("Fet investigat", question.label, question.reveal),
      summaryItem("Flux", workflow.title, workflow.summary),
      summaryItem("Salvaguarda", safeguard.title, safeguard.description),
    );
    section.append(summary);

    const commitment = element("aside", "callout");
    commitment.append(
      element("h3", "", "La hipòtesi que poses en producció"),
      element(
        "p",
        "",
        `«Amb ${workflow.title.toLocaleLowerCase("ca")} i ${safeguard.title.toLocaleLowerCase("ca")}, aquest encàrrec complirà el seu llindar sota els fets que coneixem.»`,
      ),
    );
    section.append(commitment);

    const revise = createButton("Revisa el flux", "button-quiet", () => {
      transition(
        "round-workflow",
        "Has tornat al flux abans de comprometre’l.",
      );
    });
    const commit = createButton(
      "Compromet la decisió",
      "button-primary",
      () => {
        selection.committed = true;
        if (state.roundIndex < Data.ROUNDS.length - 1) {
          state.roundIndex += 1;
          state.screen = "round-brief";
          saveState();
          render(
            `Decisió compromesa. El projecte avança fins al brief ${state.roundIndex + 1}; ara veuràs la conseqüència anterior.`,
          );
        } else {
          transition(
            "debrief",
            "Tercera decisió compromesa. S’ha obert el mapa complet de conseqüències.",
          );
        }
      },
    );
    section.append(createButtonRow(revise, commit));
    return { node: section, heading };
  }

  function createLedgerCard(round, selection, result, index) {
    const card = element(
      "article",
      `ledger-card status-panel-${result.status}`,
    );
    const header = element("div", "ledger-header");
    header.append(
      element("p", "stamp", `Brief ${index + 1}`),
      createStatusBadge(result.status, result.statusLabel),
    );
    card.append(
      header,
      element("h3", "", round.title),
      element("p", "consequence-title", result.statusTitle),
    );

    const definitionList = element("dl", "decision-list");
    const entries = [
      [
        "Prioritats",
        Core.formatList(Core.dimensionNames(selection.priorities)),
      ],
      ["Fet", result.question.label],
      ["Flux", result.workflow.title],
      ["Salvaguarda", result.safeguard.title],
    ];
    for (const [term, description] of entries) {
      definitionList.append(
        element("dt", "", term),
        element("dd", "", description),
      );
    }
    card.append(
      definitionList,
      element("p", "", result.alignment),
      element("p", "evidence-line", result.evidence),
      element("p", "", result.benefit),
      element("p", "", result.tradeoff),
      element("p", "safeguard-line", result.safeguardEffect),
    );
    const reconsider = element("p", "reconsider-line");
    reconsider.append(
      element("strong", "", "Revisa la decisió "),
      document.createTextNode(result.reconsider),
      document.createTextNode("."),
    );
    card.append(reconsider);
    return card;
  }

  function renderDebrief() {
    const { section, heading } = screenShell({
      stamp: "Mes 18 · Auditoria del projecte",
      title: "Informe de decisions, no marcador de respostes",
      lead: "Una mateixa família pot ser proporcionada en un brief i poc contrastada en un altre. El valor és veure quina condició sostenia cada decisió.",
      className: "debrief-screen",
    });

    const ledger = element("div", "ledger");
    Data.ROUNDS.forEach((round, index) => {
      ledger.append(
        createLedgerCard(
          round,
          state.rounds[index],
          Core.evaluateRound(index, state.rounds[index]),
          index,
        ),
      );
    });
    section.append(ledger);

    const sampling = element("aside", "callout callout-key");
    sampling.append(
      element("h3", "", "La precisió importa més que l’eslògan"),
      element(
        "p",
        "",
        "Una mostra aleatòria de 200 pot representar una proporció global amb una incertesa aproximada de ±6,9 punts en el pitjor cas. El problema no és «mostra o població»: és si el mètode respon la pregunta, cobreix segments i pot detectar esdeveniments rars.",
      ),
    );
    section.append(sampling);

    const transfer = createButton(
      "Aplica el mètode a un cas nou",
      "button-primary",
      () => {
        transition(
          "transfer",
          "Cas de transferència. Construeix un brief nou sense repetir una recepta anterior.",
        );
      },
    );
    section.append(createButtonRow(transfer));
    return { node: section, heading };
  }

  function renderTransfer() {
    const transfer = Data.TRANSFER;
    const selection = state.transfer;
    const { section, heading } = screenShell({
      stamp: transfer.stamp,
      title: transfer.title,
      lead: transfer.brief,
      className: "transfer-screen",
    });

    const form = element("form", "transfer-form");
    form.noValidate = true;
    const priorities = createFieldset(
      "1. Prioritza dues dimensions",
      "Tria les dues que obren la decisió; les altres continuaran al brief.",
    );
    const priorityCounter = element(
      "p",
      "selection-counter",
      `${selection.priorities.length} de 2 seleccionades`,
    );
    for (const item of Data.DIMENSIONS) {
      priorities.append(
        createChoice({
          type: "checkbox",
          name: "transfer-priority",
          value: item.id,
          title: item.name,
          description: item.short,
          checked: selection.priorities.includes(item.id),
          onChange(event, label) {
            const input = event.currentTarget;
            if (
              input.checked &&
              !selection.priorities.includes(item.id) &&
              selection.priorities.length >= 2
            ) {
              input.checked = false;
              label.classList.remove("is-selected");
              announce(
                "Ja hi ha dues prioritats. Desmarca’n una abans d’afegir-ne una altra.",
              );
              return;
            }
            if (input.checked) {
              if (!selection.priorities.includes(item.id)) {
                selection.priorities.push(item.id);
              }
            } else {
              selection.priorities = selection.priorities.filter(
                (id) => id !== item.id,
              );
            }
            priorityCounter.textContent = `${selection.priorities.length} de 2 seleccionades`;
            saveState();
          },
        }),
      );
    }
    priorities.append(priorityCounter);

    const question = createFieldset(
      "2. Demana el fet que més pot canviar la decisió",
    );
    for (const item of transfer.questions) {
      question.append(
        createChoice({
          type: "radio",
          name: "transfer-question",
          value: item.id,
          title: item.label,
          checked: selection.question === item.id,
          onChange() {
            selection.question = item.id;
            saveState();
          },
        }),
      );
    }

    const workflow = createFieldset("3. Tria un flux base");
    for (const item of transfer.workflows) {
      workflow.append(
        createChoice({
          type: "radio",
          name: "transfer-workflow",
          value: item.id,
          title: item.title,
          description: item.summary,
          checked: selection.workflow === item.id,
          onChange() {
            selection.workflow = item.id;
            saveState();
          },
        }),
      );
    }

    const safeguard = createFieldset("4. Afegeix una salvaguarda");
    for (const item of transfer.safeguards) {
      safeguard.append(
        createChoice({
          type: "radio",
          name: "transfer-safeguard",
          value: item.id,
          title: item.title,
          checked: selection.safeguard === item.id,
          onChange() {
            selection.safeguard = item.id;
            saveState();
          },
        }),
      );
    }

    const trigger = createFieldset("5. Què et faria revisar la decisió?");
    for (const item of transfer.triggers) {
      trigger.append(
        createChoice({
          type: "radio",
          name: "transfer-trigger",
          value: item.id,
          title: item.label,
          checked: selection.trigger === item.id,
          onChange() {
            selection.trigger = item.id;
            saveState();
          },
        }),
      );
    }

    const error = element("p", "form-error");
    error.tabIndex = -1;
    error.hidden = true;
    const submit = element(
      "button",
      "button button-primary",
      "Tanca el brief i completa l’activitat",
    );
    submit.type = "submit";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!Core.transferSelectionComplete(selection)) {
        error.textContent =
          "Completa els cinc apartats: dues prioritats, una pregunta, un flux, una salvaguarda i un desencadenant de revisió.";
        error.hidden = false;
        error.focus();
        return;
      }
      selection.complete = true;
      state.completed = true;
      state.screen = "complete";
      saveState();
      render(
        "Activitat completada. Has aplicat les cinc dimensions a un cas nou.",
      );
    });

    form.append(
      priorities,
      question,
      workflow,
      safeguard,
      trigger,
      error,
      createButtonRow(submit),
    );
    section.append(form);
    return { node: section, heading };
  }

  function renderComplete() {
    const result = Core.evaluateTransfer(state.transfer);
    const { section, heading } = screenShell({
      stamp: "Transferència completada",
      title: "Ja no has triat una eina: has construït un brief",
      lead: "Has separat context, prioritats, incertesa, flux, salvaguarda i revisió. Aquesta estructura sobreviu a qualsevol rànquing o canvi de model.",
      className: "complete-screen",
    });

    const resultCard = element(
      "section",
      `transfer-result status-panel-${result.status}`,
    );
    resultCard.append(
      createStatusBadge(result.status, result.statusLabel),
      element("h3", "", result.statusTitle),
      element("p", "", result.summary),
      element("p", "", result.feedback),
      element("p", "safeguard-line", result.safeguardEffect),
      element("p", "reconsider-line", result.triggerComment),
    );
    section.append(resultCard);

    const takeaway = element("aside", "callout callout-key");
    takeaway.append(
      element("h3", "", "La regla durable"),
      element(
        "p",
        "",
        "Cost, privadesa, transparència, capacitat i control no donen una resposta automàtica. Donen les preguntes amb què pots justificar, provar i revisar una decisió.",
      ),
      element(
        "p",
        "",
        "I recorda: obert no vol dir privat. La llicència i el lloc d’execució són eixos diferents.",
      ),
    );
    section.append(takeaway);

    const print = createButton("Imprimeix el mapa", "button-quiet", () => {
      window.print();
    });
    const restart = createButton("Torna a començar", "button-primary", () => {
      restartInvoker = restart;
      restartDialog.showModal();
    });
    section.append(createButtonRow(print, restart));
    return { node: section, heading };
  }

  const renderers = {
    intro: renderIntro,
    "round-brief": renderRoundBrief,
    "round-priority": renderRoundPriority,
    "round-question": renderRoundQuestion,
    "round-workflow": renderRoundWorkflow,
    "round-commit": renderRoundCommit,
    debrief: renderDebrief,
    transfer: renderTransfer,
    complete: renderComplete,
  };

  function render(message = "", shouldFocus = true) {
    const renderer = renderers[state.screen] || renderIntro;
    const view = renderer();
    app.replaceChildren(view.node);
    updateProgress();
    emitProgress();
    emitCompletion();
    scheduleResize();
    if (shouldFocus) focusScreenHeading(view.heading);
    if (message) announce(message);
  }

  function resetActivity() {
    clearState();
    restored = false;
    state = Core.createInitialState();
    progressSignature = "";
    completionSignature = "";
    render("Progrés esborrat. L’activitat ha tornat a l’inici.");
  }

  restartButton.addEventListener("click", () => {
    restartInvoker = restartButton;
    restartDialog.showModal();
  });

  restartDialog.addEventListener("close", () => {
    if (restartDialog.returnValue === "confirm") {
      resetActivity();
    } else {
      restartInvoker?.focus();
    }
    restartInvoker = null;
  });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(document.body);
  }
  window.addEventListener("resize", scheduleResize);

  const dataErrors = Core.validateData();
  if (dataErrors.length > 0) {
    throw new Error(`Invalid B7 scenario data:\n${dataErrors.join("\n")}`);
  }

  render(
    restored
      ? state.completed
        ? "Hem recuperat una activitat completada."
        : "Hem recuperat el progrés d’aquesta pestanya."
      : "",
    false,
  );
})();
