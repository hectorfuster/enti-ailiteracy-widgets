(function initB4Widget() {
  "use strict";

  const Core = window.B4Core;
  if (!Core) throw new Error("B4Core no s’ha pogut carregar.");

  const STORAGE_KEY = "enti-b4-performance-paradox-v3";
  const WIDGET_ID = "b4-performance-paradox";
  const WIDGET_VERSION = "3.0.0";

  const app = document.getElementById("app");
  const activity = document.getElementById("activity");
  const statusRegion = document.getElementById("activityStatus");
  const progressShell = document.getElementById("progressShell");
  const progressLabel = document.getElementById("progressLabel");
  const progressValue = document.getElementById("progressValue");
  const progressBar = document.getElementById("progressBar");
  const progressSteps = document.getElementById("progressSteps");
  const restartButton = document.getElementById("restartButton");
  const restartDialog = document.getElementById("restartDialog");

  let completionDispatched = false;
  let restoreNoticeShown = false;
  let lastProgressSignature = "";
  let lastResizeHeight = 0;

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function randomSeed() {
    try {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0];
    } catch {
      return Date.now() % 4_294_967_295;
    }
  }

  function forcedVariant() {
    const candidate = new URLSearchParams(window.location.search).get(
      "variant",
    );
    return candidate === "a" || candidate === "b" ? candidate : undefined;
  }

  function loadState() {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
      return Core.sanitiseState(stored);
    } catch {
      return null;
    }
  }

  let state = loadState();
  let wasRestored = Boolean(state && state.screen !== "intro");
  if (!state) state = Core.createInitialState(randomSeed(), forcedVariant());

  function saveState() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The activity remains fully usable when storage is unavailable.
    }
  }

  function clearState() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else is required when storage is unavailable.
    }
  }

  function validParentOrigin() {
    const configured = new URLSearchParams(window.location.search).get(
      "parentOrigin",
    );
    const candidates = [configured, document.referrer];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const url = new URL(candidate);
        if (url.protocol === "https:" || url.protocol === "http:")
          return url.origin;
      } catch {
        // Try the next candidate.
      }
    }
    return null;
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
    if (signature === lastProgressSignature) return;
    lastProgressSignature = signature;
    emitWidgetEvent("enti-widget-progress", {
      step: progress.step,
      stepLabel: progress.label,
      percent: progress.percent,
      completed: state.completed,
    });
  }

  function emitCompletion() {
    if (completionDispatched || !state.completed) return;
    completionDispatched = true;
    emitWidgetEvent("enti-widget-complete", {
      completed: true,
      restored: wasRestored,
    });
  }

  function emitResize() {
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (height === lastResizeHeight) return;
    lastResizeHeight = height;
    emitWidgetEvent("enti-widget-resize", { height });
  }

  function scheduleResize() {
    window.requestAnimationFrame(emitResize);
  }

  function announce(message) {
    statusRegion.textContent = "";
    window.requestAnimationFrame(() => {
      statusRegion.textContent = message;
    });
  }

  function focusNewView() {
    const heading = app.querySelector("[data-autofocus]");
    if (!heading) return;
    window.requestAnimationFrame(() => {
      heading.focus({ preventScroll: true });
      activity.scrollIntoView({ block: "start" });
    });
  }

  function updateProgress() {
    const progress = Core.progressForState(state);
    const show = state.screen !== "intro";
    progressShell.hidden = !show;
    restartButton.hidden = !show;
    if (!show) return;

    progressLabel.textContent = progress.label;
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

  function restoreNotice() {
    if (!wasRestored || restoreNoticeShown) return "";
    return `
      <div class="restore-note" role="status">
        Hem recuperat el progrés d’aquesta pestanya.
      </div>
    `;
  }

  function optionMarkup(question, selectedAnswer) {
    return question.options
      .map((option, index) => {
        const checked = selectedAnswer === option.value ? " checked" : "";
        const marker = String.fromCharCode(65 + index);
        return `
          <label class="option">
            <input
              class="option-input"
              type="radio"
              name="answer"
              value="${escapeHTML(option.value)}"
              ${checked}
            />
            <span class="option-body">
              <span class="option-marker" aria-hidden="true">${marker}</span>
              <span class="option-copy">${escapeHTML(option.label)}</span>
            </span>
          </label>
        `;
      })
      .join("");
  }

  function confidenceMarkup(selectedConfidence) {
    const levels = [
      { value: 1, label: "Baixa" },
      { value: 2, label: "Mitjana" },
      { value: 3, label: "Alta" },
    ];
    return levels
      .map((level) => {
        const checked =
          Number(selectedConfidence) === level.value ? " checked" : "";
        return `
          <label class="option confidence">
            <input
              class="option-input"
              type="radio"
              name="confidence"
              value="${level.value}"
              ${checked}
            />
            <span class="option-body">${level.label}</span>
          </label>
        `;
      })
      .join("");
  }

  function questionForm({
    formName,
    question,
    selected,
    submitLabel,
    mechanicId,
  }) {
    const descriptionId = `${question.id}-instructions`;
    return `
      <form
        class="question-form"
        data-form="${escapeHTML(formName)}"
        ${mechanicId ? `data-mechanic="${escapeHTML(mechanicId)}"` : ""}
        novalidate
      >
        <fieldset aria-describedby="${descriptionId}">
          <legend>${escapeHTML(question.prompt)}</legend>
          <p class="fieldset-help" id="${descriptionId}">
            Selecciona una resposta. Encara no et direm si és correcta.
          </p>
          <div class="option-list">
            ${optionMarkup(question, selected?.answer)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Quina confiança tens en aquesta resposta?</legend>
          <div class="confidence-list">
            ${confidenceMarkup(selected?.confidence)}
          </div>
        </fieldset>
        <p class="form-error" role="alert" tabindex="-1" hidden>
          Selecciona una resposta i el nivell de confiança.
        </p>
        <div class="button-row">
          <button class="button" type="submit">${escapeHTML(submitLabel)}</button>
        </div>
      </form>
    `;
  }

  function renderIntro() {
    return `
      <section class="card" aria-labelledby="introTitle">
        ${restoreNotice()}
        <p class="phase-label">Experiència guiada · 7–9 minuts</p>
        <h2 id="introTitle" tabindex="-1" data-autofocus>
          Quan encertar no és el mateix que aprendre
        </h2>
        <p class="lead">
          Practicaràs dues mecàniques de joc amb dos tipus d’assistència.
          Després hauràs de transferir el procediment a problemes nous, sense
          ajuda.
        </p>

        <div class="objective-grid" aria-label="Objectius de l’activitat">
          <div class="objective">
            <strong>Separa rendiment i aprenentatge</strong>
            Un resultat assistit pot ser excel·lent encara que el procediment
            no quedi disponible després.
          </div>
          <div class="objective">
            <strong>Compara maneres de rebre ajuda</strong>
            Experimenta la diferència entre obtenir una solució i construir-la
            amb pistes.
          </div>
          <div class="objective">
            <strong>Practica la verificació</strong>
            Decideix què fas quan una recomanació sona segura però pot estar
            equivocada.
          </div>
        </div>

        <div class="privacy-note">
          <strong>Això no és un test de capacitat.</strong> És una experiència
          individual i no pot demostrar un efecte causal. L’assistent és una
          simulació escrita prèviament, no una IA en directe.
        </div>

        <details>
          <summary>Privacitat i funcionament a Moodle</summary>
          <div>
            <p>
              El progrés es conserva només a la memòria de sessió d’aquesta
              pestanya. No s’envia cap resposta, nivell de confiança ni
              compromís personal.
            </p>
            <p>
              Si l’activitat està incrustada a Moodle, només comunica el pas,
              l’alçada del marc i la finalització.
            </p>
          </div>
        </details>

        <div class="button-row">
          <button class="button" type="button" data-action="start">
            Comença pel punt de partida
          </button>
        </div>
      </section>
    `;
  }

  function renderBaseline() {
    const order = Core.questionOrder(state.variant);
    const mechanicId = order[state.baselineIndex];
    const mechanic = Core.MECHANICS[mechanicId];
    return `
      <section class="card" aria-labelledby="baselineTitle">
        ${restoreNotice()}
        <p class="phase-label">1 · Punt de partida</p>
        <p class="question-count">Pregunta ${state.baselineIndex + 1} de 2</p>
        <h2 id="baselineTitle" tabindex="-1" data-autofocus>
          Resol sense assistència
        </h2>
        <p>
          Aquest primer intent només crea un punt de referència descriptiu. No
          hi ha límit de temps i no veuràs la correcció fins al debrief.
        </p>
        ${questionForm({
          formName: "baseline",
          question: mechanic.baseline,
          selected: state.baseline[mechanicId],
          submitLabel:
            state.baselineIndex === 1 ? "Tanca el punt de partida" : "Continua",
          mechanicId,
        })}
      </section>
    `;
  }

  function renderPracticeIntro() {
    return `
      <section class="card" aria-labelledby="practiceIntroTitle">
        ${restoreNotice()}
        <p class="phase-label">2 · Pràctica amb IA</p>
        <h2 id="practiceIntroTitle" tabindex="-1" data-autofocus>
          Dues ajudes que produeixen experiències diferents
        </h2>
        <p class="lead">
          Les dues pràctiques acabaran amb una resposta correcta. El que canvia
          és qui fa el treball necessari per arribar-hi.
        </p>
        <div class="mode-grid">
          <article class="mode-card direct">
            <p class="assistant-label">Mode resposta directa</p>
            <h3>La solució arriba acabada</h3>
            <p>
              L’assistent mostra els passos i el resultat. Tu només hauràs de
              reconèixer la idea que ha aplicat.
            </p>
          </article>
          <article class="mode-card guided">
            <p class="assistant-label">Mode tutor amb bastides</p>
            <h3>Tu construeixes la solució</h3>
            <p>
              El tutor divideix el problema i ofereix pistes, però no avança
              fins que completes els passos.
            </p>
          </article>
        </div>
        <div class="caution-note">
          <strong>No compararem els teus dos resultats com si fossin un
          experiment.</strong> Són continguts diferents i una sola persona no
          permet aïllar l’efecte del tipus d’ajuda.
        </div>
        <div class="button-row">
          <button class="button" type="button" data-action="begin-practice">
            Comença la pràctica
          </button>
        </div>
      </section>
    `;
  }

  function renderDirectPractice(mechanicId, mechanic, record) {
    const wrong = record.attempts > 0 && !record.complete;
    return `
      <p class="lead">${escapeHTML(mechanic.practice.prompt)}</p>
      <div class="assistant-card">
        <p class="assistant-label">Assistent de resposta directa · simulat</p>
        <h3>Solució proposada</h3>
        <ol class="worked-steps">
          ${mechanic.practice.workedSteps
            .map((step) => `<li>${escapeHTML(step)}</li>`)
            .join("")}
        </ol>
      </div>
      ${
        wrong
          ? `
            <div class="feedback error" role="alert">
              <h3>Encara no</h3>
              <p>${escapeHTML(mechanic.practice.check.hint)}</p>
            </div>
          `
          : ""
      }
      <form
        class="question-form"
        data-form="direct-practice"
        data-mechanic="${escapeHTML(mechanicId)}"
        novalidate
      >
        <fieldset>
          <legend>${escapeHTML(mechanic.practice.check.prompt)}</legend>
          <div class="option-list">
            ${optionMarkup(mechanic.practice.check, record.lastAnswer)}
          </div>
        </fieldset>
        <p class="form-error" role="alert" tabindex="-1" hidden>
          Selecciona una resposta abans de comprovar-la.
        </p>
        <div class="button-row">
          <button class="button" type="submit">Comprova la idea</button>
        </div>
      </form>
    `;
  }

  function renderGuidedPractice(mechanicId, mechanic, record) {
    const hasAttempt = record.attempts > 0 && !record.complete;
    const wrongSteps = mechanic.practice.guidedSteps.filter(
      (step) => record.lastSteps[step.id] !== step.correct,
    );
    return `
      <p class="lead">${escapeHTML(mechanic.practice.prompt)}</p>
      <div class="assistant-card guided">
        <p class="assistant-label">Tutor amb bastides · simulat</p>
        <h3>Comencem pel primer pas</h3>
        <p>
          No et donaré el resultat final. Completa cada valor i comprovaré on
          necessites una pista.
        </p>
      </div>
      ${
        hasAttempt
          ? `
            <div class="feedback warning" role="alert">
              <h3>Revisa aquests passos</h3>
              <ul class="hint-list">
                ${wrongSteps
                  .map(
                    (step) =>
                      `<li><strong>${escapeHTML(step.label)}:</strong> ${escapeHTML(step.hint)}</li>`,
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
      <form
        class="question-form"
        data-form="guided-practice"
        data-mechanic="${escapeHTML(mechanicId)}"
        novalidate
      >
        <div class="guided-steps">
          ${mechanic.practice.guidedSteps
            .map((step) => {
              const selected = record.lastSteps[step.id] || "";
              return `
                <div class="step-field">
                  <label for="step-${escapeHTML(step.id)}">
                    ${escapeHTML(step.label)}
                  </label>
                  <select
                    id="step-${escapeHTML(step.id)}"
                    name="step-${escapeHTML(step.id)}"
                  >
                    <option value="">Tria un valor</option>
                    ${step.options
                      .map(
                        (option) => `
                          <option
                            value="${escapeHTML(option.value)}"
                            ${selected === option.value ? " selected" : ""}
                          >
                            ${escapeHTML(option.label)}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>
                </div>
              `;
            })
            .join("")}
        </div>
        <p class="form-error" role="alert" tabindex="-1" hidden>
          Completa tots els passos abans de demanar la comprovació.
        </p>
        <div class="button-row">
          <button class="button" type="submit">Demana una comprovació</button>
        </div>
      </form>
    `;
  }

  function renderPracticeSuccess(mechanic, record) {
    const modeLabel =
      record.mode === "guided" ? "Tutor amb bastides" : "Resposta directa";
    return `
      <div class="feedback" role="status">
        <h3>Pràctica completada</h3>
        <p><strong>${escapeHTML(mechanic.practice.solution)}</strong></p>
        <p>${escapeHTML(mechanic.principle)}</p>
      </div>
      <div class="evidence-note">
        <strong>Això és rendiment assistit.</strong> Has acabat correctament
        amb el suport del mode «${escapeHTML(modeLabel)}». La transferència
        sense ajuda vindrà després.
      </div>
      <div class="button-row">
        <button class="button" type="button" data-action="continue-practice">
          ${state.practiceIndex === 1 ? "Passa a la transferència" : "Següent tipus d’ajuda"}
        </button>
      </div>
    `;
  }

  function renderPractice() {
    const sequence = Core.practiceSequence(state.variant);
    const current = sequence[state.practiceIndex];
    const mechanic = Core.MECHANICS[current.mechanicId];
    const record = state.practice[current.mechanicId];
    const modeTitle =
      current.mode === "guided"
        ? "Tutor amb bastides"
        : "Assistent de resposta directa";
    let body;
    if (record.complete) {
      body = renderPracticeSuccess(mechanic, record);
    } else if (current.mode === "guided") {
      body = renderGuidedPractice(current.mechanicId, mechanic, record);
    } else {
      body = renderDirectPractice(current.mechanicId, mechanic, record);
    }
    return `
      <section class="card" aria-labelledby="practiceTitle">
        ${restoreNotice()}
        <p class="phase-label">2 · Pràctica amb IA</p>
        <p class="question-count">Pràctica ${state.practiceIndex + 1} de 2</p>
        <h2 id="practiceTitle" tabindex="-1" data-autofocus>
          ${escapeHTML(modeTitle)}: ${escapeHTML(mechanic.shortTitle)}
        </h2>
        ${body}
      </section>
    `;
  }

  function renderTransferIntro() {
    return `
      <section class="card" aria-labelledby="transferIntroTitle">
        ${restoreNotice()}
        <p class="phase-label">3 · Transferència</p>
        <h2 id="transferIntroTitle" tabindex="-1" data-autofocus>
          Ara l’assistent marxa
        </h2>
        <p class="lead">
          Resoldràs un problema nou de cada mecànica sense veure la pràctica.
          Això s’acosta més a preguntar «què puc reconstruir?» que no pas
          «què puc fer amb ajuda?».
        </p>
        <div class="caution-note">
          <strong>El resultat continua sense ser una mesura científica.</strong>
          Dos ítems no separen coneixement previ, dificultat, atzar i efecte de
          la pràctica.
        </div>
        <div class="button-row">
          <button class="button" type="button" data-action="begin-transfer">
            Resol els problemes nous
          </button>
        </div>
      </section>
    `;
  }

  function renderTransfer() {
    const order = Core.questionOrder(state.variant);
    const mechanicId = order[state.transferIndex];
    const mechanic = Core.MECHANICS[mechanicId];
    return `
      <section class="card" aria-labelledby="transferTitle">
        ${restoreNotice()}
        <p class="phase-label">3 · Transferència sense IA</p>
        <p class="question-count">Pregunta ${state.transferIndex + 1} de 2</p>
        <h2 id="transferTitle" tabindex="-1" data-autofocus>
          Aplica el procediment a un cas nou
        </h2>
        ${questionForm({
          formName: "transfer",
          question: mechanic.transfer,
          selected: state.transfer[mechanicId],
          submitLabel:
            state.transferIndex === 1 ? "Tanca la transferència" : "Continua",
          mechanicId,
        })}
      </section>
    `;
  }

  function renderReliabilityIntro() {
    return `
      <section class="card" aria-labelledby="reliabilityIntroTitle">
        ${restoreNotice()}
        <p class="phase-label">4 · Fiabilitat</p>
        <h2 id="reliabilityIntroTitle" tabindex="-1" data-autofocus>
          Un mecanisme diferent: què passa si l’ajuda s’equivoca?
        </h2>
        <p class="lead">
          La pèrdua d’aprenentatge per delegar i l’acceptació d’una resposta
          incorrecta no són el mateix. Ara observarem la segona per separat.
        </p>
        <ol class="protocol-list">
          <li>Et comprometràs amb una resposta abans de veure l’assistent.</li>
          <li>Rebràs una recomanació segura de si mateixa.</li>
          <li>Podràs mantenir o revisar la teva resposta i la confiança.</li>
        </ol>
        <div class="button-row">
          <button class="button" type="button" data-action="begin-reliability">
            Fes primer el teu càlcul
          </button>
        </div>
      </section>
    `;
  }

  function renderReliabilityInitial() {
    return `
      <section class="card" aria-labelledby="reliabilityInitialTitle">
        ${restoreNotice()}
        <p class="phase-label">4 · Fiabilitat</p>
        <h2 id="reliabilityInitialTitle" tabindex="-1" data-autofocus>
          Decideix abans de veure la recomanació
        </h2>
        ${questionForm({
          formName: "reliability-initial",
          question: Core.RELIABILITY,
          selected: state.reliability.initial,
          submitLabel: "Compromet la resposta",
        })}
      </section>
    `;
  }

  function renderReliabilityReview() {
    const initialLabel = Core.optionLabel(
      Core.RELIABILITY,
      state.reliability.initial.answer,
    );
    return `
      <section class="card" aria-labelledby="reliabilityReviewTitle">
        ${restoreNotice()}
        <p class="phase-label">4 · Fiabilitat</p>
        <h2 id="reliabilityReviewTitle" tabindex="-1" data-autofocus>
          Ara escolta l’assistent
        </h2>
        <div class="initial-answer">
          <strong>La teva resposta inicial:</strong>
          ${escapeHTML(initialLabel)} · confiança
          ${escapeHTML(
            ["", "baixa", "mitjana", "alta"][
              state.reliability.initial.confidence
            ],
          )}
        </div>
        <div class="assistant-card">
          <p class="assistant-label">Assistent sense restriccions · simulat</p>
          <h3>Recomanació</h3>
          <p>${escapeHTML(Core.RELIABILITY.assistantText)}</p>
          <p>
            <strong>Resposta recomanada:</strong>
            «${escapeHTML(
              Core.optionLabel(
                Core.RELIABILITY,
                Core.RELIABILITY.assistantPick,
              ),
            )}»
          </p>
        </div>
        <details id="verificationHint" ${
          state.reliability.hintOpened ? "open" : ""
        }>
          <summary>Vull una pista per verificar el càlcul</summary>
          <p>${escapeHTML(Core.RELIABILITY.verificationHint)}</p>
        </details>
        ${questionForm({
          formName: "reliability-final",
          question: Core.RELIABILITY,
          selected: state.reliability.final,
          submitLabel: "Tanca la resposta final",
        })}
      </section>
    `;
  }

  function reliabilityFeedbackCopy() {
    const outcome = Core.reliabilityOutcome(state);
    const copy = {
      "held-correct":
        "Has mantingut una resposta correcta davant d’una recomanació incorrecta.",
      "corrected-after-agreeing":
        "Inicialment coincidies amb l’error, però la verificació t’ha portat a la resposta correcta.",
      "recovered-correct":
        "Has revisat la resposta inicial i has acabat amb el càlcul correcte.",
      "swayed-from-correct":
        "La recomanació ha desplaçat una resposta inicial correcta cap a l’error de l’assistent.",
      "agreed-throughout":
        "La teva resposta ja coincidia amb l’error. Amb aquestes dades no podem saber si l’assistent t’ha influït.",
      "moved-to-assistant":
        "Has canviat una resposta diferent cap a la recomanació incorrecta de l’assistent.",
      "other-error":
        "No has acceptat la recomanació de l’assistent, però el resultat final tampoc és correcte.",
      incomplete: "No hi ha prou informació per descriure el canvi.",
    };
    return copy[outcome];
  }

  function renderReliabilityFeedback() {
    const correctLabel = Core.optionLabel(
      Core.RELIABILITY,
      Core.RELIABILITY.correct,
    );
    return `
      <section class="card" aria-labelledby="reliabilityFeedbackTitle">
        ${restoreNotice()}
        <p class="phase-label">4 · Fiabilitat</p>
        <h2 id="reliabilityFeedbackTitle" tabindex="-1" data-autofocus>
          La recomanació era incorrecta
        </h2>
        <div class="feedback ${
          state.reliability.final.answer === Core.RELIABILITY.correct
            ? ""
            : "error"
        }" role="status">
          <h3>${escapeHTML(reliabilityFeedbackCopy())}</h3>
          <p>${escapeHTML(Core.RELIABILITY.explanation)}</p>
          <p><strong>Resposta correcta: ${escapeHTML(correctLabel)}.</strong></p>
        </div>
        <div class="caution-note">
          <strong>Coincidir no prova influència.</strong> Només podem parlar
          d’un canvi cap a la recomanació quan la resposta inicial era
          diferent.
        </div>
        <div class="button-row">
          <button class="button" type="button" data-action="show-debrief">
            Mira el mapa complet
          </button>
        </div>
      </section>
    `;
  }

  function correctnessMarkup(correct) {
    return `
      <span class="outcome ${correct ? "correct" : ""}">
        ${correct ? "Encert" : "No encert"}
      </span>
    `;
  }

  function calibrationCopy() {
    const summary = Core.calibrationSummary(state);
    if (summary.highConfidenceErrors > 0) {
      return `${summary.highConfidenceErrors} ${
        summary.highConfidenceErrors === 1 ? "error tenia" : "errors tenien"
      } confiança alta. Aquest és el punt més útil per revisar el calibratge.`;
    }
    if (summary.lowConfidenceCorrect > 0) {
      return `No hi ha errors amb confiança alta. A més, ${summary.lowConfidenceCorrect} ${
        summary.lowConfidenceCorrect === 1
          ? "resposta correcta tenia"
          : "respostes correctes tenien"
      } confiança baixa: potser sabies més del que pensaves.`;
    }
    return "No hi ha errors amb confiança alta en les respostes finals. La confiança i el resultat han quedat raonablement alineats en aquesta mostra mínima.";
  }

  function renderDebrief() {
    const baselineScore = Core.scorePhase(state, "baseline");
    const transferScore = Core.scorePhase(state, "transfer");
    const outcomes = Core.MECHANIC_IDS.map((mechanicId) =>
      Core.mechanicOutcome(state, mechanicId),
    );
    return `
      <section class="card" aria-labelledby="debriefTitle">
        ${restoreNotice()}
        <p class="phase-label">5 · Debrief</p>
        <h2 id="debriefTitle" tabindex="-1" data-autofocus>
          El teu mapa descriptiu
        </h2>
        <p class="lead">
          Els números expliquen què ha passat en aquesta activitat. No expliquen
          per què ha passat ni permeten comparar causalment els dos tipus
          d’ajuda.
        </p>

        <div class="metric-grid">
          <article class="metric">
            <span class="metric-label">Punt de partida</span>
            <span class="metric-value">${baselineScore}/2</span>
            <span class="metric-copy">Problemes resolts abans de l’ajuda</span>
          </article>
          <article class="metric">
            <span class="metric-label">Pràctica assistida</span>
            <span class="metric-value">2/2</span>
            <span class="metric-copy">Pràctiques completades amb suport</span>
          </article>
          <article class="metric">
            <span class="metric-label">Transferència</span>
            <span class="metric-value">${transferScore}/2</span>
            <span class="metric-copy">Problemes nous resolts sense IA</span>
          </article>
        </div>

        <div class="caution-note">
          <strong>No llegeixis la seqüència com un abans/després causal.</strong>
          Els ítems són pocs, les mecàniques són diferents i també hi ha efectes
          de pràctica i coneixement previ.
        </div>

        <table class="result-table">
          <thead>
            <tr>
              <th scope="col">Mecànica</th>
              <th scope="col">Abans</th>
              <th scope="col">Tipus d’ajuda</th>
              <th scope="col">Transferència</th>
            </tr>
          </thead>
          <tbody>
            ${outcomes
              .map((outcome) => {
                const mechanic = Core.MECHANICS[outcome.mechanicId];
                const mode =
                  outcome.mode === "guided"
                    ? "Tutor amb bastides"
                    : "Resposta directa";
                return `
                  <tr>
                    <th scope="row">${escapeHTML(mechanic.shortTitle)}</th>
                    <td data-label="Abans">${correctnessMarkup(
                      outcome.baselineCorrect,
                    )}</td>
                    <td data-label="Ajuda">${escapeHTML(mode)}</td>
                    <td data-label="Transferència">${correctnessMarkup(
                      outcome.transferCorrect,
                    )}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>

        <div class="takeaway">
          <h3>La recomanació incorrecta</h3>
          <p>${escapeHTML(reliabilityFeedbackCopy())}</p>
          <p>${escapeHTML(calibrationCopy())}</p>
        </div>

        <section class="study-section" aria-labelledby="studyTitle">
          <h2 id="studyTitle">El que va trobar l’estudi de Bastani et al.</h2>
          <p>
            L’assaig aleatoritzat es va fer amb gairebé 1.000 alumnes de
            secundària en matemàtiques, a Turquia, durant quatre sessions de 90
            minuts. Comparava un control sense IA amb dues interfícies basades
            en GPT-4.
          </p>
          <div class="study-grid">
            <article class="study-card control">
              <h3>Control</h3>
              <span class="study-number">Referència</span>
              <p>Materials habituals, sense tutor generatiu.</p>
            </article>
            <article class="study-card base">
              <h3>GPT Base</h3>
              <span class="study-number">+48 % / −17 %</span>
              <p>
                +48 % durant la pràctica assistida; −17 % a l’examen posterior
                sense IA respecte del control.
              </p>
            </article>
            <article class="study-card tutor">
              <h3>GPT Tutor</h3>
              <span class="study-number">+127 % / ≈ control</span>
              <p>
                +127 % durant la pràctica; cap diferència estadísticament
                detectable respecte del control a l’examen.
              </p>
            </article>
          </div>
          <div class="evidence-note">
            <strong>El tutor no era només un missatge que deia «dona
            pistes».</strong> Incorporava solucions i errors habituals preparats
            pel professorat. En aquest estudi les bastides van evitar el dany,
            però no van crear un avantatge durador a l’examen.
          </div>
          <p>
            <a
              href="https://doi.org/10.1073/pnas.2422633122"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bastani et al. (2025), <cite>Generative AI without guardrails can
              harm learning</cite>, PNAS
            </a>
          </p>
        </section>

        <div class="button-row">
          <button class="button" type="button" data-action="begin-reflection">
            Aplica la idea a una situació nova
          </button>
        </div>
      </section>
    `;
  }

  function renderReflection() {
    const showError =
      state.reflection.attempts > 0 && !state.reflection.correct;
    return `
      <section class="card" aria-labelledby="reflectionTitle">
        ${restoreNotice()}
        <p class="phase-label">5 · Transferència conceptual</p>
        <h2 id="reflectionTitle" tabindex="-1" data-autofocus>
          Ara aplica la lliçó, no la fórmula
        </h2>
        ${
          showError
            ? `
              <div class="feedback error" role="alert">
                <h3>Revisa l’estratègia</h3>
                <p>
                  Busca l’opció que manté l’esforç cognitiu, demana suport sense
                  delegar tota la tasca i acaba comprovant la transferència.
                </p>
              </div>
            `
            : ""
        }
        <form class="question-form" data-form="reflection" novalidate>
          <fieldset>
            <legend>${escapeHTML(Core.REFLECTION.prompt)}</legend>
            <div class="option-list">
              ${optionMarkup(Core.REFLECTION, state.reflection.answer)}
            </div>
          </fieldset>
          <p class="form-error" role="alert" tabindex="-1" hidden>
            Selecciona una estratègia abans de comprovar-la.
          </p>
          <div class="button-row">
            <button class="button" type="submit">Comprova l’estratègia</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderCommitment() {
    return `
      <section class="card" aria-labelledby="commitmentTitle">
        ${restoreNotice()}
        <p class="phase-label">5 · Compromís pràctic</p>
        <h2 id="commitmentTitle" tabindex="-1" data-autofocus>
          Tria una barrera de protecció per a la pròxima vegada
        </h2>
        <p class="lead">
          No cal abandonar la IA. Cal decidir quin treball no vols delegar quan
          l’objectiu és aprendre.
        </p>
        <div class="feedback">
          <h3>Transferència conceptual resolta</h3>
          <p>${escapeHTML(Core.REFLECTION.explanation)}</p>
        </div>
        <form class="question-form" data-form="commitment" novalidate>
          <fieldset>
            <legend>Quina acció concreta vols provar?</legend>
            <div class="option-list commitment-options">
              ${Core.GUARDRAILS.map((guardrail, index) => {
                const checked =
                  state.guardrail === guardrail.id ? " checked" : "";
                return `
                  <label class="option">
                    <input
                      class="option-input"
                      type="radio"
                      name="guardrail"
                      value="${escapeHTML(guardrail.id)}"
                      ${checked}
                    />
                    <span class="option-body">
                      <span class="option-marker" aria-hidden="true">
                        ${index + 1}
                      </span>
                      <span>
                        <span class="commitment-title">
                          ${escapeHTML(guardrail.title)}
                        </span>
                        <span class="commitment-description">
                          ${escapeHTML(guardrail.description)}
                        </span>
                      </span>
                    </span>
                  </label>
                `;
              }).join("")}
            </div>
          </fieldset>
          <p class="form-error" role="alert" tabindex="-1" hidden>
            Tria una acció concreta per completar l’activitat.
          </p>
          <div class="button-row">
            <button class="button" type="submit">Completa l’activitat</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderComplete() {
    const guardrail = Core.GUARDRAILS.find(
      (candidate) => candidate.id === state.guardrail,
    );
    return `
      <section class="card" aria-labelledby="completeTitle">
        ${restoreNotice()}
        <div class="completion-mark" aria-hidden="true">✓</div>
        <p class="phase-label">Activitat completada</p>
        <h2 id="completeTitle" tabindex="-1" data-autofocus>
          Rendiment, aprenentatge i confiança ja no són sinònims
        </h2>
        <p class="lead">
          Pots aprofitar l’assistència sense lliurar-li tot el procés. La clau
          és conservar oportunitats d’intentar, explicar, verificar i recuperar
          el coneixement sense ajuda.
        </p>
        <div class="takeaway">
          <h3>El teu compromís</h3>
          <p><strong>${escapeHTML(guardrail?.title || "")}</strong></p>
          <p>${escapeHTML(guardrail?.description || "")}</p>
        </div>
        <h3>Protocol mínim per aprendre amb IA</h3>
        <ol class="protocol-list">
          <li>Fes un primer intent abans de demanar ajuda.</li>
          <li>Demana una pista o una pregunta, no necessàriament la solució.</li>
          <li>Explica i verifica el procediment amb paraules teves.</li>
          <li>Acaba amb un cas nou resolt sense l’assistent.</li>
        </ol>
        <p>
          La finalització ha quedat disponible per al curs. No s’han compartit
          les teves respostes, confiança ni elecció personal.
        </p>
        <div class="button-row">
          <button class="button button-quiet" type="button" data-action="open-reset">
            Torna a començar
          </button>
        </div>
      </section>
    `;
  }

  function viewMarkup() {
    const views = {
      intro: renderIntro,
      baseline: renderBaseline,
      "practice-intro": renderPracticeIntro,
      practice: renderPractice,
      "transfer-intro": renderTransferIntro,
      transfer: renderTransfer,
      "reliability-intro": renderReliabilityIntro,
      "reliability-initial": renderReliabilityInitial,
      "reliability-review": renderReliabilityReview,
      "reliability-feedback": renderReliabilityFeedback,
      debrief: renderDebrief,
      reflection: renderReflection,
      commitment: renderCommitment,
      complete: renderComplete,
    };
    return (views[state.screen] || renderIntro)();
  }

  function render(announcement, shouldFocus = true) {
    updateProgress();
    app.innerHTML = viewMarkup();
    if (wasRestored && !restoreNoticeShown) restoreNoticeShown = true;
    if (shouldFocus) focusNewView();
    if (announcement) announce(announcement);
    emitProgress();
    emitCompletion();
    scheduleResize();
  }

  function saveAndRender(announcement) {
    saveState();
    render(announcement);
  }

  function moveTo(screen, announcement) {
    state.screen = screen;
    saveAndRender(announcement);
  }

  function showFormError(form, message) {
    const error = form.querySelector(".form-error");
    if (!error) return;
    if (message) error.textContent = message;
    error.hidden = false;
    error.focus();
  }

  function readAnswerAndConfidence(form) {
    const data = new FormData(form);
    const answer = data.get("answer");
    const confidence = Number(data.get("confidence"));
    if (!answer || ![1, 2, 3].includes(confidence)) {
      showFormError(form, "Selecciona una resposta i el nivell de confiança.");
      return null;
    }
    return { answer: String(answer), confidence };
  }

  function handleBaseline(form) {
    const mechanicId = form.dataset.mechanic;
    const record = readAnswerAndConfidence(form);
    if (!record) return;
    state.baseline[mechanicId] = record;
    state.baselineIndex += 1;
    if (state.baselineIndex >= 2) {
      state.baselineIndex = 2;
      state.screen = "practice-intro";
      saveAndRender("Punt de partida completat. Comença la pràctica amb IA.");
    } else {
      saveAndRender(
        "Resposta registrada. Segona pregunta del punt de partida.",
      );
    }
  }

  function handleDirectPractice(form) {
    const mechanicId = form.dataset.mechanic;
    const mechanic = Core.MECHANICS[mechanicId];
    const data = new FormData(form);
    const answer = data.get("answer");
    if (!Core.validAnswer(mechanic.practice.check, answer)) {
      showFormError(form, "Selecciona una resposta abans de comprovar-la.");
      return;
    }
    const record = state.practice[mechanicId];
    record.attempts += 1;
    record.lastAnswer = String(answer);
    record.complete = answer === mechanic.practice.check.correct;
    saveAndRender(
      record.complete
        ? "Idea comprovada. Pràctica assistida completada."
        : "La resposta encara no és correcta. Revisa la pista.",
    );
  }

  function handleGuidedPractice(form) {
    const mechanicId = form.dataset.mechanic;
    const mechanic = Core.MECHANICS[mechanicId];
    const data = new FormData(form);
    const answers = {};
    for (const step of mechanic.practice.guidedSteps) {
      const value = data.get(`step-${step.id}`);
      if (!value) {
        showFormError(
          form,
          "Completa tots els passos abans de demanar la comprovació.",
        );
        return;
      }
      answers[step.id] = String(value);
    }
    const record = state.practice[mechanicId];
    record.attempts += 1;
    record.lastSteps = answers;
    record.complete = mechanic.practice.guidedSteps.every(
      (step) => answers[step.id] === step.correct,
    );
    saveAndRender(
      record.complete
        ? "Has construït tots els passos. Pràctica assistida completada."
        : "Alguns passos necessiten revisió. El tutor ha afegit pistes.",
    );
  }

  function handleTransfer(form) {
    const mechanicId = form.dataset.mechanic;
    const record = readAnswerAndConfidence(form);
    if (!record) return;
    state.transfer[mechanicId] = record;
    state.transferIndex += 1;
    if (state.transferIndex >= 2) {
      state.transferIndex = 2;
      state.screen = "reliability-intro";
      saveAndRender(
        "Transferència completada. Ara separaràs aprenentatge i fiabilitat.",
      );
    } else {
      saveAndRender("Resposta registrada. Segon problema de transferència.");
    }
  }

  function handleReliabilityInitial(form) {
    const record = readAnswerAndConfidence(form);
    if (!record) return;
    state.reliability.initial = record;
    state.screen = "reliability-review";
    saveAndRender(
      "Resposta inicial registrada. Ara pots revisar la recomanació.",
    );
  }

  function handleReliabilityFinal(form) {
    const record = readAnswerAndConfidence(form);
    if (!record) return;
    state.reliability.final = record;
    state.screen = "reliability-feedback";
    saveAndRender("Resposta final registrada. S’ha revelat la correcció.");
  }

  function handleReflection(form) {
    const data = new FormData(form);
    const answer = data.get("answer");
    if (!Core.validAnswer(Core.REFLECTION, answer)) {
      showFormError(form, "Selecciona una estratègia abans de comprovar-la.");
      return;
    }
    state.reflection.answer = String(answer);
    state.reflection.attempts += 1;
    state.reflection.correct = answer === Core.REFLECTION.correct;
    if (state.reflection.correct) {
      state.screen = "commitment";
      saveAndRender(
        "Transferència conceptual resolta. Tria una acció concreta.",
      );
    } else {
      saveAndRender(
        "L’estratègia encara delega massa del procés. Torna-ho a provar.",
      );
    }
  }

  function handleCommitment(form) {
    const data = new FormData(form);
    const guardrail = data.get("guardrail");
    if (!Core.GUARDRAILS.some((candidate) => candidate.id === guardrail)) {
      showFormError(form, "Tria una acció concreta per completar l’activitat.");
      return;
    }
    state.guardrail = String(guardrail);
    state.completed = true;
    state.screen = "complete";
    saveAndRender("Activitat completada. El teu compromís està preparat.");
  }

  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const handlers = {
      baseline: handleBaseline,
      "direct-practice": handleDirectPractice,
      "guided-practice": handleGuidedPractice,
      transfer: handleTransfer,
      "reliability-initial": handleReliabilityInitial,
      "reliability-final": handleReliabilityFinal,
      reflection: handleReflection,
      commitment: handleCommitment,
    };
    handlers[form.dataset.form]?.(form);
  });

  function openRestartDialog() {
    if (typeof restartDialog.showModal === "function") {
      restartDialog.returnValue = "";
      restartDialog.showModal();
    } else if (
      window.confirm("Vols esborrar el progrés i tornar a començar?")
    ) {
      resetActivity();
    }
  }

  function resetActivity() {
    clearState();
    state = Core.createInitialState(randomSeed(), forcedVariant());
    wasRestored = false;
    completionDispatched = false;
    restoreNoticeShown = true;
    lastProgressSignature = "";
    render("Progrés esborrat. L’activitat ha tornat a l’inici.");
  }

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const actions = {
      start() {
        state.screen = "baseline";
        saveAndRender("Comença el punt de partida. Primera pregunta de dues.");
      },
      "begin-practice"() {
        moveTo("practice", "Comença la primera pràctica assistida.");
      },
      "continue-practice"() {
        state.practiceIndex += 1;
        if (state.practiceIndex >= 2) {
          state.practiceIndex = 2;
          state.screen = "transfer-intro";
          saveAndRender("Pràctica assistida completada. L’assistent marxa.");
        } else {
          saveAndRender("Segona pràctica. Ha canviat el tipus d’ajuda.");
        }
      },
      "begin-transfer"() {
        moveTo("transfer", "Comença la transferència sense IA.");
      },
      "begin-reliability"() {
        moveTo(
          "reliability-initial",
          "Decideix abans de veure la recomanació.",
        );
      },
      "show-debrief"() {
        moveTo("debrief", "S’ha obert el debrief amb els resultats.");
      },
      "begin-reflection"() {
        moveTo(
          "reflection",
          "Aplica la lliçó a una nova situació d’aprenentatge.",
        );
      },
      "open-reset": openRestartDialog,
    };
    actions[button.dataset.action]?.();
  });

  restartButton.addEventListener("click", openRestartDialog);
  restartDialog.addEventListener("close", () => {
    if (restartDialog.returnValue === "confirm") resetActivity();
  });

  document.addEventListener(
    "toggle",
    (event) => {
      if (event.target.id !== "verificationHint" || !event.target.open) return;
      if (!state.reliability.hintOpened) {
        state.reliability.hintOpened = true;
        saveState();
      }
    },
    true,
  );

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(document.documentElement);
  } else {
    window.addEventListener("resize", scheduleResize);
  }

  window.addEventListener("pageshow", scheduleResize);
  render(
    wasRestored
      ? "S’ha recuperat el progrés de l’activitat."
      : "Activitat preparada.",
    wasRestored,
  );
})();
