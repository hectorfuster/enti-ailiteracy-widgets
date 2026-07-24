(function initB8Widget() {
  "use strict";

  const Content = window.B8Content;
  const Core = window.B8MirrorCore;
  const app = document.getElementById("app");
  const activity = document.getElementById("activity");
  const statusRegion = document.getElementById("activityStatus");
  const progressShell = document.getElementById("progressShell");
  const progressLabel = document.getElementById("progressLabel");
  const progressValue = document.getElementById("progressValue");
  const progressBar = document.getElementById("progressBar");
  const progressStep = document.getElementById("progressStep");
  const restartButton = document.getElementById("restartButton");
  const restartDialog = document.getElementById("restartDialog");
  const restoreNotice = document.getElementById("restoreNotice");

  if (!Content || !Core) {
    app.innerHTML = `
      <section class="card">
        <h2>No s’ha pogut iniciar l’activitat</h2>
        <p>Falta un fitxer essencial. Torna a carregar la pàgina o avisa la persona responsable del curs.</p>
      </section>
    `;
    return;
  }

  const STORAGE_KEY = "enti-b8-consent-mirror-v3";
  const WIDGET_ID = "b8-consent-mirror";
  const WIDGET_VERSION = "2.1.0";
  const TOTAL_STEPS = 6;
  const parentOrigin = configuredParentOrigin();
  const coursePolicy = configuredCoursePolicy();
  const trackedMode = Boolean(
    parentOrigin && window.parent && window.parent !== window,
  );

  let restoreNoticePending = false;
  let wasRestored = false;
  let lastProgressSignature = "";
  let lastResizeHeight = 0;
  let resizeFrame = 0;

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "#";
    } catch {
      return "#";
    }
  }

  function configuredParentOrigin() {
    const raw = new URLSearchParams(window.location.search).get("parentOrigin");
    if (!raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  function configuredCoursePolicy() {
    const parameters = new URLSearchParams(window.location.search);
    const rawUrl = parameters.get("coursePolicyUrl");
    if (!rawUrl) return null;
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== "https:") return null;
      const rawLabel = parameters.get("coursePolicyLabel") || "";
      const label =
        rawLabel.trim().slice(0, 80) || "Política del curs sobre l’ús d’IA";
      return Object.freeze({ url: url.href, label });
    } catch {
      return null;
    }
  }

  function createAttemptId() {
    try {
      if (typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (value) =>
        value.toString(16).padStart(2, "0"),
      ).join("");
    } catch {
      return `attempt-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    }
  }

  function loadState() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return Core.sanitiseState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function saveState() {
    try {
      if (!hasProgress()) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The activity remains usable if tab-local storage is unavailable.
    }
  }

  function clearState() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // There is nothing else to clear if storage is unavailable.
    }
  }

  let state = loadState();
  if (state) {
    wasRestored = state.screen !== "intro";
    restoreNoticePending = wasRestored;
  } else {
    clearState();
    state = Core.createInitialState(createAttemptId());
  }

  function radioChoices({ choices, name, selected, idPrefix }) {
    return `
      <div class="choices">
        ${choices
          .map((choice, index) => {
            const id = `${idPrefix}-${index}`;
            return `
              <div class="choice">
                <input
                  id="${escapeHTML(id)}"
                  name="${escapeHTML(name)}"
                  type="radio"
                  value="${escapeHTML(choice.id)}"
                  ${choice.id === selected ? "checked" : ""}
                />
                <label for="${escapeHTML(id)}">${escapeHTML(choice.label)}</label>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function formError() {
    return `<p class="form-error" role="alert" tabindex="-1" hidden></p>`;
  }

  function limitsNote() {
    return `
      <p class="limits">
        Aquesta és una reflexió guiada, no una puntuació moral, una prova de
        personalitat ni assessorament jurídic. El context és
        ${escapeHTML(Content.JURISDICTION)} i es va revisar el
        ${escapeHTML(Content.REVIEWED_ON)}.
      </p>
    `;
  }

  function coursePolicyNote() {
    const destination = coursePolicy
      ? `
          <a
            href="${escapeHTML(coursePolicy.url)}"
            target="_blank"
            rel="noopener"
          >${escapeHTML(coursePolicy.label)}</a>
        `
      : "Consulta la política vigent que el curs publica a Moodle.";
    return `
      <aside class="policy-note" aria-labelledby="coursePolicyTitle">
        <h3 id="coursePolicyTitle">Política institucional i del curs</h3>
        <p>
          El marc general d’aquesta activitat no substitueix les normes docents.
          La política del curs pot concretar què es permet en els lliuraments i
          quines proves, declaracions o atribucions calen. ${destination}
        </p>
      </aside>
    `;
  }

  function renderIntro() {
    const privacy = trackedMode
      ? "Les decisions es processen i es conserven només en aquesta pestanya. Moodle rep únicament el pas, el percentatge, l’alçada i la finalització; no rep les opcions triades."
      : "Les decisions es processen i es conserven només en aquesta pestanya. No s’envien enlloc. Reiniciar l’activitat n’esborra la còpia de sessió.";
    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">Orientació</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          El mateix principi, des de dos costats
        </h2>
        <p class="lead">
          Prendràs cinc decisions com a estudi i cinc com a creador. El mirall
          les reunirà en una sola vista perquè puguis comparar els principis i
          aplicar-los a un cas nou.
        </p>

        <div class="orientation-grid" aria-label="Característiques de l’activitat">
          <div class="orientation-item">
            <strong>4–6 minuts</strong>
            <span>Decisions breus, un mirall i un cas final.</span>
          </div>
          <div class="orientation-item">
            <strong>Sense nota</strong>
            <span>No hi ha una ideologia ni una resposta personal obligatòries.</span>
          </div>
          <div class="orientation-item">
            <strong>Amb incertesa</strong>
            <span>«Necessito més informació» és una resposta vàlida.</span>
          </div>
        </div>

        <div class="orientation-notes">
          <div class="privacy-note">
            <h3>Privacitat i funcionament</h3>
            <p>${escapeHTML(privacy)}</p>
          </div>

          ${coursePolicyNote()}
        </div>

        <div class="button-row">
          <button class="button" type="button" data-action="begin">
            Comença amb el barret d’estudi
          </button>
        </div>
        ${limitsNote()}
      </section>
    `;
  }

  function renderQuestion(role) {
    const isStudio = role === "studio";
    const index = isStudio ? state.studioIndex : state.creatorIndex;
    const dimension = Content.DIMENSIONS[index];
    const roleContent = dimension[role];
    const answer = isStudio
      ? state.studioAnswers[dimension.id]
      : state.creatorAnswers[dimension.id];
    const heading = isStudio
      ? "Decideix com a estudi"
      : "Decideix com a creador";
    const stage = isStudio ? "Barret d’estudi" : "Barret de creador";
    const submitAction = isStudio ? "submit-studio" : "submit-creator";
    const backAction = isStudio ? "back-studio" : "back-creator";
    const nextLabel =
      index === Content.DIMENSIONS.length - 1
        ? isStudio
          ? "Tanca les decisions de l’estudi"
          : "Obre el mirall"
        : "Continua";

    return `
      <section class="card" aria-labelledby="screenTitle">
        <div class="question-meta">
          <span class="stage-label">${escapeHTML(stage)}</span>
          <span>Pregunta ${index + 1} de ${Content.DIMENSIONS.length}</span>
        </div>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          ${escapeHTML(heading)}
        </h2>
        <p class="lead">${escapeHTML(dimension.title)}</p>
        <form data-form="${escapeHTML(submitAction)}" novalidate>
          <fieldset>
            <legend>${escapeHTML(roleContent.prompt)}</legend>
            ${radioChoices({
              choices: roleContent.choices,
              name: `${role}-answer`,
              selected: answer,
              idPrefix: `${role}-${dimension.id}`,
            })}
          </fieldset>
          ${formError()}
          <div class="button-row">
            <button
              class="button button-quiet"
              type="button"
              data-action="${escapeHTML(backAction)}"
            >
              Enrere
            </button>
            <button class="button" type="submit">${escapeHTML(nextLabel)}</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderPrediction() {
    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">Canvi de perspectiva</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          Abans de posar-te el barret de creador
        </h2>
        <p class="lead">
          Les cinc decisions de compra han quedat registrades. No es mostraran
          mentre respons des de l’altre costat.
        </p>
        <form data-form="submit-prediction" novalidate>
          <fieldset>
            <legend>
              Què predius que passarà quan canviï el teu rol?
            </legend>
            ${radioChoices({
              choices: Content.PREDICTIONS,
              name: "prediction",
              selected: state.prediction,
              idPrefix: "prediction",
            })}
          </fieldset>
          ${formError()}
          <div class="button-row">
            <button
              class="button button-quiet"
              type="button"
              data-action="back-prediction"
            >
              Revisa l’última decisió
            </button>
            <button class="button" type="submit">
              Posa’t el barret de creador
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function sourceLinks(dimension) {
    return dimension.sourceIds
      .map((sourceId) => Content.SOURCES[sourceId])
      .filter(Boolean)
      .map(
        (source) => `
          <li>
            <a
              href="${escapeHTML(safeExternalUrl(source.url))}"
              target="_blank"
              rel="noopener"
            >${escapeHTML(source.title)}</a>
          </li>
        `,
      )
      .join("");
  }

  function baseStatePresentation(comparison) {
    if (comparison === "same-principle") {
      return {
        className: "state-shared",
        label: "Mateix principi de partida",
        explanation:
          "Les dues opcions apunten a la mateixa política. La coincidència no demostra, per si sola, que el principi sigui prou sòlid.",
      };
    }
    if (comparison === "need-information") {
      return {
        className: "state-pending",
        label: "Decisió pendent d’informació",
        explanation:
          "Com a mínim una de les dues respostes deixa la decisió oberta. Ara pots concretar què falta.",
      };
    }
    return {
      className: "state-different",
      label: "Aplicacions diferents",
      explanation:
        "Les dues respostes apunten a polítiques diferents. Això no és automàticament una contradicció: cal examinar-ne la raó.",
    };
  }

  function renderMirror() {
    const counts = Core.resultCounts(state);
    const mirrorItems = Content.DIMENSIONS.map((dimension, index) => {
      const policies = Core.policiesForDimension(state, dimension.id);
      const presentation = baseStatePresentation(
        Core.baseComparison(state, dimension.id),
      );
      return `
        <details class="mirror-item">
          <summary>
            <span>
              <span class="mirror-number">Principi ${index + 1}</span>
              <strong>${escapeHTML(dimension.shortTitle)}</strong>
            </span>
            <span class="state-badge ${escapeHTML(presentation.className)}">
              ${escapeHTML(presentation.label)}
            </span>
            <span class="mirror-toggle" aria-hidden="true">
              <span class="mirror-toggle-closed">+</span>
              <span class="mirror-toggle-open">−</span>
            </span>
          </summary>
          <div class="mirror-item-body">
            <p class="principle-line">${escapeHTML(dimension.principle)}</p>
            <div class="comparison-grid">
              <section class="comparison-side">
                <span class="role">Com a estudi</span>
                <p>${escapeHTML(policies.studioChoice.label)}</p>
              </section>
              <section class="comparison-side">
                <span class="role">Com a creador</span>
                <p>${escapeHTML(policies.creatorChoice.label)}</p>
              </section>
            </div>
            <p class="comparison-explanation">
              ${escapeHTML(presentation.explanation)}
            </p>
            <div class="context-compact">
              <p><strong>Context:</strong> ${escapeHTML(dimension.context)}</p>
              <p><strong>Prova útil:</strong> ${escapeHTML(dimension.evidence)}</p>
              <ul class="source-list">${sourceLinks(dimension)}</ul>
            </div>
          </div>
        </details>
      `;
    }).join("");

    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">El mirall</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          Com canvien les decisions amb el rol?
        </h2>
        <p class="lead">
          Aquí tens els cinc resultats junts. No és una nota: una aplicació
          diferent pot ser raonable, i deixar una decisió pendent també ho és.
          Obre només els principis que vulguis examinar.
        </p>

        <div class="result-grid result-grid-three" aria-label="Resum del mirall">
          <div class="result-stat state-shared">
            <strong>${counts.shared}</strong>
            <span>principis compartits</span>
          </div>
          <div class="result-stat state-different">
            <strong>${counts.different}</strong>
            <span>aplicacions diferents</span>
          </div>
          <div class="result-stat state-pending">
            <strong>${counts.pending}</strong>
            <span>decisions pendents</span>
          </div>
        </div>

        <div class="mirror-list">
          ${mirrorItems}
        </div>

        <p class="source-meta">
          Àmbit: ${escapeHTML(Content.JURISDICTION)} · Revisat:
          ${escapeHTML(Content.REVIEWED_ON)} · Revisió següent:
          ${escapeHTML(Content.NEXT_REVIEW_ON)} · Responsable:
          ${escapeHTML(Content.CONTENT_OWNER_ROLE)}
        </p>

        <div class="button-row">
          <button class="button" type="button" data-action="continue-mirror">
            Continua amb un cas nou
          </button>
        </div>
        ${limitsNote()}
      </section>
    `;
  }

  function renderTransfer() {
    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">Transferència</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          ${escapeHTML(Content.TRANSFER.title)}
        </h2>
        <div class="transfer-scenario">
          <h3>Situació</h3>
          <p>${escapeHTML(Content.TRANSFER.scenario)}</p>
        </div>
        <form data-form="submit-transfer" novalidate>
          <fieldset>
            <legend>${escapeHTML(Content.TRANSFER.prompt)}</legend>
            ${radioChoices({
              choices: Content.TRANSFER.choices,
              name: "transfer-choice",
              selected: state.transferChoice,
              idPrefix: "transfer",
            })}
          </fieldset>
          ${formError()}
          <div class="button-row">
            <button class="button" type="submit">
              Examina la decisió
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function renderTransferFeedback() {
    const choice = Content.TRANSFER.choices.find(
      (item) => item.id === state.transferChoice,
    );
    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">Retorn de transferència</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          Què protegeix la teva primera decisió?
        </h2>
        <div class="feedback" role="status">
          <h3>${escapeHTML(choice.label)}</h3>
          <p>${escapeHTML(choice.feedback)}</p>
        </div>
        <p>
          No és una correcció ideològica. La prova de transferència consisteix
          a identificar què resol la decisió, què deixa pendent i quina
          evidència demanaries.
        </p>
        <div class="button-row">
          <button
            class="button button-quiet"
            type="button"
            data-action="back-transfer-feedback"
          >
            Canvia la decisió
          </button>
          <button class="button" type="button" data-action="continue-feedback">
            Formula el teu principi
          </button>
        </div>
      </section>
    `;
  }

  function renderCommitment() {
    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">Principi reutilitzable</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          Què t’emportes a un projecte real?
        </h2>
        <p class="lead">
          Tria una regla mínima que voldries aplicar també quan canviïs de
          costat de la taula. Aquesta única tria tanca l’activitat.
        </p>
        <form data-form="submit-commitment" novalidate>
          <fieldset>
            <legend>El meu estàndard mínim serà…</legend>
            ${radioChoices({
              choices: Content.COMMITMENT_STANDARDS,
              name: "commitment-standard",
              selected: state.commitment.standard,
              idPrefix: "standard",
            })}
          </fieldset>
          ${formError()}
          <div class="button-row">
            <button class="button" type="submit">
              Completa l’activitat
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function resultPresentation(resultId) {
    const presentations = {
      "shared-principle": {
        className: "state-shared",
        label: "Principi compartit",
      },
      "application-different": {
        className: "state-different",
        label: "Aplicació diferent",
      },
      "need-information": {
        className: "state-pending",
        label: "Informació pendent",
      },
    };
    return (
      presentations[resultId] || {
        className: "state-pending",
        label: "Revisió pendent",
      }
    );
  }

  function commitmentSummary() {
    const standard = Content.COMMITMENT_STANDARDS.find(
      (item) => item.id === state.commitment.standard,
    );
    const parts = [`El meu estàndard mínim: ${standard?.label || ""}`];
    parts.push(
      "",
      "Cinc preguntes abans d’utilitzar un sistema:",
      ...Content.CHECKLIST.map((item, index) => `${index + 1}. ${item}`),
    );
    return parts.join("\n");
  }

  function renderComplete() {
    const counts = Core.resultCounts(state);
    const standard = Content.COMMITMENT_STANDARDS.find(
      (item) => item.id === state.commitment.standard,
    );
    const transfer = Content.TRANSFER.choices.find(
      (item) => item.id === state.transferChoice,
    );
    const dimensionResults = Content.DIMENSIONS.map((dimension) => {
      const result = Core.resultForDimension(state, dimension.id);
      const presentation = resultPresentation(result.id);
      return `
        <li>
          <strong>${escapeHTML(dimension.shortTitle)}:</strong>
          <span class="state-badge ${escapeHTML(presentation.className)}">
            ${escapeHTML(presentation.label)}
          </span>
        </li>
      `;
    }).join("");

    return `
      <section class="card" aria-labelledby="screenTitle">
        <p class="stage-label">Activitat completada</p>
        <h2 id="screenTitle" data-screen-heading tabindex="-1">
          Un principi per portar a la taula
        </h2>
        <p class="lead">
          El mirall no ha mesurat si ets una persona “coherent”. Ha convertit
          les teves decisions en principis compartits, aplicacions diferents i
          preguntes pendents.
        </p>

        <div class="result-grid result-grid-three" aria-label="Resum del mirall">
          <div class="result-stat state-shared">
            <strong>${counts.shared}</strong>
            <span>principis compartits</span>
          </div>
          <div class="result-stat state-different">
            <strong>${counts.different}</strong>
            <span>aplicacions diferents</span>
          </div>
          <div class="result-stat state-pending">
            <strong>${counts.pending}</strong>
            <span>decisions pendents</span>
          </div>
        </div>

        <details class="context-details">
          <summary>Mostra el resultat dels cinc principis</summary>
          <div class="context-body">
            <ul>${dimensionResults}</ul>
          </div>
        </details>

        <div class="final-principle">
          <h3>El meu estàndard mínim</h3>
          <p>${escapeHTML(standard.label)}</p>
        </div>

        <div class="feedback">
          <h3>Transferència</h3>
          <p><strong>Primera decisió:</strong> ${escapeHTML(transfer.label)}</p>
          <p>${escapeHTML(transfer.feedback)}</p>
        </div>

        <section aria-labelledby="checklistTitle">
          <h3 id="checklistTitle">Cinc preguntes abans d’utilitzar un sistema</h3>
          <ol>
            ${Content.CHECKLIST.map(
              (item) => `<li>${escapeHTML(item)}</li>`,
            ).join("")}
          </ol>
        </section>

        <div class="button-row">
          <button class="button" type="button" data-action="copy-summary">
            Copia el resum
          </button>
          <button
            class="button button-quiet"
            type="button"
            data-action="print-summary"
          >
            Imprimeix
          </button>
          <button
            class="button button-quiet"
            type="button"
            data-action="open-reset"
          >
            Torna a començar
          </button>
        </div>
        ${limitsNote()}
      </section>
    `;
  }

  function renderScreen() {
    switch (state.screen) {
      case "intro":
        return renderIntro();
      case "studio":
        return renderQuestion("studio");
      case "prediction":
        return renderPrediction();
      case "creator":
        return renderQuestion("creator");
      case "mirror":
        return renderMirror();
      case "transfer":
        return renderTransfer();
      case "transfer-feedback":
        return renderTransferFeedback();
      case "commitment":
        return renderCommitment();
      case "complete":
        return renderComplete();
      default:
        throw new Error("Pantalla desconeguda.");
    }
  }

  function hasProgress() {
    return Boolean(
      state.screen !== "intro" ||
        Object.keys(state.studioAnswers).length ||
        Object.keys(state.creatorAnswers).length,
    );
  }

  function updateProgress() {
    const progress = Core.progressForState(state);
    progressShell.hidden = false;
    restartButton.hidden = !hasProgress();
    progressLabel.textContent = progress.label;
    progressValue.textContent = `${progress.percent} %`;
    progressBar.value = progress.percent;
    progressBar.textContent = `${progress.percent} %`;
    progressBar.setAttribute(
      "aria-label",
      `${progress.label}: ${progress.percent} %`,
    );
    progressStep.textContent = `Pas ${progress.step} de ${TOTAL_STEPS}`;
  }

  function announce(message) {
    if (!message) return;
    statusRegion.textContent = "";
    window.requestAnimationFrame(() => {
      statusRegion.textContent = message;
    });
  }

  function focusScreenHeading() {
    const heading = app.querySelector("[data-screen-heading]");
    if (!heading) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function emitWidgetEvent(type, outcome) {
    const payload = Object.freeze({
      type,
      widget: WIDGET_ID,
      version: WIDGET_VERSION,
      outcome: Object.freeze(outcome),
    });
    document.dispatchEvent(
      new CustomEvent(type, {
        detail: payload,
      }),
    );
    if (trackedMode) {
      window.parent.postMessage(payload, parentOrigin);
    }
  }

  function emitProgress() {
    const progress = Core.progressForState(state);
    const signature = `${state.screen}:${progress.step}:${progress.percent}:${state.completed}`;
    if (signature === lastProgressSignature) return;
    lastProgressSignature = signature;
    emitWidgetEvent("enti-widget-progress", {
      stageId: state.screen,
      step: progress.step,
      stepLabel: progress.label,
      percent: progress.percent,
      completed: state.completed,
    });
  }

  function emitCompletionIfNeeded() {
    if (!state.completed || state.completionSignalled) return;
    state.completionSignalled = true;
    saveState();
    emitWidgetEvent("enti-widget-complete", {
      completed: true,
      restored: wasRestored,
    });
  }

  function emitResize() {
    resizeFrame = 0;
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (height === lastResizeHeight || height < 200 || height > 20_000) return;
    lastResizeHeight = height;
    emitWidgetEvent("enti-widget-resize", { height });
  }

  function scheduleResize() {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(emitResize);
  }

  function render(message = "", shouldFocus = true) {
    try {
      app.innerHTML = renderScreen();
    } catch {
      app.innerHTML = `
        <section class="card" aria-labelledby="fatalTitle">
          <h2 id="fatalTitle" data-screen-heading tabindex="-1">
            L’activitat ha trobat un estat que no pot continuar
          </h2>
          <p>
            Les dades de la pestanya poden haver quedat incompletes. Reinicia
            l’activitat per tornar a un estat segur.
          </p>
          <button class="button" type="button" data-action="reset-now">
            Reinicia l’activitat
          </button>
        </section>
      `;
      message =
        "L’activitat no ha pogut continuar. Pots reiniciar-la de manera segura.";
    }

    updateProgress();
    if (restoreNoticePending) {
      restoreNotice.textContent =
        "Hem recuperat el progrés guardat en aquesta pestanya.";
      restoreNotice.hidden = false;
      restoreNoticePending = false;
    } else {
      restoreNotice.hidden = true;
    }
    saveState();
    emitProgress();
    if (state.screen === "complete") emitCompletionIfNeeded();
    announce(message);
    scheduleResize();
    if (shouldFocus) window.requestAnimationFrame(focusScreenHeading);
  }

  function showFormError(message) {
    const error = app.querySelector(".form-error");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
    error.focus();
    announce(message);
    scheduleResize();
  }

  function begin() {
    state.screen = "studio";
    state.studioIndex = 0;
    render("Primera pregunta: decideixes amb el barret d’estudi.");
  }

  function backStudio() {
    if (state.studioIndex === 0) state.screen = "intro";
    else state.studioIndex -= 1;
    render("Has tornat a la pantalla anterior.");
  }

  function submitStudio() {
    const dimension = Content.DIMENSIONS[state.studioIndex];
    if (
      !Core.validAnswer(
        dimension.id,
        "studio",
        state.studioAnswers[dimension.id],
      )
    ) {
      showFormError("Tria una opció abans de continuar.");
      return;
    }
    if (state.studioIndex < Content.DIMENSIONS.length - 1) {
      state.studioIndex += 1;
      render("Decisió registrada. Passes a la pregunta següent.");
      return;
    }
    state.screen = "prediction";
    render("Les cinc decisions de l’estudi han quedat registrades.");
  }

  function backPrediction() {
    state.screen = "studio";
    state.studioIndex = Content.DIMENSIONS.length - 1;
    render("Pots revisar l’última decisió de l’estudi.");
  }

  function submitPrediction() {
    if (!Content.PREDICTIONS.some((item) => item.id === state.prediction)) {
      showFormError("Tria una predicció abans de continuar.");
      return;
    }
    state.screen = "creator";
    state.creatorIndex = 0;
    render("Ara decideixes amb el barret de creador.");
  }

  function backCreator() {
    if (state.creatorIndex === 0) state.screen = "prediction";
    else state.creatorIndex -= 1;
    render("Has tornat a la pantalla anterior.");
  }

  function submitCreator() {
    const dimension = Content.DIMENSIONS[state.creatorIndex];
    if (
      !Core.validAnswer(
        dimension.id,
        "creator",
        state.creatorAnswers[dimension.id],
      )
    ) {
      showFormError("Tria una opció abans de continuar.");
      return;
    }
    if (state.creatorIndex < Content.DIMENSIONS.length - 1) {
      state.creatorIndex += 1;
      render("Decisió registrada. Passes a la pregunta següent.");
      return;
    }
    state.screen = "mirror";
    state.mirrorReviewed = false;
    render("S’obre el mirall amb els cinc principis.");
  }

  function continueMirror() {
    state.mirrorReviewed = true;
    state.screen = "transfer";
    render("Ara aplicaràs els principis a un cas nou.");
  }

  function submitTransfer() {
    if (
      !Content.TRANSFER.choices.some((item) => item.id === state.transferChoice)
    ) {
      showFormError("Tria una primera decisió abans d’examinar-la.");
      return;
    }
    state.transferReviewed = false;
    state.screen = "transfer-feedback";
    render("Ara pots veure què protegeix i què deixa pendent la decisió.");
  }

  function backTransferFeedback() {
    state.screen = "transfer";
    render("Pots canviar la decisió del cas nou.");
  }

  function continueFeedback() {
    state.transferReviewed = true;
    state.screen = "commitment";
    render("Tria un estàndard mínim reutilitzable.");
  }

  function submitCommitment() {
    if (
      !Content.COMMITMENT_STANDARDS.some(
        (item) => item.id === state.commitment.standard,
      )
    ) {
      showFormError("Tria un estàndard mínim abans de completar.");
      return;
    }
    if (!Core.canComplete(state)) {
      showFormError(
        "Encara falta revisar el mirall o el cas de transferència.",
      );
      return;
    }
    state.completed = true;
    state.completionSignalled = false;
    state.screen = "complete";
    render("Activitat completada. Ja tens un principi reutilitzable.");
  }

  function openRestartDialog() {
    if (typeof restartDialog.showModal === "function") {
      restartDialog.showModal();
    } else if (
      window.confirm(
        "S’esborraran les decisions d’aquesta pestanya. Vols continuar?",
      )
    ) {
      resetActivity();
    }
  }

  function resetActivity() {
    clearState();
    state = Core.createInitialState(createAttemptId());
    wasRestored = false;
    restoreNoticePending = false;
    lastProgressSignature = "";
    lastResizeHeight = 0;
    render("Activitat reiniciada.", true);
  }

  async function copySummary() {
    const text = commitmentSummary();
    try {
      await navigator.clipboard.writeText(text);
      announce("Resum copiat al porta-retalls.");
      return;
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.className = "screen-reader-only";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      announce(
        copied
          ? "Resum copiat al porta-retalls."
          : "No s’ha pogut copiar. Pots seleccionar el resum manualment.",
      );
    }
  }

  function handleRadioChange(target) {
    const dimension =
      state.screen === "studio"
        ? Content.DIMENSIONS[state.studioIndex]
        : state.screen === "creator"
          ? Content.DIMENSIONS[state.creatorIndex]
          : null;

    switch (target.name) {
      case "studio-answer":
        if (dimension) state.studioAnswers[dimension.id] = target.value;
        break;
      case "creator-answer":
        if (dimension) state.creatorAnswers[dimension.id] = target.value;
        break;
      case "prediction":
        state.prediction = target.value;
        break;
      case "transfer-choice":
        state.transferChoice = target.value;
        state.transferReviewed = false;
        break;
      case "commitment-standard":
        state.commitment.standard = target.value;
        break;
      default:
        return;
    }
    saveState();
  }

  app.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "radio") {
      handleRadioChange(target);
    }
  });

  app.addEventListener("toggle", scheduleResize, true);

  app.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const handlers = {
      "submit-studio": submitStudio,
      "submit-prediction": submitPrediction,
      "submit-creator": submitCreator,
      "submit-transfer": submitTransfer,
      "submit-commitment": submitCommitment,
    };
    handlers[form.dataset.form]?.();
  });

  app.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const actions = {
      begin,
      "back-studio": backStudio,
      "back-prediction": backPrediction,
      "back-creator": backCreator,
      "continue-mirror": continueMirror,
      "back-transfer-feedback": backTransferFeedback,
      "continue-feedback": continueFeedback,
      "copy-summary": copySummary,
      "print-summary": () => window.print(),
      "open-reset": openRestartDialog,
      "reset-now": resetActivity,
    };
    actions[button.dataset.action]?.();
  });

  restartButton.addEventListener("click", openRestartDialog);
  restartDialog.addEventListener("close", () => {
    if (restartDialog.returnValue === "confirm") resetActivity();
  });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(app);
  } else {
    window.addEventListener("resize", scheduleResize);
  }
  window.addEventListener("pageshow", scheduleResize);

  render(
    wasRestored
      ? "S’ha recuperat el progrés de l’activitat."
      : "Activitat preparada.",
    false,
  );
})();
