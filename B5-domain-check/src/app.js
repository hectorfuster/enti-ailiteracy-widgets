(() => {
  "use strict";

  const ITEM_BANK = JSON.parse(/*__ITEMS_JSON__*/);
  const CONTENT = JSON.parse(/*__CONTENT_JSON__*/);

  const WIDGET_ID = "B5-domain-check";
  const WIDGET_VERSION = 3;
  const MESSAGE_SCHEMA_VERSION = 1;
  const STORAGE_KEY = "enti-b5-domain-check-v3";
  const ITEMS_PER_DOMAIN = 3;
  const CORE_ITEM_COUNT = ITEMS_PER_DOMAIN * 2;
  const TRANSFER_ITEM_COUNT = 1;
  const VALID_STAGES = new Set([
    "intro",
    "familiarity",
    "practice",
    "practice-feedback",
    "core",
    "core-feedback",
    "transfer",
    "transfer-feedback",
    "results",
  ]);
  const VALID_OUTCOMES = new Set([
    "localized",
    "missedError",
    "wrongLocation",
    "cleanAccepted",
    "falseAlarm",
  ]);
  const OUTCOME_LABELS = {
    localized: "Has localitzat l'error.",
    missedError: "Hi havia un error.",
    wrongLocation: "L'error era en una altra frase.",
    cleanAccepted: "La resposta era correcta.",
    falseAlarm: "La resposta no contenia cap error.",
  };
  const TRANSFER_LABELS = {
    supports: "La font hi dona suport",
    contradicts: "La font ho contradiu",
    insufficient: "La font no permet decidir-ho",
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

  function createSeed() {
    try {
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return values[0] || 1;
    } catch {
      return Date.now() >>> 0 || 1;
    }
  }

  function defaultState() {
    return {
      version: WIDGET_VERSION,
      stage: "intro",
      seed: createSeed(),
      highDomainId: null,
      lowDomainId: null,
      itemOrder: [],
      coreIndex: 0,
      responses: [],
      practiceResponse: null,
      transferResponses: [],
      milestones: {
        started: false,
        familiarity: false,
        practice: false,
        core: false,
        transfer: false,
      },
      completed: false,
      completionSent: false,
    };
  }

  function validResponse(response) {
    return (
      response &&
      itemById.has(response.itemId) &&
      VALID_OUTCOMES.has(response.outcome) &&
      (response.role === "high" || response.role === "low")
    );
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
      clean.milestones = {
        ...defaultState().milestones,
        ...(parsed.milestones || {}),
      };
      clean.responses = Array.isArray(parsed.responses)
        ? parsed.responses.filter(validResponse).slice(0, CORE_ITEM_COUNT)
        : [];
      clean.transferResponses = Array.isArray(parsed.transferResponses)
        ? parsed.transferResponses.slice(0, TRANSFER_ITEM_COUNT)
        : [];
      clean.practiceResponse =
        parsed.practiceResponse &&
        VALID_OUTCOMES.has(parsed.practiceResponse.outcome)
          ? parsed.practiceResponse
          : null;
      clean.coreIndex = Math.max(
        0,
        Math.min(Number(parsed.coreIndex) || 0, CORE_ITEM_COUNT - 1),
      );

      const validDomains =
        domainById.has(clean.highDomainId) &&
        domainById.has(clean.lowDomainId) &&
        clean.highDomainId !== clean.lowDomainId;
      if (!validDomains) {
        clean.highDomainId = null;
        clean.lowDomainId = null;
        clean.itemOrder = [];
        if (!["intro", "familiarity"].includes(clean.stage)) {
          clean.stage = "familiarity";
        }
      } else {
        clean.itemOrder = buildItemOrder(
          clean.highDomainId,
          clean.lowDomainId,
          clean.seed,
        );
      }

      const responsesMatch =
        clean.itemOrder.length === CORE_ITEM_COUNT &&
        clean.responses.every(
          (response, index) =>
            response.itemId === clean.itemOrder[index]?.itemId &&
            response.role === clean.itemOrder[index]?.role,
        );
      const comparisonReady =
        validDomains && clean.itemOrder.length === CORE_ITEM_COUNT;
      const stageIsCoherent = {
        intro: true,
        familiarity: true,
        practice: comparisonReady,
        "practice-feedback": comparisonReady && Boolean(clean.practiceResponse),
        core:
          comparisonReady &&
          clean.milestones.practice &&
          responsesMatch &&
          clean.responses.length === clean.coreIndex,
        "core-feedback":
          comparisonReady &&
          clean.milestones.practice &&
          responsesMatch &&
          clean.responses.length === clean.coreIndex + 1,
        transfer:
          clean.milestones.core &&
          responsesMatch &&
          clean.responses.length === CORE_ITEM_COUNT &&
          clean.transferResponses.length === 0,
        "transfer-feedback":
          clean.milestones.core &&
          responsesMatch &&
          clean.responses.length === CORE_ITEM_COUNT &&
          clean.transferResponses.length === TRANSFER_ITEM_COUNT,
        results:
          clean.milestones.transfer &&
          clean.responses.length === CORE_ITEM_COUNT &&
          clean.transferResponses.length === TRANSFER_ITEM_COUNT,
      };

      return stageIsCoherent[clean.stage] ? clean : defaultState();
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
    stage.querySelector(selector)?.focus({ preventScroll: false });
  }

  function render(options = {}) {
    const { focus = false, announce = "" } = options;
    const screens = {
      intro: renderIntro,
      familiarity: renderFamiliarity,
      practice: renderPractice,
      "practice-feedback": renderPracticeFeedback,
      core: renderCore,
      "core-feedback": renderCoreFeedback,
      transfer: renderTransfer,
      "transfer-feedback": renderTransferFeedback,
      results: renderResults,
    };
    stage.innerHTML = (screens[state.stage] || renderIntro)();

    if (state.stage === "results") completeActivity();
    if (focus) focusStage();
    if (announce) setStatus(announce);
    scheduleResize();
  }

  function renderIntro() {
    return `
      <section class="card card-compact" aria-labelledby="stage-title">
        <h2 class="stage-title" id="stage-title" tabindex="-1">${escapeHTML(CONTENT.intro.title)}</h2>
        <p class="lead">${escapeHTML(CONTENT.intro.body)}</p>
        <p class="duration">${escapeHTML(CONTENT.intro.duration)}</p>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="start" data-testid="start">
            ${escapeHTML(CONTENT.intro.start)}
          </button>
        </div>
      </section>
    `;
  }

  function domainOptions(selectedId) {
    return [
      '<option value="">Tria un àmbit</option>',
      ...ITEM_BANK.domains.map(
        (domain) => `
          <option value="${escapeHTML(domain.id)}" ${selectedId === domain.id ? "selected" : ""}>
            ${escapeHTML(domain.label)}
          </option>
        `,
      ),
    ].join("");
  }

  function renderFamiliarity() {
    return `
      <section class="card card-compact" aria-labelledby="stage-title">
        <h2 class="stage-title" id="stage-title" tabindex="-1">Tria els dos àmbits</h2>
        <p class="lead">
          Un que coneguis més i un que coneguis menys. Tu poses el punt de partida;
          l'activitat no et crea cap perfil.
        </p>
        <div class="domain-pickers">
          <label class="select-field" for="high-domain">
            <span>En conec més</span>
            <select id="high-domain" data-testid="high-domain">
              ${domainOptions(state.highDomainId)}
            </select>
          </label>
          <label class="select-field" for="low-domain">
            <span>En conec menys</span>
            <select id="low-domain" data-testid="low-domain">
              ${domainOptions(state.lowDomainId)}
            </select>
          </label>
        </div>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="save-familiarity" data-testid="save-familiarity">
            Continua
          </button>
          <button class="button button-quiet" type="button" data-action="back-intro">Enrere</button>
        </div>
      </section>
    `;
  }

  function renderPractice() {
    return renderJudgmentForm(ITEM_BANK.practice, {
      title: "Prova-ho una vegada",
      tag: "Exemple",
      submitAction: "submit-practice",
      submitTestId: "submit-practice",
    });
  }

  function renderCore() {
    const orderEntry = state.itemOrder[state.coreIndex];
    const item = itemById.get(orderEntry.itemId);
    const domain = domainById.get(item.domainId);
    return renderJudgmentForm(item, {
      title: `Resposta ${state.coreIndex + 1} de ${CORE_ITEM_COUNT}`,
      tag: domain.shortLabel,
      progress: {
        value: state.coreIndex,
        max: CORE_ITEM_COUNT,
      },
      submitAction: "submit-core",
      submitTestId: "submit-core",
    });
  }

  function renderJudgmentForm(item, config) {
    const claims = item.claims
      .map(
        (claim, index) => `
          <label class="claim-line">
            <input type="radio" name="answer" value="${index}" data-testid="answer-${index}" />
            <span class="claim-number" aria-hidden="true">${index + 1}</span>
            <span>${escapeHTML(claim)}</span>
          </label>
        `,
      )
      .join("");
    const progress = config.progress
      ? `
        <div class="progress-line">
          <progress max="${config.progress.max}" value="${config.progress.value}">
            ${config.progress.value} de ${config.progress.max}
          </progress>
        </div>
      `
      : "";

    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="stage-meta">
          <span class="pill">${escapeHTML(config.tag)}</span>
          ${progress}
        </div>
        <h2 class="stage-title" id="stage-title" tabindex="-1">${escapeHTML(config.title)}</h2>
        <fieldset class="judgment-fieldset">
          <legend>Marca la frase falsa, si n'hi ha una</legend>
          <div class="synthetic-output">
            <p class="output-label">Sortida sintètica</p>
            <p class="item-context">${escapeHTML(item.context)}</p>
            <div class="claim-lines">${claims}</div>
            <label class="clean-option">
              <input type="radio" name="answer" value="clean" data-testid="answer-clean" />
              <span>No hi ha cap error</span>
            </label>
          </div>
        </fieldset>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row button-row-end">
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
      tag: "Exemple",
      nextAction: "begin-core",
      nextLabel: "Comença",
      nextTestId: "begin-core",
    });
  }

  function renderCoreFeedback() {
    const response = state.responses[state.responses.length - 1];
    const item = itemById.get(response.itemId);
    const domain = domainById.get(response.domainId);
    const isLast = state.coreIndex === CORE_ITEM_COUNT - 1;
    return renderJudgmentFeedback(item, response, {
      tag: domain.shortLabel,
      nextAction: isLast ? "finish-core" : "next-core",
      nextLabel: isLast ? "Comprova amb una font" : "Següent",
      nextTestId: isLast ? "finish-core" : "next-core",
    });
  }

  function renderReviewedOutput(item, response) {
    const selectedIndex =
      response.answer === "clean" ? null : Number(response.answer);
    const claims = item.claims
      .map((claim, index) => {
        const isError = item.errorIndex === index;
        const isSelected = selectedIndex === index;
        let note = "";
        if (isError && isSelected) note = "La teva tria · aquí era l'error";
        else if (isError) note = "Aquí era l'error";
        else if (isSelected) note = "La teva tria";
        return `
          <div class="claim-line claim-review-line ${isError ? "is-error" : ""} ${isSelected ? "is-selected" : ""}">
            <span class="claim-number" aria-hidden="true">${index + 1}</span>
            <span>
              ${escapeHTML(claim)}
              ${note ? `<span class="claim-note">${escapeHTML(note)}</span>` : ""}
            </span>
          </div>
        `;
      })
      .join("");
    const cleanState =
      item.errorIndex === null && response.answer === "clean"
        ? "La teva tria · resposta correcta"
        : item.errorIndex === null
          ? "No hi havia cap error"
          : response.answer === "clean"
            ? "La teva tria"
            : "";

    return `
      <div class="synthetic-output reviewed-output">
        <p class="output-label">Sortida sintètica</p>
        <p class="item-context">${escapeHTML(item.context)}</p>
        <div class="claim-lines">${claims}</div>
        ${
          cleanState
            ? `<div class="clean-review ${item.errorIndex === null ? "is-correct" : "is-selected"}">
                No hi ha cap error
                <span class="claim-note">${escapeHTML(cleanState)}</span>
              </div>`
            : ""
        }
      </div>
    `;
  }

  function compactSource(source) {
    if (!source.url) {
      return "<span>regla definida dins de l’activitat</span>";
    }
    return `
      <a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHTML(source.publisher)}<span class="sr-only"> (s'obre en una pestanya nova)</span>
      </a>
    `;
  }

  function renderJudgmentFeedback(item, response, config) {
    const heading = response.correct ? "Ben vist" : "Revisa-ho";
    return `
      <section class="card" aria-labelledby="stage-title">
        <div class="stage-meta"><span class="pill">${escapeHTML(config.tag)}</span></div>
        <h2 class="stage-title ${response.correct ? "text-correct" : "text-incorrect"}" id="stage-title" tabindex="-1">
          ${heading}
        </h2>
        ${renderReviewedOutput(item, response)}
        <div class="correction-strip ${response.correct ? "correct" : "incorrect"}">
          <p><strong>${escapeHTML(OUTCOME_LABELS[response.outcome])}</strong> ${escapeHTML(item.explanation)}</p>
        </div>
        <p class="verify-line">
          <strong>Per comprovar-ho:</strong> ${escapeHTML(item.verificationAction)}
          <span aria-hidden="true">·</span> ${compactSource(item.source)}
        </p>
        <div class="button-row button-row-end">
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

  function renderTransfer() {
    const item = ITEM_BANK.transfers[0];
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
      <section class="card card-compact" aria-labelledby="stage-title">
        <span class="pill">Amb evidència</span>
        <h2 class="stage-title" id="stage-title" tabindex="-1">Ara no cal endevinar</h2>
        <div class="evidence-card">
          <p class="output-label">La font diu</p>
          <p>${escapeHTML(item.sourceSummary)}</p>
          <p class="evidence-source">${compactSource(item.source)}</p>
        </div>
        <p class="transfer-claim"><strong>Afirmació:</strong> ${escapeHTML(item.claim)}</p>
        <fieldset class="transfer-fieldset">
          <legend>Què permet concloure la font?</legend>
          <div class="transfer-options">${options}</div>
        </fieldset>
        <p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="button-row button-row-end">
          <button class="button button-primary" type="button" data-action="submit-transfer" data-testid="submit-transfer">
            Comprova
          </button>
        </div>
      </section>
    `;
  }

  function renderTransferFeedback() {
    const item = ITEM_BANK.transfers[0];
    const response = state.transferResponses[0];
    return `
      <section class="card card-compact" aria-labelledby="stage-title">
        <h2 class="stage-title ${response.correct ? "text-correct" : "text-incorrect"}" id="stage-title" tabindex="-1">
          ${response.correct ? "Exacte" : "Mira el límit de la font"}
        </h2>
        <div class="correction-strip ${response.correct ? "correct" : "incorrect"}">
          <p>
            <strong>${escapeHTML(TRANSFER_LABELS[item.expected])}.</strong>
            ${escapeHTML(item.explanation)}
          </p>
        </div>
        <p class="verify-line">${compactSource(item.source)}</p>
        <div class="button-row button-row-end">
          <button class="button button-primary" type="button" data-action="show-results" data-testid="show-results">
            Acaba
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
        ? `En aquesta mostra curta has detectat millor els errors a ${highDomain.shortLabel}.`
        : lowCorrect > highCorrect
          ? `En aquesta mostra curta t'ha anat millor a ${lowDomain.shortLabel}.`
          : "En aquesta mostra curta no hi ha hagut cap diferència entre els dos àmbits.";

    return `
      <section class="card card-compact" aria-labelledby="stage-title">
        <span class="pill">Fet</span>
        <h2 class="stage-title" id="stage-title" tabindex="-1">Queda't amb això</h2>
        <div class="simple-comparison" aria-label="Resultat per àmbit">
          <p>
            <span>${escapeHTML(highDomain.shortLabel)}</span>
            <strong>${highCorrect} de ${ITEMS_PER_DOMAIN}</strong>
          </p>
          <p>
            <span>${escapeHTML(lowDomain.shortLabel)}</span>
            <strong>${lowCorrect} de ${ITEMS_PER_DOMAIN}</strong>
          </p>
        </div>
        <p class="results-intro">
          ${escapeHTML(interpretation)} Són només tres preguntes per àmbit, no una
          mesura de la teva capacitat.
        </p>
        <div class="takeaway">
          <p class="output-label">Idea clau</p>
          <p>
            Si pots comprovar una resposta, comprova-la. Si no pots, busca una font
            independent o una persona experta adequada al risc.
          </p>
        </div>
        <p class="completion-note">
          Activitat completada. Moodle rep només l'avís de finalització, si el curs
          té el receptor configurat.
        </p>
        <div class="button-row">
          <button class="button button-quiet" type="button" data-action="restart" data-testid="restart">
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
    stage.querySelector(focusSelector)?.focus();
  }

  function classify(item, answer) {
    if (item.errorIndex === null && answer === "clean") return "cleanAccepted";
    if (item.errorIndex === null) return "falseAlarm";
    if (answer === "clean") return "missedError";
    if (Number(answer) === item.errorIndex) return "localized";
    return "wrongLocation";
  }

  function makeResponse(item, answer, extra = {}) {
    const outcome = classify(item, answer);
    return {
      itemId: item.id,
      domainId: item.domainId || "practice",
      answer,
      outcome,
      correct: outcome === "localized" || outcome === "cleanAccepted",
      ...extra,
    };
  }

  function readJudgmentForm() {
    const answer = stage.querySelector('input[name="answer"]:checked');
    if (!answer) {
      showFormError(
        "Marca una frase o tria «No hi ha cap error».",
        'input[name="answer"]',
      );
      return null;
    }
    return answer.value;
  }

  function handleSaveFamiliarity() {
    const highDomainId = document.getElementById("high-domain").value;
    const lowDomainId = document.getElementById("low-domain").value;
    if (!highDomainId || !lowDomainId) {
      showFormError(
        "Tria un àmbit a cada camp.",
        !highDomainId ? "#high-domain" : "#low-domain",
      );
      return;
    }
    if (highDomainId === lowDomainId) {
      showFormError("Tria dos àmbits diferents.", "#low-domain");
      return;
    }

    state.highDomainId = highDomainId;
    state.lowDomainId = lowDomainId;
    state.itemOrder = buildItemOrder(highDomainId, lowDomainId, state.seed);
    state.milestones.familiarity = true;
    state.stage = "practice";
    saveState();
    render({ focus: true, announce: "Àmbits triats. Prova el control." });
  }

  function handleSubmitPractice() {
    const answer = readJudgmentForm();
    if (answer === null) return;
    state.practiceResponse = makeResponse(
      { ...ITEM_BANK.practice, domainId: "practice" },
      answer,
    );
    state.stage = "practice-feedback";
    saveState();
    render({
      focus: true,
      announce: state.practiceResponse.correct
        ? "Resposta correcta."
        : "Resposta a revisar.",
    });
  }

  function handleSubmitCore() {
    const answer = readJudgmentForm();
    if (answer === null) return;
    const orderEntry = state.itemOrder[state.coreIndex];
    const item = itemById.get(orderEntry.itemId);
    const response = makeResponse(item, answer, { role: orderEntry.role });
    state.responses.push(response);
    state.stage = "core-feedback";
    saveState();
    render({
      focus: true,
      announce: response.correct ? "Resposta correcta." : "Resposta a revisar.",
    });
  }

  function handleSubmitTransfer() {
    const selected = stage.querySelector(
      'input[name="transfer-answer"]:checked',
    );
    if (!selected) {
      showFormError(
        "Tria què permet concloure la font.",
        'input[name="transfer-answer"]',
      );
      return;
    }
    const item = ITEM_BANK.transfers[0];
    state.transferResponses = [
      {
        itemId: item.id,
        answer: selected.value,
        correct: selected.value === item.expected,
      },
    ];
    state.stage = "transfer-feedback";
    saveState();
    render({
      focus: true,
      announce:
        selected.value === item.expected
          ? "Conclusió correcta."
          : "Conclusió a revisar.",
    });
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
    const matchedSets = [
      [0, 1, 3],
      [1, 2, 4],
      [2, 0, 3],
    ];
    const indices = matchedSets[seed % matchedSets.length];
    const select = (domainId) =>
      indices.map((index) => domainById.get(domainId).items[index]);
    const highItems = shuffled(
      select(highDomainId),
      seed ^ hashString(highDomainId),
    );
    const lowItems = shuffled(
      select(lowDomainId),
      seed ^ hashString(lowDomainId),
    );
    const highFirst = (seed & 1) === 0;
    const order = [];
    for (let index = 0; index < ITEMS_PER_DOMAIN; index += 1) {
      order.push(
        ...(highFirst
          ? [
              { itemId: highItems[index].id, role: "high" },
              { itemId: lowItems[index].id, role: "low" },
            ]
          : [
              { itemId: lowItems[index].id, role: "low" },
              { itemId: highItems[index].id, role: "high" },
            ]),
      );
    }
    return order;
  }

  function validParentOrigin() {
    const configured = new URLSearchParams(window.location.search).get(
      "parentOrigin",
    );
    for (const candidate of [configured, document.referrer]) {
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
      },
    };
  }

  function completeActivity() {
    state.completed = true;
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
      window.parent.postMessage(
        {
          type: "enti-widget-resize",
          schemaVersion: MESSAGE_SCHEMA_VERSION,
          widget: WIDGET_ID,
          version: WIDGET_VERSION,
          height: Math.ceil(document.documentElement.scrollHeight),
        },
        parentOrigin,
      );
    }, 80);
  }

  stage.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    switch (button.dataset.action) {
      case "start":
        state.milestones.started = true;
        state.stage = "familiarity";
        saveState();
        render({ focus: true, announce: "Tria dos àmbits." });
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
        render({ focus: true, announce: "Primera resposta." });
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
          announce: `Resposta ${state.coreIndex + 1} de ${CORE_ITEM_COUNT}.`,
        });
        break;
      case "finish-core":
        state.milestones.core = true;
        state.stage = "transfer";
        saveState();
        render({ focus: true, announce: "Ara treballa amb una font." });
        break;
      case "submit-transfer":
        handleSubmitTransfer();
        break;
      case "show-results":
        state.milestones.transfer = true;
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
    new ResizeObserver(scheduleResize).observe(document.documentElement);
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

  render();
})();
