(() => {
  "use strict";

  const ITEM_BANK = JSON.parse(/*__ITEMS_JSON__*/);
  const CONTENT = JSON.parse(/*__CONTENT_JSON__*/);

  const WIDGET_ID = "B5-domain-check";
  const WIDGET_VERSION = 2;
  const MESSAGE_SCHEMA_VERSION = 1;
  const STORAGE_KEY = "enti-b5-domain-check-v2";
  const CORE_ITEM_COUNT = 10;
  const VALID_STAGES = new Set([
    "intro",
    "familiarity",
    "practice",
    "practice-feedback",
    "core",
    "core-feedback",
    "transfer-intro",
    "transfer",
    "transfer-feedback",
    "reflection",
    "reflection-feedback",
    "results",
  ]);
  const OUTCOME_LABELS = {
    localized: "Error trobat i localitzat",
    missedError: "Error no detectat",
    wrongLocation: "Error detectat, frase equivocada",
    cleanAccepted: "Resposta neta acceptada",
    falseAlarm: "Falsa alarma",
  };
  const CONFIDENCE_LABELS = {
    low: "Baixa",
    medium: "Mitjana",
    high: "Alta",
  };
  const TRANSFER_LABELS = {
    supports: "L'evidència dona suport a l'afirmació",
    contradicts: "L'evidència contradiu l'afirmació",
    insufficient: "L'evidència no és suficient",
  };

  const stage = document.getElementById("stage");
  const activityStatus = document.getElementById("activity-status");
  const domainById = new Map(
    ITEM_BANK.domains.map((domain) => [domain.id, domain]),
  );
  const itemById = new Map(
    ITEM_BANK.domains.flatMap((domain) =>
      domain.items.map((item) => [item.id, { ...item, domainId: domain.id }]),
    ),
  );

  function defaultState() {
    return {
      version: WIDGET_VERSION,
      stage: "intro",
      seed: createSeed(),
      ratings: {},
      highDomainId: null,
      lowDomainId: null,
      itemOrder: [],
      coreIndex: 0,
      responses: [],
      practiceResponse: null,
      transferIndex: 0,
      transferResponses: [],
      reflectionHistory: [],
      milestones: {
        started: false,
        familiarity: false,
        practice: false,
        core: false,
        transfer: false,
        reflection: false,
      },
      completed: false,
      completionSent: false,
    };
  }

  function createSeed() {
    try {
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return values[0] || 1;
    } catch {
      return Date.now() >>> 0 || 1;
    }
  }

  function loadState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (
        !parsed ||
        typeof parsed !== "object" ||
        parsed.version !== WIDGET_VERSION
      ) {
        return defaultState();
      }

      const clean = { ...defaultState(), ...parsed };
      clean.stage = VALID_STAGES.has(parsed.stage) ? parsed.stage : "intro";
      clean.ratings =
        parsed.ratings && typeof parsed.ratings === "object"
          ? parsed.ratings
          : {};
      clean.ratings = Object.fromEntries(
        ITEM_BANK.domains
          .filter((domain) => {
            const value = Number(clean.ratings[domain.id]);
            return Number.isInteger(value) && value >= 1 && value <= 5;
          })
          .map((domain) => [domain.id, Number(clean.ratings[domain.id])]),
      );
      clean.itemOrder = Array.isArray(parsed.itemOrder)
        ? parsed.itemOrder.filter(
            (entry) =>
              entry &&
              itemById.has(entry.itemId) &&
              (entry.role === "high" || entry.role === "low"),
          )
        : [];
      clean.responses = Array.isArray(parsed.responses)
        ? parsed.responses.filter(
            (response) => response && itemById.has(response.itemId),
          )
        : [];
      clean.transferResponses = Array.isArray(parsed.transferResponses)
        ? parsed.transferResponses.slice(0, ITEM_BANK.transfers.length)
        : [];
      clean.reflectionHistory = Array.isArray(parsed.reflectionHistory)
        ? parsed.reflectionHistory
        : [];
      clean.milestones = {
        ...defaultState().milestones,
        ...(parsed.milestones || {}),
      };
      clean.coreIndex = Math.max(
        0,
        Math.min(Number(parsed.coreIndex) || 0, CORE_ITEM_COUNT - 1),
      );
      clean.transferIndex = Math.max(
        0,
        Math.min(
          Number(parsed.transferIndex) || 0,
          ITEM_BANK.transfers.length - 1,
        ),
      );

      if (
        !domainById.has(clean.highDomainId) ||
        !domainById.has(clean.lowDomainId) ||
        clean.highDomainId === clean.lowDomainId
      ) {
        clean.highDomainId = null;
        clean.lowDomainId = null;
        clean.itemOrder = [];
        if (!["intro", "familiarity"].includes(clean.stage)) {
          clean.stage = "familiarity";
        }
      }

      if (
        clean.itemOrder.length !== CORE_ITEM_COUNT &&
        clean.highDomainId &&
        clean.lowDomainId
      ) {
        clean.itemOrder = buildItemOrder(
          clean.highDomainId,
          clean.lowDomainId,
          clean.seed,
        );
      }

      const allRatingsPresent = ITEM_BANK.domains.every((domain) =>
        Number.isInteger(clean.ratings[domain.id]),
      );
      const ratingsDiffer = new Set(Object.values(clean.ratings)).size >= 2;
      const rankedRatings = ITEM_BANK.domains
        .map((domain, index) => ({
          id: domain.id,
          rating: clean.ratings[domain.id],
          index,
        }))
        .sort((a, b) => b.rating - a.rating || a.index - b.index);
      const reverseRankedRatings = [...rankedRatings].sort(
        (a, b) => a.rating - b.rating || b.index - a.index,
      );
      const expectedHighDomainId = rankedRatings[0]?.id;
      const expectedLowDomainId = reverseRankedRatings.find(
        (entry) => entry.id !== expectedHighDomainId,
      )?.id;
      const selectedDomainsMatchRatings =
        clean.highDomainId === expectedHighDomainId &&
        clean.lowDomainId === expectedLowDomainId;
      const validPracticeResponse =
        clean.practiceResponse &&
        [
          "localized",
          "missedError",
          "wrongLocation",
          "cleanAccepted",
          "falseAlarm",
        ].includes(clean.practiceResponse.outcome);
      const coreResponsesMatch =
        selectedDomainsMatchRatings &&
        clean.itemOrder.length === CORE_ITEM_COUNT &&
        clean.responses.length <= CORE_ITEM_COUNT &&
        clean.responses.every(
          (response, index) =>
            clean.itemOrder[index]?.itemId === response.itemId &&
            clean.itemOrder[index]?.role === response.role &&
            [
              "localized",
              "missedError",
              "wrongLocation",
              "cleanAccepted",
              "falseAlarm",
            ].includes(response.outcome),
        );
      const lastReflection =
        clean.reflectionHistory[clean.reflectionHistory.length - 1];

      const stageIsCoherent = {
        intro: true,
        familiarity: true,
        practice:
          allRatingsPresent &&
          ratingsDiffer &&
          selectedDomainsMatchRatings &&
          clean.itemOrder.length === CORE_ITEM_COUNT,
        "practice-feedback":
          allRatingsPresent &&
          ratingsDiffer &&
          selectedDomainsMatchRatings &&
          clean.itemOrder.length === CORE_ITEM_COUNT &&
          validPracticeResponse,
        core:
          validPracticeResponse &&
          clean.milestones.practice &&
          coreResponsesMatch &&
          clean.responses.length === clean.coreIndex,
        "core-feedback":
          validPracticeResponse &&
          clean.milestones.practice &&
          coreResponsesMatch &&
          clean.responses.length === clean.coreIndex + 1,
        "transfer-intro":
          clean.milestones.core &&
          coreResponsesMatch &&
          clean.responses.length === CORE_ITEM_COUNT,
        transfer:
          clean.milestones.core &&
          coreResponsesMatch &&
          clean.responses.length === CORE_ITEM_COUNT &&
          clean.transferResponses.length === clean.transferIndex,
        "transfer-feedback":
          clean.milestones.core &&
          coreResponsesMatch &&
          clean.responses.length === CORE_ITEM_COUNT &&
          clean.transferResponses.length === clean.transferIndex + 1,
        reflection:
          clean.milestones.transfer &&
          clean.transferResponses.length === ITEM_BANK.transfers.length,
        "reflection-feedback":
          clean.milestones.transfer &&
          clean.transferResponses.length === ITEM_BANK.transfers.length &&
          Boolean(lastReflection),
        results:
          clean.milestones.reflection &&
          clean.responses.length === CORE_ITEM_COUNT &&
          clean.transferResponses.length === ITEM_BANK.transfers.length &&
          lastReflection?.correct === true,
      };

      if (!stageIsCoherent[clean.stage]) {
        return defaultState();
      }

      return clean;
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStatus(
        "No s'ha pogut guardar el progrés en aquesta pestanya. Pots continuar igualment.",
      );
    }
  }

  let state = loadState();

  function escapeHTML(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character],
    );
  }

  function setStatus(message) {
    activityStatus.textContent = "";
    window.requestAnimationFrame(() => {
      activityStatus.textContent = message;
    });
  }

  function focusStage(selector = "#stage-title") {
    const target = stage.querySelector(selector);
    if (!target) return;
    target.focus({ preventScroll: false });
  }

  function render(options = {}) {
    const { focus = false, announce = "" } = options;
    let markup;

    switch (state.stage) {
      case "familiarity":
        markup = renderFamiliarity();
        break;
      case "practice":
        markup = renderPractice();
        break;
      case "practice-feedback":
        markup = renderPracticeFeedback();
        break;
      case "core":
        markup = renderCore();
        break;
      case "core-feedback":
        markup = renderCoreFeedback();
        break;
      case "transfer-intro":
        markup = renderTransferIntro();
        break;
      case "transfer":
        markup = renderTransfer();
        break;
      case "transfer-feedback":
        markup = renderTransferFeedback();
        break;
      case "reflection":
        markup = renderReflection();
        break;
      case "reflection-feedback":
        markup = renderReflectionFeedback();
        break;
      case "results":
        markup = renderResults();
        break;
      default:
        markup = renderIntro();
    }

    stage.innerHTML = markup;

    if (state.stage === "results") {
      completeActivity();
    }
    if (focus) {
      focusStage();
    }
    if (announce) {
      setStatus(announce);
    }
    scheduleResize();
  }

  function renderIntro() {
    return `
      <section class="card" aria-labelledby="stage-title">
        <h2 class="stage-title" id="stage-title" tabindex="-1">${escapeHTML(CONTENT.intro.title)}</h2>
        <p class="lead">${escapeHTML(CONTENT.intro.body)}</p>
        <ul class="takeaway-list">
          <li>Tu decideixes quins àmbits coneixes més i menys.</li>
          <li>Primer jutges amb el que saps; després treballes amb evidència.</li>
          <li>El resultat descriu aquesta mostra, no et diagnostica.</li>
        </ul>
        <p class="duration">${escapeHTML(CONTENT.intro.duration)}</p>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="start" data-testid="start">
            ${escapeHTML(CONTENT.intro.start)}
          </button>
        </div>
      </section>
    `;
  }

  function ratingLabel(value) {
    if (value === 1) return "1 · Gens";
    if (value === 3) return "3 · Una mica";
    if (value === 5) return "5 · Molt";
    return String(value);
  }

  function renderFamiliarity() {
    const groups = ITEM_BANK.domains
      .map((domain) => {
        const options = [1, 2, 3, 4, 5]
          .map(
            (value) => `
              <label class="rating-option">
                <input
                  type="radio"
                  name="rating-${escapeHTML(domain.id)}"
                  value="${value}"
                  data-rating-domain="${escapeHTML(domain.id)}"
                  data-testid="rating-${escapeHTML(domain.id)}-${value}"
                  ${Number(state.ratings[domain.id]) === value ? "checked" : ""}
                />
                <span>${escapeHTML(ratingLabel(value))}</span>
              </label>
            `,
          )
          .join("");

        return `
          <fieldset class="rating-group" data-rating-group="${escapeHTML(domain.id)}">
            <legend>
              ${escapeHTML(domain.label)}
              <span class="domain-description">${escapeHTML(domain.description)}</span>
            </legend>
            <div class="rating-options">${options}</div>
            <div class="rating-scale" aria-hidden="true"><span>Menys familiar</span><span>Més familiar</span></div>
          </fieldset>
        `;
      })
      .join("");

    return `
      <section class="card" aria-labelledby="stage-title">
        <h2 class="stage-title" id="stage-title" tabindex="-1">Situa el teu punt de partida</h2>
        <p class="rating-intro">
          Valora la teva familiaritat actual. No és un examen ni un perfil: només serveix per
          triar dos bancs comparables. Cal que almenys dues valoracions siguin diferents.
        </p>
        <div class="rating-list">${groups}</div>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="save-familiarity" data-testid="save-familiarity">
            Continua amb una pràctica
          </button>
          <button class="button" type="button" data-action="back-intro">Enrere</button>
        </div>
      </section>
    `;
  }

  function renderPractice() {
    return renderJudgmentForm(ITEM_BANK.practice, {
      title: "Practica el control",
      tag: "Exemple sense puntuació",
      progress: null,
      submitAction: "submit-practice",
      submitTestId: "submit-practice",
    });
  }

  function renderCore() {
    const orderEntry = state.itemOrder[state.coreIndex];
    const item = itemById.get(orderEntry.itemId);
    const domain = domainById.get(item.domainId);
    const roleText =
      orderEntry.role === "high"
        ? `Valoració més alta: ${state.ratings[domain.id]} de 5`
        : `Valoració més baixa: ${state.ratings[domain.id]} de 5`;

    return renderJudgmentForm(item, {
      title: `Decisió ${state.coreIndex + 1} de ${CORE_ITEM_COUNT}`,
      tag: domain.shortLabel,
      roleText,
      progress: {
        value: state.coreIndex,
        max: CORE_ITEM_COUNT,
        label: `${state.coreIndex} de ${CORE_ITEM_COUNT} decisions completades`,
      },
      submitAction: "submit-core",
      submitTestId: "submit-core",
    });
  }

  function renderJudgmentForm(item, config) {
    const answerOptions = [
      `
        <label class="choice-card">
          <input type="radio" name="answer" value="clean" data-testid="answer-clean" />
          <span class="choice-copy">
            <span class="choice-number">Resposta completa</span>
            No hi ha cap error
          </span>
        </label>
      `,
      ...item.claims.map(
        (claim, index) => `
          <label class="choice-card">
            <input type="radio" name="answer" value="${index}" data-testid="answer-${index}" />
            <span class="choice-copy">
              <span class="choice-number">Frase ${index + 1}</span>
              ${escapeHTML(claim)}
            </span>
          </label>
        `,
      ),
    ].join("");

    const confidence = Object.entries(CONFIDENCE_LABELS)
      .map(
        ([value, label]) => `
          <label class="confidence-option">
            <input type="radio" name="confidence" value="${value}" data-testid="confidence-${value}" />
            <span>${escapeHTML(label)}</span>
          </label>
        `,
      )
      .join("");

    const progress = config.progress
      ? `
        <div class="progress-block">
          <div class="progress-label">
            <span>Progrés</span>
            <span>${escapeHTML(config.progress.label)}</span>
          </div>
          <progress max="${config.progress.max}" value="${config.progress.value}">
            ${escapeHTML(config.progress.label)}
          </progress>
        </div>
      `
      : "";

    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="stage-meta">
          <span class="pill ${config.progress ? "" : "pill-neutral"}">${escapeHTML(config.tag)}</span>
          ${config.roleText ? `<span class="domain-role">${escapeHTML(config.roleText)}</span>` : ""}
        </div>
        <h2 class="stage-title" id="stage-title" tabindex="-1">${escapeHTML(config.title)}</h2>
        ${progress}
        <div class="synthetic-output">
          <p class="section-label">Resposta sintètica</p>
          <p class="item-context">${escapeHTML(item.context)}</p>
          <ol>
            ${item.claims.map((claim) => `<li>${escapeHTML(claim)}</li>`).join("")}
          </ol>
        </div>
        <fieldset class="answer-fieldset">
          <legend>Quina és la teva decisió?</legend>
          <div class="choice-list">${answerOptions}</div>
        </fieldset>
        <fieldset class="confidence-fieldset">
          <legend>Quina confiança tens en la decisió?</legend>
          <div class="confidence-options">${confidence}</div>
        </fieldset>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row">
          <button
            class="button button-primary"
            type="button"
            data-action="${escapeHTML(config.submitAction)}"
            data-testid="${escapeHTML(config.submitTestId)}"
          >
            Comprova
          </button>
        </div>
      </section>
    `;
  }

  function renderPracticeFeedback() {
    return renderJudgmentFeedback(ITEM_BANK.practice, state.practiceResponse, {
      title: "Retorn de la pràctica",
      tag: "Exemple sense puntuació",
      nextAction: "begin-core",
      nextLabel: "Comença les decisions",
      nextTestId: "begin-core",
    });
  }

  function renderCoreFeedback() {
    const response = state.responses[state.responses.length - 1];
    const item = itemById.get(response.itemId);
    const domain = domainById.get(response.domainId);
    const isLast = state.coreIndex === CORE_ITEM_COUNT - 1;

    return renderJudgmentFeedback(item, response, {
      title: response.correct ? "Decisió revisada" : "Revisa què ha passat",
      tag: domain.shortLabel,
      nextAction: isLast ? "finish-core" : "next-core",
      nextLabel: isLast ? "Passa a verificar amb evidència" : "Decisió següent",
      nextTestId: isLast ? "finish-core" : "next-core",
    });
  }

  function renderJudgmentFeedback(item, response, config) {
    const selectedIndex =
      response.answer === "clean" ? null : Number(response.answer);
    const claimReview = item.claims
      .map((claim, index) => {
        const isError = item.errorIndex === index;
        const isLearner = selectedIndex === index;
        return `
          <li class="${isError ? "is-error" : ""} ${isLearner ? "is-learner" : ""}">
            <span class="choice-number">Frase ${index + 1}</span>
            ${escapeHTML(claim)}
            <span class="claim-markers">
              ${isError ? '<span class="answer-marker marker-error">Frase incorrecta</span>' : ""}
              ${isLearner ? '<span class="answer-marker marker-learner">La teva tria</span>' : ""}
            </span>
          </li>
        `;
      })
      .join("");

    const source = renderSource(item.source);
    const cleanMarker =
      response.answer === "clean"
        ? '<span class="answer-marker marker-learner">La teva tria: cap error</span>'
        : "";
    const correctAnswer =
      item.errorIndex === null
        ? "La resposta no contenia cap error."
        : `L'error era a la frase ${item.errorIndex + 1}.`;

    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="stage-meta"><span class="pill">${escapeHTML(config.tag)}</span></div>
        <div class="feedback-heading ${response.correct ? "feedback-correct" : "feedback-incorrect"}">
          <h2 class="stage-title" id="stage-title" tabindex="-1">${escapeHTML(config.title)}</h2>
          <span class="feedback-badge">${response.correct ? "Decisió correcta" : "Decisió a revisar"}</span>
        </div>
        <div class="feedback-panel ${response.correct ? "correct" : "incorrect"}">
          <p><strong>${escapeHTML(OUTCOME_LABELS[response.outcome])}.</strong> ${escapeHTML(correctAnswer)}</p>
          <p>${escapeHTML(item.explanation)}</p>
          ${cleanMarker}
        </div>
        <ol class="claim-review">${claimReview}</ol>
        <div class="verification-action">
          <strong>Com ho pots verificar?</strong>
          ${escapeHTML(item.verificationAction)}
        </div>
        ${source}
        <p class="confidence-label">Confiança declarada: ${escapeHTML(CONFIDENCE_LABELS[response.confidence])}</p>
        <div class="button-row">
          <button
            class="button button-primary"
            type="button"
            data-action="${escapeHTML(config.nextAction)}"
            data-testid="${escapeHTML(config.nextTestId)}"
          >
            ${escapeHTML(config.nextLabel)}
          </button>
        </div>
      </section>
    `;
  }

  function renderSource(source, visibleBeforeAnswer = false) {
    const label = visibleBeforeAnswer
      ? "Evidència disponible"
      : "Font de comprovació";
    const link = source.url
      ? `
        <a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">
          Obre la font original<span class="sr-only"> (s'obre en una pestanya nova)</span>
        </a>
      `
      : "<p>La regla estava definida dins de l'activitat.</p>";

    return `
      <aside class="source-card">
        <p class="source-kicker">${escapeHTML(label)}</p>
        <p><strong>${escapeHTML(source.publisher)}:</strong> ${escapeHTML(source.title)}</p>
        ${link}
      </aside>
    `;
  }

  function renderTransferIntro() {
    return `
      <section class="card" aria-labelledby="stage-title">
        <span class="pill">Canvi de mètode</span>
        <h2 class="stage-title" id="stage-title" tabindex="-1">Ara no cal que ja ho sàpigues</h2>
        <p class="lead">
          Detectar els límits del coneixement propi és només el primer pas. En les dues
          decisions següents tindràs evidència disponible i hauràs de decidir què permet
          concloure exactament.
        </p>
        <div class="verification-grid">
          <article class="plan-card">
            <h3>1 · Llegeix</h3>
            <p>Identifica què afirma realment l'evidència.</p>
          </article>
          <article class="plan-card">
            <h3>2 · Compara</h3>
            <p>Busca si dona suport o contradiu l'afirmació.</p>
          </article>
          <article class="plan-card">
            <h3>3 · Limita</h3>
            <p>Si no n'hi ha prou, no omplis el buit amb una suposició.</p>
          </article>
        </div>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="begin-transfer" data-testid="begin-transfer">
            Treballa amb evidència
          </button>
        </div>
      </section>
    `;
  }

  function renderTransfer() {
    const item = ITEM_BANK.transfers[state.transferIndex];
    const options = Object.entries(TRANSFER_LABELS)
      .map(
        ([value, label]) => `
          <label class="transfer-option">
            <input type="radio" name="transfer-answer" value="${value}" data-testid="transfer-${value}" />
            <span>${escapeHTML(label)}</span>
          </label>
        `,
      )
      .join("");

    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="stage-meta">
          <span class="pill">${escapeHTML(item.tag)}</span>
          <span class="domain-role">Cas ${state.transferIndex + 1} de ${ITEM_BANK.transfers.length}</span>
        </div>
        <h2 class="stage-title" id="stage-title" tabindex="-1">Què permet concloure la font?</h2>
        <div class="progress-block">
          <div class="progress-label">
            <span>Transferència</span>
            <span>${state.transferIndex} de ${ITEM_BANK.transfers.length} casos completats</span>
          </div>
          <progress max="${ITEM_BANK.transfers.length}" value="${state.transferIndex}">
            ${state.transferIndex} de ${ITEM_BANK.transfers.length}
          </progress>
        </div>
        <aside class="evidence-card">
          <p class="source-kicker">Resum de l'evidència</p>
          <p>${escapeHTML(item.sourceSummary)}</p>
          ${renderSource(
            {
              type: "authoritative",
              publisher: item.source.publisher,
              title: item.source.title,
              url: item.source.url,
              checkedAt: item.source.checkedAt,
            },
            true,
          )}
        </aside>
        <p class="transfer-claim"><strong>Afirmació:</strong> ${escapeHTML(item.claim)}</p>
        <fieldset class="transfer-fieldset">
          <legend>Tria la conclusió més rigorosa</legend>
          <div class="transfer-options">${options}</div>
        </fieldset>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="submit-transfer" data-testid="submit-transfer">
            Comprova la conclusió
          </button>
        </div>
      </section>
    `;
  }

  function renderTransferFeedback() {
    const item = ITEM_BANK.transfers[state.transferIndex];
    const response =
      state.transferResponses[state.transferResponses.length - 1];
    const isLast = state.transferIndex === ITEM_BANK.transfers.length - 1;

    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="feedback-heading ${response.correct ? "feedback-correct" : "feedback-incorrect"}">
          <h2 class="stage-title" id="stage-title" tabindex="-1">Conclusió revisada</h2>
          <span class="feedback-badge">${response.correct ? "Lectura rigorosa" : "Cal limitar la conclusió"}</span>
        </div>
        <div class="feedback-panel ${response.correct ? "correct" : "incorrect"}">
          <p><strong>Has triat:</strong> ${escapeHTML(TRANSFER_LABELS[response.answer])}.</p>
          <p><strong>La millor conclusió:</strong> ${escapeHTML(TRANSFER_LABELS[item.expected])}.</p>
          <p>${escapeHTML(item.explanation)}</p>
        </div>
        ${renderSource({
          type: "authoritative",
          publisher: item.source.publisher,
          title: item.source.title,
          url: item.source.url,
          checkedAt: item.source.checkedAt,
        })}
        <div class="button-row">
          <button
            class="button button-primary"
            type="button"
            data-action="${isLast ? "finish-transfer" : "next-transfer"}"
            data-testid="${isLast ? "finish-transfer" : "next-transfer"}"
          >
            ${isLast ? "Tanca amb una decisió pràctica" : "Cas següent"}
          </button>
        </div>
      </section>
    `;
  }

  function renderReflection() {
    const options = CONTENT.reflection.options
      .map(
        (option) => `
          <label class="reflection-option">
            <input type="radio" name="reflection-answer" value="${escapeHTML(option.id)}" data-testid="reflection-${escapeHTML(option.id)}" />
            <span>${escapeHTML(option.label)}</span>
          </label>
        `,
      )
      .join("");

    return `
      <section class="card" aria-labelledby="stage-title">
        <span class="pill pill-neutral">Transferència final</span>
        <h2 class="stage-title" id="stage-title" tabindex="-1">Què faràs quan no ho puguis verificar?</h2>
        <fieldset class="reflection-fieldset">
          <legend>${escapeHTML(CONTENT.reflection.question)}</legend>
          <div class="reflection-options">${options}</div>
        </fieldset>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="submit-reflection" data-testid="submit-reflection">
            Confirma l'estratègia
          </button>
        </div>
      </section>
    `;
  }

  function renderReflectionFeedback() {
    const last = state.reflectionHistory[state.reflectionHistory.length - 1];
    const option = CONTENT.reflection.options.find(
      (candidate) => candidate.id === last.answer,
    );

    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="feedback-heading ${last.correct ? "feedback-correct" : "feedback-incorrect"}">
          <h2 class="stage-title" id="stage-title" tabindex="-1">${last.correct ? "Estratègia adequada" : "Encara no és verificació"}</h2>
          <span class="feedback-badge">${last.correct ? "Transferència completada" : "Revisa la resposta"}</span>
        </div>
        <div class="feedback-panel ${last.correct ? "correct" : "incorrect"}">
          <p>${escapeHTML(option.feedback)}</p>
          ${
            last.correct
              ? "<p>El grau de verificació ha de créixer amb el risc: una dada trivial no demana el mateix que una decisió mèdica, legal o financera.</p>"
              : "<p>Pots tornar a triar. No compta com una penalització.</p>"
          }
        </div>
        <div class="button-row">
          <button
            class="button button-primary"
            type="button"
            data-action="${last.correct ? "show-results" : "retry-reflection"}"
            data-testid="${last.correct ? "show-results" : "retry-reflection"}"
          >
            ${last.correct ? "Veure el resum" : "Torna-ho a provar"}
          </button>
        </div>
      </section>
    `;
  }

  function renderResults() {
    const highDomain = domainById.get(state.highDomainId);
    const lowDomain = domainById.get(state.lowDomainId);
    const highResponses = state.responses.filter(
      (response) => response.role === "high",
    );
    const lowResponses = state.responses.filter(
      (response) => response.role === "low",
    );
    const highCorrect = highResponses.filter(
      (response) => response.correct,
    ).length;
    const lowCorrect = lowResponses.filter(
      (response) => response.correct,
    ).length;
    const interpretation =
      highCorrect > lowCorrect
        ? `En aquests ítems has pres més decisions correctes a ${highDomain.shortLabel} (${highCorrect} de 5) que a ${lowDomain.shortLabel} (${lowCorrect} de 5). És una observació d'aquesta mostra, no una mesura personal.`
        : lowCorrect > highCorrect
          ? `En aquests ítems t'ha anat millor a ${lowDomain.shortLabel} (${lowCorrect} de 5) que a ${highDomain.shortLabel} (${highCorrect} de 5). Una mostra tan petita pot dependre de cada pregunta; no contradiu la necessitat de verificar.`
          : `Has obtingut el mateix recompte als dos àmbits (${highCorrect} de 5). Aquesta mostra no mostra cap diferència i no pretén mesurar-te.`;

    const domainCards = [
      { domain: highDomain, responses: highResponses, correct: highCorrect },
      { domain: lowDomain, responses: lowResponses, correct: lowCorrect },
    ]
      .map(
        ({ domain, responses, correct }) => `
          <article class="result-card">
            <h3>${escapeHTML(domain.shortLabel)}</h3>
            <p class="result-score">${correct} de ${responses.length}</p>
            <p>Familiaritat declarada: ${state.ratings[domain.id]} de 5.</p>
          </article>
        `,
      )
      .join("");

    const outcomeCounts = Object.keys(OUTCOME_LABELS).reduce(
      (counts, outcome) => {
        counts[outcome] = state.responses.filter(
          (response) => response.outcome === outcome,
        ).length;
        return counts;
      },
      {},
    );
    const outcomeCards = Object.entries(OUTCOME_LABELS)
      .map(
        ([outcome, label]) => `
          <article class="metric-card">
            <p class="metric-label">${escapeHTML(label)}</p>
            <p class="metric-value">${outcomeCounts[outcome]}</p>
          </article>
        `,
      )
      .join("");

    const confidenceCards = Object.entries(CONFIDENCE_LABELS)
      .map(([confidence, label]) => {
        const responses = state.responses.filter(
          (response) => response.confidence === confidence,
        );
        const correct = responses.filter((response) => response.correct).length;
        return `
          <article class="metric-card">
            <p class="metric-label">Confiança ${escapeHTML(label.toLowerCase())}</p>
            <p class="metric-value">${correct} de ${responses.length}</p>
            <p>Decisions correctes dins d'aquest nivell declarat.</p>
          </article>
        `;
      })
      .join("");

    const missed = state.responses.filter((response) => !response.correct);
    const review =
      missed.length === 0
        ? '<p class="completion-note">No hi ha decisions incorrectes per revisar en aquesta mostra.</p>'
        : missed
            .map((response) => {
              const item = itemById.get(response.itemId);
              const domain = domainById.get(response.domainId);
              return `
                <details class="review-item">
                  <summary>${escapeHTML(domain.shortLabel)} · ${escapeHTML(OUTCOME_LABELS[response.outcome])}</summary>
                  <div class="review-body">
                    <p><strong>La teva resposta:</strong> ${escapeHTML(answerLabel(item, response.answer))}</p>
                    <p><strong>Resposta correcta:</strong> ${escapeHTML(correctAnswerLabel(item))}</p>
                    <p>${escapeHTML(item.explanation)}</p>
                    <p><strong>Acció de verificació:</strong> ${escapeHTML(item.verificationAction)}</p>
                    ${renderSource(item.source)}
                  </div>
                </details>
              `;
            })
            .join("");

    return `
      <section class="card" aria-labelledby="stage-title">
        <span class="pill">Activitat completada</span>
        <h2 class="stage-title" id="stage-title" tabindex="-1">El teu resum de verificació</h2>
        <p class="results-intro">${escapeHTML(interpretation)}</p>

        <h3>Els dos àmbits que has comparat</h3>
        <div class="domain-results">${domainCards}</div>

        <h3>Què ha passat en les deu decisions</h3>
        <div class="outcome-grid">${outcomeCards}</div>

        <h3>Confiança i encert</h3>
        <div class="confidence-grid">${confidenceCards}</div>

        <h3>Una pauta per endur-te</h3>
        <div class="verification-grid">
          <article class="plan-card">
            <h3>Ho puc comprovar</h3>
            <p>Calcula, contrasta definicions o revisa l'evidència que ja controles.</p>
          </article>
          <article class="plan-card">
            <h3>Necessito una font</h3>
            <p>Busca una font independent, autoritzada i prou específica per a l'afirmació.</p>
          </article>
          <article class="plan-card">
            <h3>Necessito una persona experta</h3>
            <p>Escala la revisió quan el risc o la complexitat superen el que una font ràpida resol.</p>
          </article>
        </div>

        <section class="review-section" aria-labelledby="review-title">
          <h3 id="review-title">Revisa les decisions que no han coincidit amb l'evidència</h3>
          ${review}
        </section>

        <p class="completion-note" id="completion-note">
          Has completat els judicis, la verificació amb evidència i la transferència final.
          Moodle rep només l'avís de finalització, si el curs té el receptor configurat.
        </p>
        <div class="button-row">
          <button class="button button-danger" type="button" data-action="restart" data-testid="restart">
            Torna a començar
          </button>
        </div>
      </section>
    `;
  }

  function showFormError(message, focusSelector) {
    const error = document.getElementById("form-error");
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    setStatus(message);
    const target = focusSelector ? stage.querySelector(focusSelector) : null;
    target?.focus();
  }

  function classify(item, answer) {
    if (item.errorIndex === null && answer === "clean") {
      return "cleanAccepted";
    }
    if (item.errorIndex === null) {
      return "falseAlarm";
    }
    if (answer === "clean") {
      return "missedError";
    }
    if (Number(answer) === item.errorIndex) {
      return "localized";
    }
    return "wrongLocation";
  }

  function makeResponse(item, answer, confidence, extra = {}) {
    const outcome = classify(item, answer);
    return {
      itemId: item.id,
      domainId: item.domainId || "practice",
      answer,
      confidence,
      outcome,
      correct: outcome === "localized" || outcome === "cleanAccepted",
      ...extra,
    };
  }

  function readJudgmentForm() {
    const answer = stage.querySelector('input[name="answer"]:checked');
    const confidence = stage.querySelector('input[name="confidence"]:checked');
    if (!answer) {
      showFormError(
        "Tria «No hi ha cap error» o una de les tres frases.",
        'input[name="answer"]',
      );
      return null;
    }
    if (!confidence) {
      showFormError(
        "Indica quina confiança tens en la decisió.",
        'input[name="confidence"]',
      );
      return null;
    }
    return { answer: answer.value, confidence: confidence.value };
  }

  function handleSaveFamiliarity() {
    const missing = ITEM_BANK.domains.find(
      (domain) => !Number(state.ratings[domain.id]),
    );
    if (missing) {
      showFormError(
        `Valora també l'àmbit «${missing.label}».`,
        `input[name="rating-${missing.id}"]`,
      );
      return;
    }

    const values = ITEM_BANK.domains.map((domain) =>
      Number(state.ratings[domain.id]),
    );
    if (new Set(values).size === 1) {
      showFormError(
        "Per comparar dos punts de partida, indica almenys una diferència entre els àmbits.",
        "input[data-rating-domain]",
      );
      return;
    }

    const ranked = ITEM_BANK.domains
      .map((domain, index) => ({
        id: domain.id,
        rating: Number(state.ratings[domain.id]),
        index,
      }))
      .sort((a, b) => b.rating - a.rating || a.index - b.index);
    const reverseRanked = [...ranked].sort(
      (a, b) => a.rating - b.rating || b.index - a.index,
    );

    state.highDomainId = ranked[0].id;
    state.lowDomainId = reverseRanked.find(
      (entry) => entry.id !== state.highDomainId,
    ).id;
    state.itemOrder = buildItemOrder(
      state.highDomainId,
      state.lowDomainId,
      state.seed,
    );
    state.milestones.familiarity = true;
    state.stage = "practice";
    saveState();
    render({
      focus: true,
      announce: "Familiaritat registrada. Comença l'exemple de pràctica.",
    });
  }

  function handleSubmitPractice() {
    const form = readJudgmentForm();
    if (!form) return;
    state.practiceResponse = makeResponse(
      { ...ITEM_BANK.practice, domainId: "practice" },
      form.answer,
      form.confidence,
    );
    state.stage = "practice-feedback";
    saveState();
    render({
      focus: true,
      announce: state.practiceResponse.correct
        ? "Decisió de pràctica correcta. S'ha mostrat l'explicació."
        : "Decisió de pràctica a revisar. S'ha mostrat l'explicació.",
    });
  }

  function handleSubmitCore() {
    const form = readJudgmentForm();
    if (!form) return;
    const orderEntry = state.itemOrder[state.coreIndex];
    const item = itemById.get(orderEntry.itemId);
    const response = makeResponse(item, form.answer, form.confidence, {
      role: orderEntry.role,
    });
    state.responses.push(response);
    state.stage = "core-feedback";
    saveState();
    render({
      focus: true,
      announce: response.correct
        ? "Decisió correcta. S'ha mostrat l'evidència."
        : "Decisió a revisar. S'ha mostrat l'evidència.",
    });
  }

  function handleSubmitTransfer() {
    const selected = stage.querySelector(
      'input[name="transfer-answer"]:checked',
    );
    if (!selected) {
      showFormError(
        "Tria què permet concloure l'evidència.",
        'input[name="transfer-answer"]',
      );
      return;
    }
    const item = ITEM_BANK.transfers[state.transferIndex];
    const response = {
      itemId: item.id,
      answer: selected.value,
      correct: selected.value === item.expected,
    };
    state.transferResponses.push(response);
    state.stage = "transfer-feedback";
    saveState();
    render({
      focus: true,
      announce: response.correct
        ? "Conclusió correcta."
        : "Conclusió a revisar.",
    });
  }

  function handleSubmitReflection() {
    const selected = stage.querySelector(
      'input[name="reflection-answer"]:checked',
    );
    if (!selected) {
      showFormError(
        "Tria una estratègia abans de continuar.",
        'input[name="reflection-answer"]',
      );
      return;
    }
    const option = CONTENT.reflection.options.find(
      (candidate) => candidate.id === selected.value,
    );
    state.reflectionHistory.push({
      answer: selected.value,
      correct: Boolean(option.correct),
    });
    state.stage = "reflection-feedback";
    saveState();
    render({
      focus: true,
      announce: option.correct
        ? "Estratègia de verificació adequada."
        : "Aquesta estratègia encara no verifica la resposta.",
    });
  }

  function answerLabel(item, answer) {
    return answer === "clean"
      ? "No hi ha cap error"
      : `Frase ${Number(answer) + 1}: ${item.claims[Number(answer)]}`;
  }

  function correctAnswerLabel(item) {
    return item.errorIndex === null
      ? "No hi ha cap error"
      : `Frase ${item.errorIndex + 1}: ${item.claims[item.errorIndex]}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(items, seed) {
    const result = [...items];
    const random = mulberry32(seed);
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function buildItemOrder(highDomainId, lowDomainId, seed) {
    const highItems = shuffled(
      domainById.get(highDomainId).items,
      seed ^ hashString(highDomainId),
    );
    const lowItems = shuffled(
      domainById.get(lowDomainId).items,
      seed ^ hashString(lowDomainId),
    );
    const highFirst = (seed & 1) === 0;
    const order = [];
    for (let index = 0; index < 5; index += 1) {
      const pair = highFirst
        ? [
            { itemId: highItems[index].id, role: "high" },
            { itemId: lowItems[index].id, role: "low" },
          ]
        : [
            { itemId: lowItems[index].id, role: "low" },
            { itemId: highItems[index].id, role: "high" },
          ];
      order.push(...pair);
    }
    return order;
  }

  function validParentOrigin() {
    const configured = new URLSearchParams(window.location.search).get(
      "parentOrigin",
    );
    const candidates = [configured, document.referrer];

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const url = new URL(candidate, window.location.href);
        if (url.protocol === "https:" || url.protocol === "http:") {
          return url.origin;
        }
      } catch {
        // Ignore malformed origins.
      }
    }
    return null;
  }

  function completionPayload() {
    return {
      type: "enti-widget-complete",
      schemaVersion: MESSAGE_SCHEMA_VERSION,
      widget: WIDGET_ID,
      version: WIDGET_VERSION,
      outcome: {
        completed: true,
        milestones: Object.keys(state.milestones).filter(
          (key) => state.milestones[key],
        ),
        coreItemsAnswered: state.responses.length,
        transferItemsAnswered: state.transferResponses.length,
        reflectionCompleted: state.milestones.reflection,
      },
    };
  }

  function completeActivity() {
    if (!state.completed) {
      state.completed = true;
    }
    if (state.completionSent) {
      saveState();
      return;
    }

    const payload = completionPayload();
    document.dispatchEvent(
      new CustomEvent("enti-widget-complete", { detail: payload }),
    );

    const parentOrigin = validParentOrigin();
    if (window.parent && window.parent !== window && parentOrigin) {
      window.parent.postMessage(payload, parentOrigin);
    }
    state.completionSent = true;
    saveState();
    setStatus("Activitat completada.");
  }

  let resizeTimer = null;
  function scheduleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const parentOrigin = validParentOrigin();
      if (!parentOrigin || window.parent === window) return;
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage(
        {
          type: "enti-widget-resize",
          schemaVersion: MESSAGE_SCHEMA_VERSION,
          widget: WIDGET_ID,
          version: WIDGET_VERSION,
          height,
        },
        parentOrigin,
      );
    }, 80);
  }

  stage.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-rating-domain]");
    if (!input) return;
    state.ratings[input.dataset.ratingDomain] = Number(input.value);
    saveState();
    const error = document.getElementById("form-error");
    if (error) error.hidden = true;
  });

  stage.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    switch (button.dataset.action) {
      case "start":
        state.milestones.started = true;
        state.stage = "familiarity";
        saveState();
        render({
          focus: true,
          announce: "Valora la familiaritat dels àmbits.",
        });
        break;
      case "back-intro":
        state.stage = "intro";
        saveState();
        render({ focus: true });
        break;
      case "save-familiarity":
        handleSaveFamiliarity();
        break;
      case "submit-practice":
        handleSubmitPractice();
        break;
      case "begin-core":
        state.milestones.practice = true;
        state.stage = "core";
        state.coreIndex = 0;
        saveState();
        render({ focus: true, announce: "Comença la primera decisió." });
        break;
      case "submit-core":
        handleSubmitCore();
        break;
      case "next-core":
        state.coreIndex += 1;
        state.stage = "core";
        saveState();
        render({
          focus: true,
          announce: `Decisió ${state.coreIndex + 1} de ${CORE_ITEM_COUNT}.`,
        });
        break;
      case "finish-core":
        state.milestones.core = true;
        state.stage = "transfer-intro";
        saveState();
        render({
          focus: true,
          announce: "Judicis completats. Ara treballaràs amb evidència.",
        });
        break;
      case "begin-transfer":
        state.stage = "transfer";
        state.transferIndex = 0;
        saveState();
        render({ focus: true, announce: "Primer cas amb evidència." });
        break;
      case "submit-transfer":
        handleSubmitTransfer();
        break;
      case "next-transfer":
        state.transferIndex += 1;
        state.stage = "transfer";
        saveState();
        render({
          focus: true,
          announce: `Cas ${state.transferIndex + 1} de ${ITEM_BANK.transfers.length}.`,
        });
        break;
      case "finish-transfer":
        state.milestones.transfer = true;
        state.stage = "reflection";
        saveState();
        render({ focus: true, announce: "Transferència final." });
        break;
      case "submit-reflection":
        handleSubmitReflection();
        break;
      case "retry-reflection":
        state.stage = "reflection";
        saveState();
        render({ focus: true, announce: "Torna a triar una estratègia." });
        break;
      case "show-results":
        state.milestones.reflection = true;
        state.stage = "results";
        saveState();
        render({ focus: true, announce: "Activitat completada." });
        break;
      case "restart":
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // State is still reset in memory.
        }
        state = defaultState();
        render({ focus: true, announce: "Activitat reiniciada." });
        break;
      default:
        break;
    }
  });

  window.addEventListener("message", (event) => {
    const parentOrigin = validParentOrigin();
    if (!parentOrigin || event.origin !== parentOrigin) return;
    if (
      event.data?.type === "enti-widget-complete-ack" &&
      event.data?.widget === WIDGET_ID
    ) {
      setStatus("El curs ha confirmat la finalització de l'activitat.");
    }
  });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(document.documentElement);
  } else {
    window.addEventListener("resize", scheduleResize);
  }

  document.getElementById("widget-eyebrow").textContent =
    CONTENT.widget.eyebrow;
  document.getElementById("widget-title").textContent = CONTENT.widget.title;
  document.getElementById("widget-subtitle").textContent =
    CONTENT.widget.subtitle;
  document.getElementById("privacy-copy").textContent = CONTENT.widget.privacy;
  document.getElementById("widget-footer").textContent = CONTENT.widget.footer;

  render({ focus: false });
})();
