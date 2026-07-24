(function runTokenizerActivity() {
  "use strict";

  const WIDGET_ID = "b2-tokenizer";
  const WIDGET_VERSION = "2.2.0";
  const STORAGE_KEY = "enti-b2-tokenizer-v2";
  const REQUIRED_REVEALS = 3;
  const ENCODINGS = {
    o200k_base: {
      file: "o200k_base.js",
      globalName: "GPTTokenizer_o200k_base",
    },
    cl100k_base: {
      file: "cl100k_base.js",
      globalName: "GPTTokenizer_cl100k_base",
    },
  };
  const LANGUAGES = {
    ca: { name: "Català", code: "CA", htmlLang: "ca" },
    en: { name: "Anglès", code: "EN", htmlLang: "en" },
    es: { name: "Castellà", code: "ES", htmlLang: "es" },
  };

  const SCENARIOS = [
    {
      id: "resum",
      short: "Resum",
      category: "Petició a una IA · síntesi",
      title: "Resumir un text en punts clau",
      texts: {
        ca: "Resumeix aquest text en cinc punts.",
        en: "Summarize this text in five bullet points.",
        es: "Resume este texto en cinco puntos.",
      },
    },
    {
      id: "correu",
      short: "Correu",
      category: "Petició a una IA · redacció",
      title: "Redactar un correu professional",
      texts: {
        ca: "Escriu un correu professional però cordial per demanar que la reunió de demà es traslladi a divendres.",
        en: "Write a professional but friendly email asking to move tomorrow’s meeting to Friday.",
        es: "Escribe un correo profesional pero cordial para pedir que la reunión de mañana se traslade al viernes.",
      },
    },
    {
      id: "depuracio",
      short: "Depuració",
      category: "Petició a una IA · programació",
      title: "Diagnosticar un error de codi",
      texts: {
        ca: "Explica per què aquesta funció de JavaScript retorna undefined i proposa’n una versió corregida.",
        en: "Explain why this JavaScript function returns undefined and propose a corrected version.",
        es: "Explica por qué esta función de JavaScript devuelve undefined y propón una versión corregida.",
      },
    },
    {
      id: "idees",
      short: "Idees",
      category: "Petició a una IA · ideació",
      title: "Idear mecàniques de videojoc",
      texts: {
        ca: "Proposa tres mecàniques cooperatives per a un videojoc pensat per a un equip de quatre jugadors.",
        en: "Suggest three cooperative mechanics for a video game designed for a team of four players.",
        es: "Propón tres mecánicas cooperativas para un videojuego pensado para un equipo de cuatro jugadores.",
      },
    },
    {
      id: "reescriptura",
      short: "Reescriptura",
      category: "Petició a una IA · llenguatge planer",
      title: "Fer un text més entenedor",
      texts: {
        ca: "Reescriu aquest paràgraf amb un llenguatge planer sense perdre la informació essencial ni els noms propis.",
        en: "Rewrite this paragraph in plain language without losing the essential information or proper names.",
        es: "Reescribe este párrafo con un lenguaje sencillo sin perder la información esencial ni los nombres propios.",
      },
    },
    {
      id: "pla-estudi",
      short: "Pla d’estudi",
      category: "Petició a una IA · planificació",
      title: "Preparar una setmana d’estudi",
      texts: {
        ca: "Crea un pla d’estudi de set dies per preparar l’examen, amb sessions de 45 minuts i una pausa cada dia.",
        en: "Create a seven-day study plan for the exam, with 45-minute sessions and one break every day.",
        es: "Crea un plan de estudio de siete días para preparar el examen, con sesiones de 45 minutos y una pausa diaria.",
      },
    },
    {
      id: "comparacio",
      short: "Comparació",
      category: "Petició a una IA · pensament crític",
      title: "Comparar propostes abans de decidir",
      texts: {
        ca: "Compara aquestes dues propostes, enumera’n els supòsits, assenyala les incerteses i indica quina informació falta abans de decidir.",
        en: "Compare these two proposals, list their assumptions, flag the uncertainties, and state what information is missing before deciding.",
        es: "Compara estas dos propuestas, enumera sus supuestos, señala las incertidumbres e indica qué información falta antes de decidir.",
      },
    },
  ];

  const DEFAULT_FREE_TEXT =
    "Una mica de pa amb tomàquet i una mica d’oli d’oliva.";
  const FREE_SAMPLES = {
    catalan: DEFAULT_FREE_TEXT,
    unicode: "👨‍👩‍👧‍👦 català\n中文 · العربية · हिन्दी",
    special: "<|endoftext|> és text literal, no una ordre.",
  };

  const elements = {
    loadRow: document.querySelector(".load-row"),
    loadStatus: document.getElementById("loadStatus"),
    progress: document.getElementById("activityProgress"),
    progressText: document.getElementById("progressText"),
    restartButton: document.getElementById("restartButton"),
    stepPredict: document.getElementById("stepPredict"),
    stepReveal: document.getElementById("stepReveal"),
    stepCompare: document.getElementById("stepCompare"),
    stepReflect: document.getElementById("stepReflect"),
    scenarioButtons: document.getElementById("scenarioButtons"),
    scenarioCounter: document.getElementById("scenarioCounter"),
    scenarioCategory: document.getElementById("scenarioCategory"),
    scenarioName: document.getElementById("scenarioName"),
    translationPreview: document.getElementById("translationPreview"),
    predictionPanel: document.getElementById("predictionPanel"),
    revealButton: document.getElementById("revealButton"),
    nextScenarioButton: document.getElementById("nextScenarioButton"),
    shareScenarioButton: document.getElementById("shareScenarioButton"),
    resultPanel: document.getElementById("resultPanel"),
    resultTitle: document.getElementById("resultTitle"),
    resultSummary: document.getElementById("resultSummary"),
    predictionFeedback: document.getElementById("predictionFeedback"),
    barChart: document.getElementById("barChart"),
    languageResults: document.getElementById("languageResults"),
    tokenInspector: document.getElementById("tokenInspector"),
    inspectorTitle: document.getElementById("inspectorTitle"),
    inspectorText: document.getElementById("inspectorText"),
    inspectorIdsLabel: document.getElementById("inspectorIdsLabel"),
    inspectorIds: document.getElementById("inspectorIds"),
    inspectorPosition: document.getElementById("inspectorPosition"),
    inspectorKind: document.getElementById("inspectorKind"),
    inspectorBytes: document.getElementById("inspectorBytes"),
    inspectorNote: document.getElementById("inspectorNote"),
    corpusSection: document.getElementById("corpusSection"),
    corpusSummary: document.getElementById("corpusSummary"),
    corpusTableBody: document.querySelector("#corpusTable tbody"),
    corpusTableFoot: document.querySelector("#corpusTable tfoot"),
    reflectionSection: document.getElementById("reflectionSection"),
    reflectionForm: document.getElementById("reflectionForm"),
    reflectionFeedback: document.getElementById("reflectionFeedback"),
    labSection: document.getElementById("labSection"),
    labDetails: document.getElementById("labDetails"),
    freeText: document.getElementById("freeText"),
    freeMetrics: document.getElementById("freeMetrics"),
    freeError: document.getElementById("freeError"),
    freeTokenStream: document.getElementById("freeTokenStream"),
    freeTruncation: document.getElementById("freeTruncation"),
    freeInspector: document.getElementById("freeInspector"),
    freeInspectorTitle: document.getElementById("freeInspectorTitle"),
    freeInspectorText: document.getElementById("freeInspectorText"),
    freeInspectorIds: document.getElementById("freeInspectorIds"),
    freeInspectorPosition: document.getElementById("freeInspectorPosition"),
    freeInspectorKind: document.getElementById("freeInspectorKind"),
    freeInspectorBytes: document.getElementById("freeInspectorBytes"),
    freeInspectorNote: document.getElementById("freeInspectorNote"),
    resetFreeButton: document.getElementById("resetFreeButton"),
    copySummaryButton: document.getElementById("copySummaryButton"),
    applicationDetails: document.getElementById("applicationDetails"),
    compareEncodingButton: document.getElementById("compareEncodingButton"),
    encodingComparison: document.getElementById("encodingComparison"),
    contextLimit: document.getElementById("contextLimit"),
    repetitionCount: document.getElementById("repetitionCount"),
    expectedOutputTokens: document.getElementById("expectedOutputTokens"),
    inputTokenPrice: document.getElementById("inputTokenPrice"),
    outputTokenPrice: document.getElementById("outputTokenPrice"),
    priceCurrency: document.getElementById("priceCurrency"),
    contextResult: document.getElementById("contextResult"),
    inputUsageResult: document.getElementById("inputUsageResult"),
    outputUsageResult: document.getElementById("outputUsageResult"),
    estimatedCostResult: document.getElementById("estimatedCostResult"),
    completionStatus: document.getElementById("completionStatus"),
    liveRegion: document.getElementById("liveRegion"),
  };

  let tokenizerReady = false;
  let tokenizerFailed = false;
  let corpusRendered = false;
  let freeResult = null;
  let freeRequestSequence = 0;
  let freeDebounceTimer = 0;
  let freeAnnouncementTimer = 0;
  let comparisonReady = false;
  let comparisonStarting = false;
  let comparisonResult = null;
  let resizeTimer = 0;
  let previousHeight = 0;
  let completionSentThisSession = false;
  const scenarioResults = new Map();

  class TokenizerClient {
    constructor(encodingName = "o200k_base") {
      if (!Object.hasOwn(ENCODINGS, encodingName)) {
        throw new Error(`Codificació no admesa: ${encodingName}.`);
      }
      this.encodingName = encodingName;
      this.encoding = ENCODINGS[encodingName];
      this.worker = null;
      this.engine = null;
      this.pending = new Map();
      this.requestCounter = 0;
      this.workerReady = false;
      this.workerReadyResolve = null;
      this.workerReadyReject = null;
    }

    async start() {
      try {
        await this.startWorker();
        return "worker";
      } catch (workerError) {
        console.warn(
          `El worker de ${this.encodingName} no està disponible; s’utilitza el mode compatible.`,
          workerError,
        );
        await this.startFallback();
        return "main";
      }
    }

    startWorker() {
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          callback(value);
        };

        try {
          this.worker = new Worker(
            `tokenizer-worker.js?encoding=${encodeURIComponent(this.encodingName)}`,
          );
        } catch (error) {
          reject(error);
          return;
        }

        this.workerReadyResolve = () => {
          this.workerReady = true;
          finish(resolve);
        };
        this.workerReadyReject = (error) => finish(reject, error);

        this.worker.addEventListener("message", (event) =>
          this.handleWorkerMessage(event),
        );
        this.worker.addEventListener("error", (event) => {
          const error = new Error(
            event.message || "El worker del tokenitzador ha fallat.",
          );
          if (!this.workerReady) {
            this.workerReadyReject(error);
          } else {
            this.rejectPending(error);
          }
        });

        const timeout = window.setTimeout(() => {
          if (this.worker) this.worker.terminate();
          this.worker = null;
          finish(
            reject,
            new Error("El tokenitzador ha trigat massa a preparar-se."),
          );
        }, 7000);
      });
    }

    handleWorkerMessage(event) {
      const message = event.data || {};
      if (message.type === "ready") {
        if (message.encoding !== this.encodingName) {
          const error = new Error(
            "El worker ha carregat una codificació inesperada.",
          );
          if (this.workerReadyReject) this.workerReadyReject(error);
          return;
        }
        if (this.workerReadyResolve) this.workerReadyResolve();
        return;
      }
      if (message.type === "fatal") {
        const error = new Error(
          message.message || "No s’ha pogut iniciar el tokenitzador.",
        );
        if (!this.workerReady && this.workerReadyReject)
          this.workerReadyReject(error);
        else this.rejectPending(error);
        return;
      }

      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);

      if (message.type === "result") pending.resolve(message.result);
      else
        pending.reject(
          new Error(message.message || "No s’ha pogut tokenitzar el text."),
        );
    }

    rejectPending(error) {
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    }

    async startFallback() {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      await loadScript(this.encoding.file);
      await loadScript("tokenizer-core.js");
      const encoder = globalThis[this.encoding.globalName];
      if (!encoder || typeof ENTITokenizerCore === "undefined") {
        throw new Error("Falten els fitxers locals del tokenitzador.");
      }
      this.engine = ENTITokenizerCore.createTokenizerEngine(encoder, {
        locale: "ca",
        mergeCacheSize: 4096,
        visualTokenLimit: 320,
      });
    }

    tokenize(text) {
      if (this.engine) {
        return Promise.resolve().then(() => {
          const outcome = this.engine.safeTokenize(text);
          if (!outcome.ok) throw new Error(outcome.message);
          return outcome;
        });
      }
      if (!this.worker || !this.workerReady) {
        return Promise.reject(
          new Error("El tokenitzador encara no està preparat."),
        );
      }

      this.requestCounter += 1;
      const id = `request-${this.requestCounter}`;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.worker.postMessage({ type: "tokenize", id, text });
      });
    }
  }

  const tokenizer = new TokenizerClient("o200k_base");
  const comparisonTokenizer = new TokenizerClient("cl100k_base");
  const state = loadState();

  function defaultState() {
    return {
      version: 2,
      currentScenarioId: SCENARIOS[0].id,
      predictions: {},
      revealedIds: [],
      reflectionCorrect: false,
      completed: false,
    };
  }

  function loadState() {
    const validIds = new Set(SCENARIOS.map((scenario) => scenario.id));
    const requestedScenario = new URLSearchParams(window.location.search).get(
      "scenario",
    );
    const fallback = {
      ...defaultState(),
      currentScenarioId: validIds.has(requestedScenario)
        ? requestedScenario
        : SCENARIOS[0].id,
    };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 2) return fallback;
      const revealedIds = Array.isArray(parsed.revealedIds)
        ? parsed.revealedIds.filter((id) => validIds.has(id))
        : [];
      const predictions = {};
      for (const [id, language] of Object.entries(parsed.predictions || {})) {
        if (validIds.has(id) && Object.hasOwn(LANGUAGES, language))
          predictions[id] = language;
      }
      const hasRequiredReveals = revealedIds.length >= REQUIRED_REVEALS;
      const reflectionCorrect = Boolean(
        parsed.reflectionCorrect && parsed.completed && hasRequiredReveals,
      );
      return {
        version: 2,
        currentScenarioId: validIds.has(requestedScenario)
          ? requestedScenario
          : validIds.has(parsed.currentScenarioId)
            ? parsed.currentScenarioId
            : fallback.currentScenarioId,
        predictions,
        revealedIds: Array.from(new Set(revealedIds)),
        reflectionCorrect,
        completed: reflectionCorrect,
      };
    } catch {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The activity still works when storage is unavailable.
    }
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        `script[data-dynamic-source="${source}"]`,
      );
      if (existing) {
        if (existing.dataset.loaded === "true") resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.dataset.dynamicSource = source;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true },
      );
      script.addEventListener(
        "error",
        () => reject(new Error(`No s’ha pogut carregar ${source}.`)),
        { once: true },
      );
      document.head.appendChild(script);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value, maximumFractionDigits = 0) {
    return new Intl.NumberFormat("ca-ES", {
      maximumFractionDigits,
      minimumFractionDigits: maximumFractionDigits,
    }).format(value);
  }

  function currentScenario() {
    return (
      SCENARIOS.find((scenario) => scenario.id === state.currentScenarioId) ||
      SCENARIOS[0]
    );
  }

  function setLoadStatus(message, type = "loading") {
    elements.loadStatus.textContent = message;
    elements.loadRow.classList.toggle("is-ready", type === "ready");
    elements.loadRow.classList.toggle("is-error", type === "error");
  }

  function announce(message) {
    elements.liveRegion.textContent = "";
    window.setTimeout(() => {
      elements.liveRegion.textContent = message;
    }, 30);
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
        if (url.protocol === "http:" || url.protocol === "https:")
          return url.origin;
      } catch {
        // Try the next candidate.
      }
    }
    return null;
  }

  function activityPayload(type, outcome = {}) {
    return {
      type,
      widget: WIDGET_ID,
      version: WIDGET_VERSION,
      outcome,
    };
  }

  function emitActivityEvent(type, outcome = {}) {
    const payload = activityPayload(type, outcome);
    document.dispatchEvent(new CustomEvent(type, { detail: payload }));
    if (window.parent && window.parent !== window) {
      const targetOrigin = validParentOrigin();
      if (targetOrigin) window.parent.postMessage(payload, targetOrigin);
    }
  }

  function completionOutcome(restored = false) {
    const predictions = Object.keys(state.predictions).length;
    let correctPredictions = 0;
    for (const scenarioId of state.revealedIds) {
      const result = scenarioResults.get(scenarioId);
      const prediction = state.predictions[scenarioId];
      if (result && prediction && topLanguages(result).includes(prediction))
        correctPredictions += 1;
    }
    return {
      completed: true,
      restored,
      scenariosExplored: state.revealedIds.length,
      predictions,
      correctPredictions,
      reflectionCorrect: state.reflectionCorrect,
    };
  }

  function sendResize() {
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (Math.abs(height - previousHeight) < 2) return;
    previousHeight = height;
    emitActivityEvent("enti-widget-resize", { height });
  }

  function scheduleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(sendResize, 90);
  }

  function initResizeMessaging() {
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(scheduleResize);
      observer.observe(document.body);
    }
    window.addEventListener("load", scheduleResize, { once: true });
    scheduleResize();
  }

  function renderScenarioButtons() {
    elements.scenarioButtons.innerHTML = SCENARIOS.map((scenario, index) => {
      const isCurrent = scenario.id === state.currentScenarioId;
      const isRevealed = state.revealedIds.includes(scenario.id);
      return `
        <button
          class="scenario-button${isRevealed ? " is-revealed" : ""}"
          type="button"
          data-scenario-id="${scenario.id}"
          aria-current="${isCurrent ? "true" : "false"}"
        >
          <span>Petició ${index + 1}</span>
          <strong>${escapeHtml(scenario.short)}</strong>
        </button>
      `;
    }).join("");
  }

  function renderTranslationPreview(scenario) {
    elements.translationPreview.innerHTML = Object.entries(LANGUAGES)
      .map(
        ([language, meta]) => `
      <article class="translation-card" data-lang="${language}">
        <header class="translation-header">
          <span class="language-name">
            <span class="language-code" aria-hidden="true">${meta.code}</span>
            ${meta.name}
          </span>
        </header>
        <p class="translation-text" lang="${meta.htmlLang}">${escapeHtml(scenario.texts[language])}</p>
      </article>
    `,
      )
      .join("");
  }

  async function renderCurrentScenario() {
    const scenario = currentScenario();
    const index = SCENARIOS.indexOf(scenario);
    elements.scenarioCounter.textContent = `Petició ${index + 1} de ${SCENARIOS.length}`;
    elements.scenarioCategory.textContent = scenario.category;
    elements.scenarioName.textContent = scenario.title;
    renderTranslationPreview(scenario);

    const revealed = state.revealedIds.includes(scenario.id);
    const prediction = state.predictions[scenario.id] || "";
    const radios = elements.predictionPanel.querySelectorAll(
      'input[name="prediction"]',
    );
    for (const radio of radios) {
      radio.checked = radio.value === prediction;
      radio.disabled = revealed;
    }

    elements.revealButton.hidden = revealed;
    elements.nextScenarioButton.hidden = !revealed;
    elements.revealButton.disabled = !tokenizerReady || !prediction;
    elements.resultPanel.hidden = true;
    elements.tokenInspector.hidden = true;

    if (revealed && tokenizerReady) {
      try {
        const results = await ensureScenarioResults(scenario);
        if (scenario.id === state.currentScenarioId)
          renderScenarioResult(scenario, results);
      } catch (error) {
        showFatalTokenizerError(error);
      }
    }
    scheduleResize();
  }

  async function selectScenario(scenarioId, focusHeading = false) {
    if (!SCENARIOS.some((scenario) => scenario.id === scenarioId)) return;
    state.currentScenarioId = scenarioId;
    saveState();
    renderScenarioButtons();
    await renderCurrentScenario();
    if (focusHeading) elements.scenarioName.focus({ preventScroll: true });
    if (tokenizerReady)
      ensureScenarioResults(currentScenario()).catch(() => {});
  }

  function handlePredictionChange(event) {
    if (!event.target.matches('input[name="prediction"]')) return;
    state.predictions[state.currentScenarioId] = event.target.value;
    saveState();
    elements.revealButton.disabled = !tokenizerReady;
    updateProgress();
    emitActivityEvent("enti-widget-progress", progressOutcome());
  }

  function progressOutcome() {
    return {
      completed: state.completed,
      scenariosExplored: state.revealedIds.length,
      predictions: Object.keys(state.predictions).length,
      reflectionCorrect: state.reflectionCorrect,
    };
  }

  function progressValue() {
    if (state.completed) return 4;
    if (state.revealedIds.length >= REQUIRED_REVEALS) return 3;
    if (state.revealedIds.length > 0) return 2;
    if (Object.keys(state.predictions).length > 0) return 1;
    return 0;
  }

  function updateProgress() {
    const value = progressValue();
    elements.progress.value = value;
    elements.progress.textContent = `${value} de 4 passos`;
    elements.progressText.textContent = `${value} de 4 passos`;
    elements.restartButton.disabled = value === 0;

    const steps = [
      elements.stepPredict,
      elements.stepReveal,
      elements.stepCompare,
      elements.stepReflect,
    ];
    for (const [index, step] of steps.entries()) {
      step.classList.toggle("is-complete", value > index);
      if (value === index && value < 4)
        step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    }

    if (state.completed) {
      elements.completionStatus.textContent =
        "Activitat completada. El progrés ha quedat registrat en aquest navegador.";
      elements.completionStatus.classList.add("completion-success");
    } else {
      elements.completionStatus.textContent = `Has explorat ${state.revealedIds.length} de ${REQUIRED_REVEALS} peticions necessàries.`;
      elements.completionStatus.classList.remove("completion-success");
    }
  }

  async function ensureScenarioResults(scenario) {
    if (scenarioResults.has(scenario.id))
      return scenarioResults.get(scenario.id);
    const entries = await Promise.all(
      Object.keys(LANGUAGES).map(async (language) => [
        language,
        await tokenizer.tokenize(scenario.texts[language]),
      ]),
    );
    const results = Object.fromEntries(entries);
    scenarioResults.set(scenario.id, results);
    return results;
  }

  function topLanguages(results) {
    const maximum = Math.max(
      ...Object.keys(LANGUAGES).map((language) => results[language].tokenCount),
    );
    return Object.keys(LANGUAGES).filter(
      (language) => results[language].tokenCount === maximum,
    );
  }

  function tokenRangeLabel(group) {
    return group.start === group.end
      ? `Token ${group.start}`
      : `Tokens ${group.start}–${group.end}`;
  }

  function tokenChipMarkup(group, language, origin) {
    const ids = group.ids.join(", ");
    const label = `${tokenRangeLabel(group)}. Identificador${group.ids.length > 1 ? "s" : ""}: ${ids}. Text: ${group.ariaText}.`;
    return `
      <button
        class="token-chip"
        type="button"
        data-origin="${origin}"
        data-language="${language}"
        data-group-start="${group.start}"
        data-kind="${group.kind}"
        aria-label="${escapeHtml(label)}"
        aria-pressed="false"
        title="${escapeHtml(`${tokenRangeLabel(group)} · ID ${ids}`)}"
      >
        ${escapeHtml(group.displayText)}${group.ids.length > 1 ? `<span class="multi-badge" aria-hidden="true">×${group.ids.length}</span>` : ""}
      </button>
    `;
  }

  function tokenStreamMarkup(result, language, origin) {
    if (result.tokenCount === 0)
      return '<span class="empty-stream">(text buit)</span>';
    return result.groups
      .map((group) => tokenChipMarkup(group, language, origin))
      .join("");
  }

  function renderScenarioResult(scenario, results) {
    const counts = Object.fromEntries(
      Object.keys(LANGUAGES).map((language) => [
        language,
        results[language].tokenCount,
      ]),
    );
    const highest = topLanguages(results);
    const highestNames = highest
      .map((language) => LANGUAGES[language].name.toLowerCase())
      .join(" i en ");
    const englishCount = counts.en;
    const catalanDifference = counts.ca - englishCount;
    const catalanPercent =
      englishCount > 0
        ? Math.round((catalanDifference / englishCount) * 100)
        : 0;
    let comparison =
      "En aquesta petició, les versions en català i en anglès tenen el mateix recompte.";
    if (catalanDifference > 0) {
      comparison = `En aquesta petició, la versió en català utilitza ${catalanDifference} ${catalanDifference === 1 ? "token" : "tokens"} més que la versió en anglès (${catalanPercent} %).`;
    } else if (catalanDifference < 0) {
      comparison = `En aquesta petició, la versió en català utilitza ${Math.abs(catalanDifference)} ${Math.abs(catalanDifference) === 1 ? "token" : "tokens"} menys que la versió en anglès (${Math.abs(catalanPercent)} %).`;
    }

    elements.resultSummary.textContent =
      highest.length === 1
        ? `${comparison} El recompte més alt correspon a la versió en ${highestNames}.`
        : `${comparison} Els recomptes més alts corresponen a les versions en ${highestNames}.`;
    const prediction = state.predictions[scenario.id];
    const predictionCorrect = highest.includes(prediction);
    elements.predictionFeedback.textContent = predictionCorrect
      ? "La teva predicció coincideix amb el recompte d’aquesta petició. Ara observa on apareixen les fronteres."
      : "La teva predicció no coincideix amb el recompte, i això també és útil: les fronteres reals sovint contradiuen la intuïció.";

    const maximum = Math.max(...Object.values(counts), 1);
    elements.barChart.setAttribute(
      "aria-label",
      Object.entries(LANGUAGES)
        .map(
          ([language, meta]) =>
            `${meta.name}: ${counts[language]} ${counts[language] === 1 ? "token" : "tokens"}`,
        )
        .join(". "),
    );
    elements.barChart.innerHTML = Object.keys(LANGUAGES)
      .map(
        (language) => `
      <div class="bar-row" data-lang="${language}" aria-hidden="true">
        <span>${LANGUAGES[language].name}</span>
        <span class="bar-track"><span class="bar-fill" style="width: ${(counts[language] / maximum) * 100}%"></span></span>
        <span class="bar-value">${counts[language]}</span>
      </div>
    `,
      )
      .join("");

    elements.languageResults.innerHTML = Object.entries(LANGUAGES)
      .map(([language, meta]) => {
        const result = results[language];
        return `
        <article class="language-result" data-lang="${language}">
          <header class="translation-header">
            <span class="language-name">
              <span class="language-code" aria-hidden="true">${meta.code}</span>
              ${meta.name}
            </span>
            <span class="token-total"><strong>${result.tokenCount}</strong><span>tokens</span></span>
          </header>
          <dl class="result-metrics">
            <div><dt>Grafemes</dt><dd>${result.graphemeCount}</dd></div>
            <div><dt>Tokens / 100 grafemes</dt><dd>${formatNumber(result.tokensPerGrapheme * 100, 1)}</dd></div>
            <div><dt>Tokens / paraula</dt><dd>${formatNumber(result.tokensPerWord, 1)}</dd></div>
          </dl>
          <div class="token-stream" role="group" aria-label="Fragments de token en ${meta.name}">
            ${tokenStreamMarkup(result, language, "guided")}
          </div>
          ${result.truncated ? `<p class="truncation-note">Visualització abreujada: s’han omès ${result.omittedTokenCount} tokens centrals.</p>` : ""}
        </article>
      `;
      })
      .join("");

    elements.resultPanel.hidden = false;
    scheduleResize();
  }

  async function revealCurrentScenario() {
    if (!tokenizerReady) return;
    const scenario = currentScenario();
    const prediction = state.predictions[scenario.id];
    if (!prediction) {
      announce("Selecciona una predicció abans de revelar el recompte.");
      return;
    }

    elements.revealButton.disabled = true;
    elements.revealButton.textContent = "Calculant…";
    try {
      const results = await ensureScenarioResults(scenario);
      if (!state.revealedIds.includes(scenario.id))
        state.revealedIds.push(scenario.id);
      saveState();
      renderScenarioResult(scenario, results);
      renderScenarioButtons();
      for (const radio of elements.predictionPanel.querySelectorAll(
        'input[name="prediction"]',
      ))
        radio.disabled = true;
      elements.revealButton.hidden = true;
      elements.nextScenarioButton.hidden = false;
      updateProgress();
      emitActivityEvent("enti-widget-progress", progressOutcome());
      await unlockCorpusAndReflection();
      elements.resultTitle.focus({ preventScroll: true });
      elements.resultPanel.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      announce(
        `${elements.resultSummary.textContent} ${elements.predictionFeedback.textContent}`,
      );
    } catch (error) {
      showFatalTokenizerError(error);
    } finally {
      elements.revealButton.textContent = "Revela el recompte";
      if (!elements.revealButton.hidden) elements.revealButton.disabled = false;
    }
  }

  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  async function goToNextScenario() {
    const unexplored = SCENARIOS.find(
      (scenario) => !state.revealedIds.includes(scenario.id),
    );
    const currentIndex = SCENARIOS.findIndex(
      (scenario) => scenario.id === state.currentScenarioId,
    );
    const next = unexplored || SCENARIOS[(currentIndex + 1) % SCENARIOS.length];
    await selectScenario(next.id);
    document.querySelector(`[data-scenario-id="${next.id}"]`)?.focus();
    window.scrollTo({
      top: elements.scenarioButtons.closest(".scenario-nav").offsetTop - 16,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }

  function resolveGroupFromButton(button) {
    const origin = button.dataset.origin;
    const language = button.dataset.language;
    const start = Number(button.dataset.groupStart);
    if (origin === "guided") {
      const results = scenarioResults.get(state.currentScenarioId);
      return (
        results?.[language]?.groups.find((group) => group.start === start) ||
        null
      );
    }
    if (origin === "free") {
      return freeResult?.groups.find((group) => group.start === start) || null;
    }
    return null;
  }

  function showTokenInspector(button) {
    const group = resolveGroupFromButton(button);
    if (!group) return;
    for (const chip of document.querySelectorAll(
      ".token-chip[aria-pressed='true']",
    )) {
      chip.setAttribute("aria-pressed", "false");
    }
    button.setAttribute("aria-pressed", "true");

    const kindLabels = {
      text: "Text visible",
      whitespace: "Espai en blanc",
      control: "Caràcter invisible o de control",
    };
    const note =
      group.ids.length > 1
        ? "Aquest fragment agrupa diversos identificadors perquè els bytes d’un caràcter Unicode queden repartits entre més d’un token. Agrupar-los evita mostrar caràcters trencats o invisibles."
        : "Una frontera de token no ha de coincidir amb una paraula: pot incloure espais, puntuació o només una part d’una paraula.";

    if (button.dataset.origin === "free") {
      elements.freeInspectorTitle.textContent = tokenRangeLabel(group);
      elements.freeInspectorText.textContent = group.displayText;
      elements.freeInspectorIds.textContent = group.ids.join(", ");
      elements.freeInspectorPosition.textContent =
        group.start === group.end
          ? `${group.start} de ${freeResult.tokenCount}`
          : `${group.start}–${group.end} de ${freeResult.tokenCount}`;
      elements.freeInspectorKind.textContent =
        kindLabels[group.kind] || group.kind;
      elements.freeInspectorBytes.textContent = group.utf8Hex || "Cap byte";
      elements.freeInspectorNote.textContent = note;
      elements.freeInspector.hidden = false;
      scheduleResize();
      return;
    }

    elements.inspectorTitle.textContent = tokenRangeLabel(group);
    elements.inspectorText.textContent = group.displayText;
    elements.inspectorIdsLabel.textContent =
      group.ids.length > 1 ? "Identificadors" : "Identificador";
    elements.inspectorIds.textContent = group.ids.join(", ");
    elements.inspectorPosition.textContent =
      group.start === group.end
        ? `${group.start} de ${button.dataset.origin === "free" ? freeResult.tokenCount : scenarioResults.get(state.currentScenarioId)[button.dataset.language].tokenCount}`
        : `${group.start}–${group.end}`;
    elements.inspectorKind.textContent = kindLabels[group.kind] || group.kind;
    elements.inspectorBytes.textContent = group.utf8Hex || "Cap byte";
    elements.inspectorNote.textContent = note;
    elements.tokenInspector.hidden = false;
    scheduleResize();
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  async function renderCorpus() {
    if (corpusRendered || !tokenizerReady) return;
    elements.corpusSummary.innerHTML =
      '<p class="load-status">Calculant el conjunt de peticions…</p>';
    try {
      await Promise.all(
        SCENARIOS.map((scenario) => ensureScenarioResults(scenario)),
      );
      elements.corpusSummary.innerHTML = Object.entries(LANGUAGES)
        .map(([language, meta]) => {
          const counts = SCENARIOS.map(
            (scenario) => scenarioResults.get(scenario.id)[language].tokenCount,
          );
          const normalized = SCENARIOS.map(
            (scenario) =>
              scenarioResults.get(scenario.id)[language].tokensPerGrapheme *
              100,
          );
          const perWord = SCENARIOS.map(
            (scenario) =>
              scenarioResults.get(scenario.id)[language].tokensPerWord,
          );
          return `
          <article class="corpus-card" data-lang="${language}">
            <span class="language-name"><span class="language-code" aria-hidden="true">${meta.code}</span>${meta.name}</span>
            <strong>${formatNumber(mean(counts), 1)}</strong>
            <p>mitjana global de tokens en les ${SCENARIOS.length} peticions</p>
            <p>mediana ${formatNumber(median(counts), 1)} · rang ${Math.min(...counts)}–${Math.max(...counts)}</p>
            <p>${formatNumber(median(normalized), 1)} tokens per 100 grafemes, de mediana</p>
            <p>${formatNumber(median(perWord), 1)} tokens per paraula, de mediana</p>
          </article>
        `;
        })
        .join("");

      elements.corpusTableBody.innerHTML = SCENARIOS.map(
        (scenario) => `
        <tr>
          <th scope="row">${escapeHtml(scenario.short)}</th>
          <td>${scenarioResults.get(scenario.id).ca.tokenCount}</td>
          <td>${scenarioResults.get(scenario.id).en.tokenCount}</td>
          <td>${scenarioResults.get(scenario.id).es.tokenCount}</td>
        </tr>
      `,
      ).join("");
      elements.corpusTableFoot.innerHTML = `
        <tr>
          <th scope="row">Mitjana global</th>
          ${Object.keys(LANGUAGES)
            .map((language) => {
              const counts = SCENARIOS.map(
                (scenario) =>
                  scenarioResults.get(scenario.id)[language].tokenCount,
              );
              return `<td>${formatNumber(mean(counts), 1)}</td>`;
            })
            .join("")}
        </tr>
      `;
      corpusRendered = true;
      scheduleResize();
    } catch (error) {
      elements.corpusSummary.innerHTML = `<p class="inline-error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function unlockCorpusAndReflection() {
    if (state.revealedIds.length < REQUIRED_REVEALS) return;
    elements.corpusSection.hidden = false;
    elements.reflectionSection.hidden = false;
    await renderCorpus();
    if (state.reflectionCorrect) renderCompletedReflection();
    scheduleResize();
  }

  function renderCompletedReflection() {
    const correctRadio = elements.reflectionForm.querySelector(
      'input[value="dependent"]',
    );
    correctRadio.checked = true;
    for (const radio of elements.reflectionForm.querySelectorAll(
      'input[name="reflection"]',
    ))
      radio.disabled = true;
    const submit = elements.reflectionForm.querySelector(
      'button[type="submit"]',
    );
    submit.disabled = true;
    submit.textContent = "Resposta correcta";
    elements.reflectionFeedback.className = "reflection-feedback is-correct";
    elements.reflectionFeedback.textContent =
      "Exacte. El resultat depèn del text concret i de la codificació; aquesta eina només mostra els tokens del text pla.";
  }

  function handleReflectionSubmit(event) {
    event.preventDefault();
    const selected = elements.reflectionForm.querySelector(
      'input[name="reflection"]:checked',
    );
    if (!selected) {
      elements.reflectionFeedback.className = "reflection-feedback is-wrong";
      elements.reflectionFeedback.textContent =
        "Selecciona una resposta abans de comprovar-la.";
      return;
    }

    if (selected.value !== "dependent") {
      elements.reflectionFeedback.className = "reflection-feedback is-wrong";
      elements.reflectionFeedback.textContent =
        selected.value === "always"
          ? "Torna-ho a mirar: les peticions mostren que la diferència canvia amb la formulació."
          : "Torna a inspeccionar els fragments: alguns tokens són parts de paraula, espais o signes.";
      announce(elements.reflectionFeedback.textContent);
      return;
    }

    state.reflectionCorrect = true;
    state.completed = state.revealedIds.length >= REQUIRED_REVEALS;
    saveState();
    renderCompletedReflection();
    elements.labSection.hidden = !state.completed;
    updateProgress();
    emitActivityEvent("enti-widget-progress", progressOutcome());
    if (state.completed && !completionSentThisSession) {
      completionSentThisSession = true;
      emitActivityEvent("enti-widget-complete", completionOutcome(false));
    }
    announce(
      "Resposta correcta. Activitat completada. Ja pots obrir el laboratori lliure.",
    );
    scheduleResize();
  }

  async function restartActivity() {
    Object.assign(state, defaultState());
    saveState();
    scenarioResults.clear();
    corpusRendered = false;
    completionSentThisSession = false;
    freeRequestSequence += 1;
    clearTimeout(freeDebounceTimer);
    clearTimeout(freeAnnouncementTimer);
    freeResult = null;
    comparisonResult = null;

    elements.corpusSection.hidden = true;
    elements.reflectionSection.hidden = true;
    elements.labSection.hidden = true;
    elements.labDetails.open = false;
    elements.applicationDetails.open = false;
    elements.resultPanel.hidden = true;
    elements.tokenInspector.hidden = true;
    elements.freeInspector.hidden = true;
    elements.freeText.value = DEFAULT_FREE_TEXT;
    elements.freeMetrics.innerHTML = "";
    elements.freeTokenStream.innerHTML = "";
    elements.freeTruncation.hidden = true;
    elements.freeError.hidden = true;
    elements.copySummaryButton.disabled = true;
    elements.contextLimit.value = "";
    elements.repetitionCount.value = "1000";
    elements.expectedOutputTokens.value = "500";
    elements.inputTokenPrice.value = "";
    elements.outputTokenPrice.value = "";
    elements.priceCurrency.value = "USD";
    elements.contextResult.textContent =
      "Introdueix un límit per calcular-ne el percentatge.";
    elements.inputUsageResult.textContent = "Calculant el text actual…";
    elements.outputUsageResult.textContent = "Calculant la sortida prevista…";
    elements.estimatedCostResult.textContent =
      "Introdueix els preus d’entrada i de sortida del proveïdor.";
    elements.estimatedCostResult.removeAttribute("data-value");
    elements.encodingComparison.innerHTML = comparisonReady
      ? "La comparació s’actualitzarà quan tornis a completar i obrir el laboratori."
      : "Activa la comparació per obtenir un segon recompte local.";

    for (const radio of elements.reflectionForm.querySelectorAll(
      'input[name="reflection"]',
    )) {
      radio.checked = false;
      radio.disabled = false;
    }
    const submit = elements.reflectionForm.querySelector(
      'button[type="submit"]',
    );
    submit.disabled = false;
    submit.textContent = "Comprova la resposta";
    elements.reflectionFeedback.className = "reflection-feedback";
    elements.reflectionFeedback.textContent = "";

    renderScenarioButtons();
    await renderCurrentScenario();
    updateProgress();
    emitActivityEvent("enti-widget-progress", progressOutcome());
    elements.scenarioName.focus({ preventScroll: true });
    document.querySelector(".guided-section").scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    announce("Activitat reiniciada. Torna a fer una predicció per començar.");
    scheduleResize();
  }

  function freeMetricsMarkup(result) {
    return `
      <div class="metric"><strong>${result.tokenCount}</strong><span>tokens</span></div>
      <div class="metric"><strong>${result.graphemeCount}</strong><span>grafemes</span></div>
      <div class="metric"><strong>${result.wordCount}</strong><span>paraules</span></div>
      <div class="metric"><strong>${formatNumber(result.tokensPerGrapheme * 100, 1)}</strong><span>tokens / 100 grafemes</span></div>
    `;
  }

  function boundedInteger(input) {
    const value = Number(input.value);
    if (
      input.value.trim() === "" ||
      !Number.isSafeInteger(value) ||
      value < Number(input.min) ||
      value > Number(input.max)
    ) {
      return null;
    }
    return value;
  }

  function boundedNumber(input) {
    const value = Number(input.value);
    if (
      input.value.trim() === "" ||
      !Number.isFinite(value) ||
      value < Number(input.min) ||
      value > Number(input.max)
    ) {
      return null;
    }
    return value;
  }

  function formatCurrency(value, currency) {
    return new Intl.NumberFormat("ca-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  }

  function updateUsageEstimator() {
    if (!freeResult) {
      elements.contextResult.textContent =
        "Esperant el recompte del text actual…";
      elements.inputUsageResult.textContent =
        "Esperant el recompte del text actual…";
      elements.outputUsageResult.textContent =
        "Esperant el recompte del text actual…";
      elements.estimatedCostResult.textContent =
        "Esperant el recompte del text actual…";
      elements.estimatedCostResult.removeAttribute("data-value");
      return;
    }

    const contextLimit = boundedInteger(elements.contextLimit);
    if (contextLimit === null) {
      elements.contextResult.textContent = elements.contextLimit.value
        ? "Introdueix un enter entre 1 i 1.000.000.000."
        : "Introdueix un límit per calcular-ne el percentatge.";
    } else {
      const percentage = (freeResult.tokenCount / contextLimit) * 100;
      const fractionDigits =
        percentage > 0 && percentage < 0.01 ? 4 : percentage < 1 ? 2 : 1;
      elements.contextResult.textContent =
        `${formatNumber(freeResult.tokenCount)} tokens són el ${formatNumber(percentage, fractionDigits)} % ` +
        `del límit de ${formatNumber(contextLimit)} que has introduït.`;
    }

    const repetitions = boundedInteger(elements.repetitionCount);
    if (repetitions === null) {
      elements.inputUsageResult.textContent =
        "Introdueix un nombre enter de peticions entre 1 i 1.000.000.000.";
    } else {
      const totalInputTokens = freeResult.tokenCount * repetitions;
      elements.inputUsageResult.textContent =
        `${formatNumber(repetitions)} peticions inclourien ${formatNumber(totalInputTokens)} ` +
        "tokens d’entrada corresponents a aquest text pla.";
    }

    const expectedOutputTokens = boundedInteger(elements.expectedOutputTokens);
    if (expectedOutputTokens === null || repetitions === null) {
      elements.outputUsageResult.textContent =
        "Introdueix un nombre vàlid de peticions i de tokens de sortida.";
    } else {
      const totalOutputTokens = expectedOutputTokens * repetitions;
      elements.outputUsageResult.textContent =
        `Si cada resposta té ${formatNumber(expectedOutputTokens)} tokens, ` +
        `la sortida sumaria ${formatNumber(totalOutputTokens)} tokens.`;
    }

    const inputPrice = boundedNumber(elements.inputTokenPrice);
    const outputPrice = boundedNumber(elements.outputTokenPrice);
    const currency = elements.priceCurrency.value;
    if (
      repetitions === null ||
      expectedOutputTokens === null ||
      inputPrice === null ||
      outputPrice === null
    ) {
      elements.estimatedCostResult.textContent =
        elements.inputTokenPrice.value || elements.outputTokenPrice.value
          ? "Revisa els valors: calen els dos preus, les peticions i la sortida prevista."
          : "Introdueix els preus d’entrada i de sortida del proveïdor.";
      elements.estimatedCostResult.removeAttribute("data-value");
      return;
    }

    const inputCost =
      ((freeResult.tokenCount * repetitions) / 1_000_000) * inputPrice;
    const outputCost =
      ((expectedOutputTokens * repetitions) / 1_000_000) * outputPrice;
    const totalCost = inputCost + outputCost;
    elements.estimatedCostResult.textContent =
      `${formatCurrency(totalCost, currency)} en total: ` +
      `${formatCurrency(inputCost, currency)} d’entrada + ` +
      `${formatCurrency(outputCost, currency)} de sortida.`;
    elements.estimatedCostResult.dataset.value = String(totalCost);
  }

  function renderEncodingComparison(primaryResult, secondaryResult) {
    const difference = secondaryResult.tokenCount - primaryResult.tokenCount;
    let explanation =
      "En aquest text concret, totes dues codificacions produeixen el mateix recompte.";
    if (difference > 0) {
      explanation =
        `En aquest text concret, cl100k_base utilitza ${formatNumber(difference)} ` +
        `${difference === 1 ? "token" : "tokens"} més.`;
    } else if (difference < 0) {
      explanation =
        `En aquest text concret, cl100k_base utilitza ${formatNumber(Math.abs(difference))} ` +
        `${Math.abs(difference) === 1 ? "token" : "tokens"} menys.`;
    }

    elements.encodingComparison.innerHTML = `
      <div class="encoding-metrics" aria-label="Comparació de codificacions">
        <div><strong>${formatNumber(primaryResult.tokenCount)}</strong><span>o200k_base</span></div>
        <div><strong>${formatNumber(secondaryResult.tokenCount)}</strong><span>cl100k_base</span></div>
      </div>
      <p>${explanation} Això mostra que el recompte no és una propietat fixa del text ni de la llengua.</p>
    `;
  }

  async function tokenizeEncodingComparison(
    text,
    sequence = freeRequestSequence,
  ) {
    comparisonResult = null;
    elements.encodingComparison.classList.add("is-loading");
    elements.encodingComparison.textContent =
      "Calculant el mateix text amb cl100k_base…";
    try {
      const result = await comparisonTokenizer.tokenize(text);
      if (
        sequence !== freeRequestSequence ||
        text !== elements.freeText.value ||
        !freeResult
      )
        return;
      comparisonResult = result;
      renderEncodingComparison(freeResult, result);
    } catch (error) {
      if (sequence !== freeRequestSequence) return;
      elements.encodingComparison.textContent = `No s’ha pogut calcular la segona codificació: ${error.message}`;
    } finally {
      if (sequence === freeRequestSequence) {
        elements.encodingComparison.classList.remove("is-loading");
        scheduleResize();
      }
    }
  }

  async function enableEncodingComparison() {
    if (comparisonStarting || comparisonReady) return;
    comparisonStarting = true;
    elements.compareEncodingButton.disabled = true;
    elements.compareEncodingButton.textContent = "Preparant cl100k_base…";
    elements.encodingComparison.classList.add("is-loading");
    elements.encodingComparison.textContent =
      "Carregant la segona codificació local. El text continua sense sortir del navegador…";
    try {
      await comparisonTokenizer.start();
      comparisonReady = true;
      elements.compareEncodingButton.hidden = true;
      await tokenizeEncodingComparison(elements.freeText.value);
      announce("Comparació de codificacions preparada.");
    } catch (error) {
      elements.encodingComparison.textContent = `No s’ha pogut preparar cl100k_base: ${error.message}`;
      elements.compareEncodingButton.disabled = false;
      elements.compareEncodingButton.textContent = "Torna-ho a provar";
    } finally {
      comparisonStarting = false;
      elements.encodingComparison.classList.remove("is-loading");
      scheduleResize();
    }
  }

  function scheduleFreeTokenization(shouldAnnounce = true) {
    clearTimeout(freeDebounceTimer);
    freeRequestSequence += 1;
    const sequence = freeRequestSequence;
    freeResult = null;
    comparisonResult = null;
    elements.copySummaryButton.disabled = true;
    elements.freeMetrics.classList.add("is-updating");
    elements.freeMetrics.setAttribute("aria-busy", "true");
    elements.freeTokenStream.classList.add("is-updating");
    updateUsageEstimator();
    if (comparisonReady) {
      elements.encodingComparison.classList.add("is-loading");
      elements.encodingComparison.textContent =
        "Esperant el recompte actualitzat…";
    }
    freeDebounceTimer = window.setTimeout(
      () => tokenizeFreeText(shouldAnnounce, sequence),
      70,
    );
  }

  async function tokenizeFreeText(
    shouldAnnounce = true,
    requestedSequence = null,
  ) {
    if (!tokenizerReady || tokenizerFailed) return;
    if (requestedSequence === null) freeRequestSequence += 1;
    const sequence = requestedSequence ?? freeRequestSequence;
    const text = elements.freeText.value;
    elements.freeError.hidden = true;

    try {
      const result = await tokenizer.tokenize(text);
      if (sequence !== freeRequestSequence) return;
      freeResult = result;
      elements.freeMetrics.innerHTML = freeMetricsMarkup(result);
      elements.freeTokenStream.innerHTML = tokenStreamMarkup(
        result,
        "free",
        "free",
      );
      elements.freeTruncation.hidden = !result.truncated;
      elements.freeTruncation.textContent = result.truncated
        ? `Visualització abreujada: es compta tot el text, però s’han omès ${result.omittedTokenCount} tokens centrals per mantenir la pàgina àgil.`
        : "";
      elements.copySummaryButton.disabled = false;
      elements.freeMetrics.classList.remove("is-updating");
      elements.freeMetrics.removeAttribute("aria-busy");
      elements.freeTokenStream.classList.remove("is-updating");
      elements.freeInspector.hidden = true;
      updateUsageEstimator();
      if (comparisonReady) tokenizeEncodingComparison(text, sequence);

      if (shouldAnnounce) {
        clearTimeout(freeAnnouncementTimer);
        freeAnnouncementTimer = window.setTimeout(() => {
          announce(
            `Text lliure: ${result.tokenCount} tokens, ${result.graphemeCount} grafemes i ${result.wordCount} paraules.`,
          );
        }, 650);
      }
      scheduleResize();
    } catch (error) {
      if (sequence !== freeRequestSequence) return;
      freeResult = null;
      elements.freeError.hidden = false;
      elements.freeError.textContent = `No s’ha pogut calcular aquest text: ${error.message}`;
      elements.freeMetrics.innerHTML = "";
      elements.freeTokenStream.innerHTML = "";
      elements.freeMetrics.classList.remove("is-updating");
      elements.freeMetrics.removeAttribute("aria-busy");
      elements.freeTokenStream.classList.remove("is-updating");
      elements.freeTruncation.hidden = true;
      elements.freeInspector.hidden = true;
      elements.copySummaryButton.disabled = true;
      updateUsageEstimator();
      if (comparisonReady) {
        elements.encodingComparison.classList.remove("is-loading");
        elements.encodingComparison.textContent =
          "La comparació no està disponible perquè el recompte principal ha fallat.";
      }
    }
  }

  async function copyFreeSummary() {
    if (!freeResult) return;
    const summaryLines = [
      "Resum de tokenització (o200k_base)",
      `${freeResult.tokenCount} tokens`,
      `${freeResult.graphemeCount} grafemes`,
      `${freeResult.wordCount} paraules`,
      `${formatNumber(freeResult.tokensPerGrapheme * 100, 1)} tokens per 100 grafemes`,
    ];
    if (comparisonResult) {
      summaryLines.push(
        `${comparisonResult.tokenCount} tokens amb cl100k_base`,
      );
    }
    summaryLines.push("El text original no s’inclou en aquest resum.");
    const summary = summaryLines.join("\n");

    const copied = await copyToClipboard(summary);
    announce(
      copied
        ? "Resum copiat al porta-retalls. El text original no s’hi ha inclòs."
        : "No s’ha pogut copiar el resum.",
    );
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.className = "sr-only";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      return copied;
    }
  }

  async function copyScenarioLink() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("scenario", currentScenario().id);
    const copied = await copyToClipboard(url.toString());
    announce(
      copied
        ? "Enllaç copiat. Només inclou l’identificador de la petició; no inclou text, respostes ni progrés."
        : "No s’ha pogut copiar l’enllaç de la petició.",
    );
  }

  function showFatalTokenizerError(error) {
    tokenizerFailed = true;
    tokenizerReady = false;
    setLoadStatus(
      `No s’ha pogut preparar el tokenitzador local. Revisa que o200k_base.js, tokenizer-core.js i tokenizer-worker.js siguin al mateix directori. (${error.message})`,
      "error",
    );
    elements.revealButton.disabled = true;
    elements.freeError.hidden = false;
    elements.freeError.textContent =
      "El recompte no està disponible perquè falta un fitxer local o el navegador l’ha bloquejat.";
    announce("No s’ha pogut preparar el tokenitzador local.");
  }

  function bindEvents() {
    elements.scenarioButtons.addEventListener("click", (event) => {
      const button = event.target.closest("[data-scenario-id]");
      if (button) selectScenario(button.dataset.scenarioId);
    });
    elements.predictionPanel.addEventListener("change", handlePredictionChange);
    elements.revealButton.addEventListener("click", revealCurrentScenario);
    elements.nextScenarioButton.addEventListener("click", goToNextScenario);
    elements.shareScenarioButton.addEventListener("click", copyScenarioLink);
    elements.restartButton.addEventListener("click", restartActivity);
    elements.languageResults.addEventListener("click", (event) => {
      const button = event.target.closest(".token-chip");
      if (button) showTokenInspector(button);
    });
    elements.freeTokenStream.addEventListener("click", (event) => {
      const button = event.target.closest(".token-chip");
      if (button) showTokenInspector(button);
    });
    elements.reflectionForm.addEventListener("submit", handleReflectionSubmit);
    elements.freeText.addEventListener("input", () =>
      scheduleFreeTokenization(true),
    );
    elements.freeText.addEventListener("blur", () => {
      if (freeResult) announce(`Text lliure: ${freeResult.tokenCount} tokens.`);
    });
    elements.labDetails.addEventListener("toggle", () => {
      if (elements.labDetails.open && tokenizerReady && !freeResult)
        scheduleFreeTokenization(false);
      scheduleResize();
    });
    elements.applicationDetails.addEventListener("toggle", scheduleResize);
    elements.compareEncodingButton.addEventListener(
      "click",
      enableEncodingComparison,
    );
    for (const input of [
      elements.contextLimit,
      elements.repetitionCount,
      elements.expectedOutputTokens,
      elements.inputTokenPrice,
      elements.outputTokenPrice,
      elements.priceCurrency,
    ]) {
      input.addEventListener("input", updateUsageEstimator);
      input.addEventListener("change", updateUsageEstimator);
    }
    elements.resetFreeButton.addEventListener("click", () => {
      elements.freeText.value = DEFAULT_FREE_TEXT;
      elements.freeText.focus();
      scheduleFreeTokenization(true);
    });
    elements.copySummaryButton.addEventListener("click", copyFreeSummary);
    for (const button of document.querySelectorAll("[data-free-sample]")) {
      button.addEventListener("click", () => {
        elements.labDetails.open = true;
        elements.freeText.value = FREE_SAMPLES[button.dataset.freeSample];
        elements.freeText.focus();
        scheduleFreeTokenization(true);
      });
    }
  }

  async function onTokenizerReady(mode) {
    tokenizerReady = true;
    setLoadStatus(
      mode === "worker"
        ? "Tokenitzador local preparat. El càlcul es fa fora del fil principal."
        : "Tokenitzador local preparat en mode compatible.",
      "ready",
    );
    const prediction = state.predictions[state.currentScenarioId];
    elements.revealButton.disabled = !prediction;
    ensureScenarioResults(currentScenario()).catch(() => {});

    if (state.revealedIds.includes(state.currentScenarioId))
      await renderCurrentScenario();
    if (state.revealedIds.length >= REQUIRED_REVEALS)
      await unlockCorpusAndReflection();
    elements.labSection.hidden = !state.completed;
    if (elements.labDetails.open) await tokenizeFreeText(false);
    if (state.completed && !completionSentThisSession) {
      completionSentThisSession = true;
      emitActivityEvent("enti-widget-complete", completionOutcome(true));
    }
    scheduleResize();
  }

  async function startTokenizer() {
    try {
      const mode = await tokenizer.start();
      await onTokenizerReady(mode);
    } catch (error) {
      showFatalTokenizerError(error);
    }
  }

  function boot() {
    saveState();
    bindEvents();
    renderScenarioButtons();
    renderCurrentScenario();
    updateProgress();
    if (state.revealedIds.length >= REQUIRED_REVEALS) {
      elements.corpusSection.hidden = false;
      elements.reflectionSection.hidden = false;
      if (state.reflectionCorrect) renderCompletedReflection();
    }
    elements.labSection.hidden = !state.completed;
    initResizeMessaging();

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(startTokenizer, { timeout: 450 });
    } else {
      window.setTimeout(startTokenizer, 40);
    }
  }

  boot();
})();
