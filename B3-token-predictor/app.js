(function initTokenPredictor() {
  "use strict";

  const VERSION = "3.0.0";
  const WIDGET_ID = "b3-token-predictor";
  const STORAGE_KEY = "enti-b3-token-predictor:v3";
  const DEFAULT_SEED = "ENTI-B3";
  const DISPLAY_TOKEN_COUNT = 6;
  const MAX_DRAWS_PER_SCENARIO = 10000;
  const VALID_BANDS = new Set(["low", "natural", "high"]);
  const Engine = window.B3Engine;
  const Dataset = window.B3ScenarioData;

  if (!Engine || !Dataset) {
    showFatalError(
      "No s'han pogut carregar els components locals de l'activitat. Torna a carregar la pàgina.",
    );
    return;
  }

  const datasetErrors = Engine.validateDataset(Dataset);
  if (datasetErrors.length > 0) {
    showFatalError(
      `El conjunt de dades no és vàlid: ${datasetErrors.join(" ")}`,
    );
    return;
  }

  const scenariosById = new Map(
    Dataset.scenarios.map((scenario) => [scenario.id, scenario]),
  );
  const formatterOneDecimal = new Intl.NumberFormat("ca-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const formatterTwoDecimals = new Intl.NumberFormat("ca-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const integerFormatter = new Intl.NumberFormat("ca-ES");

  const elements = {
    activityStatus: document.getElementById("activityStatus"),
    applySeed: document.getElementById("applySeed"),
    completeButton: document.getElementById("completeButton"),
    completionHelp: document.getElementById("completionHelp"),
    completionStatus: document.getElementById("completionStatus"),
    contextTokenCount: document.getElementById("contextTokenCount"),
    counterfactual: document.getElementById("counterfactual"),
    counterfactualText: document.getElementById("counterfactualText"),
    distributionBody: document.getElementById("distributionBody"),
    distributionPanel: document.getElementById("distributionPanel"),
    distributionSummary: document.getElementById("distributionSummary"),
    histogramBody: document.getElementById("histogramBody"),
    histogramEmpty: document.getElementById("histogramEmpty"),
    histogramTable: document.getElementById("histogramTable"),
    lessonText: document.getElementById("lessonText"),
    lessonTitle: document.getElementById("lessonTitle"),
    milestoneList: document.getElementById("milestoneList"),
    nextScenario: document.getElementById("nextScenario"),
    predictionFeedback: document.getElementById("predictionFeedback"),
    predictionOptions: document.getElementById("predictionOptions"),
    predictionPrompt: document.getElementById("predictionPrompt"),
    previousScenario: document.getElementById("previousScenario"),
    progressBar: document.getElementById("progressBar"),
    progressCount: document.getElementById("progressCount"),
    progressFill: document.getElementById("progressFill"),
    promptText: document.getElementById("promptText"),
    promptTokenList: document.getElementById("promptTokenList"),
    randomCaption: document.getElementById("randomCaption"),
    randomMarker: document.getElementById("randomMarker"),
    reflectionFeedback: document.getElementById("reflectionFeedback"),
    reflectionFieldset: document.getElementById("reflectionFieldset"),
    reflectionForm: document.getElementById("reflectionForm"),
    reflectionUnlockStatus: document.getElementById("reflectionUnlockStatus"),
    resetActivity: document.getElementById("resetActivity"),
    resetSamples: document.getElementById("resetSamples"),
    sampleCountText: document.getElementById("sampleCountText"),
    sampleMeta: document.getElementById("sampleMeta"),
    sampleResult: document.getElementById("sampleResult"),
    sampleToken: document.getElementById("sampleToken"),
    scenarioEyebrow: document.getElementById("scenarioEyebrow"),
    scenarioMeta: document.getElementById("scenarioMeta"),
    scenarioSelect: document.getElementById("scenarioSelect"),
    scenarioTitle: document.getElementById("scenarioTitle"),
    seedInput: document.getElementById("seedInput"),
    temperatureHint: document.getElementById("temperatureHint"),
    temperatureSlider: document.getElementById("temperatureSlider"),
    temperatureValue: document.getElementById("temperatureValue"),
    versionText: document.getElementById("versionText"),
  };

  let state = loadState();
  let completionSentThisPage = false;
  let completionAcknowledged = state.completionAcknowledged;
  let statusSequence = 0;
  let resizeTimer = null;

  if (state.completed && !state.completionId) {
    state.completionId = createCompletionId();
    saveState();
  }

  populateScenarioSelect();
  bindEvents();
  renderAll();
  setupResizeContract();

  if (
    state.completed &&
    !state.completionAcknowledged &&
    window.parent &&
    window.parent !== window &&
    validParentOrigin()
  ) {
    window.setTimeout(() => emitCompletion({ dispatchDomEvent: false }), 0);
  }

  function createScenarioState() {
    return {
      predictionTokenId: null,
      drawCount: 0,
      histogram: {},
      sampledBands: [],
      lastDraw: null,
    };
  }

  function createDefaultState() {
    const scenarioState = {};
    Dataset.scenarios.forEach((scenario) => {
      scenarioState[scenario.id] = createScenarioState();
    });
    return {
      schemaVersion: 3,
      datasetVersion: Dataset.metadata.datasetVersion,
      currentScenarioId: Dataset.scenarios[0].id,
      temperature: 1,
      seed: DEFAULT_SEED,
      scenarios: scenarioState,
      reflectionChoice: null,
      reflectionCorrect: false,
      completed: false,
      completionId: null,
      completionAcknowledged: false,
    };
  }

  function loadState() {
    const fallback = createDefaultState();
    let stored;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return fallback;
    }

    if (
      !stored ||
      stored.schemaVersion !== 3 ||
      stored.datasetVersion !== Dataset.metadata.datasetVersion
    ) {
      return fallback;
    }
    if (scenariosById.has(stored.currentScenarioId)) {
      fallback.currentScenarioId = stored.currentScenarioId;
    }
    fallback.temperature = Engine.clampTemperature(stored.temperature);
    if (typeof stored.seed === "string" && stored.seed.trim()) {
      fallback.seed = stored.seed.trim().slice(0, 32);
    }
    fallback.reflectionChoice =
      typeof stored.reflectionChoice === "string"
        ? stored.reflectionChoice
        : null;
    fallback.reflectionCorrect = stored.reflectionCorrect === true;
    fallback.completed = stored.completed === true;
    if (
      fallback.completed &&
      typeof stored.completionId === "string" &&
      /^[a-z0-9-]{8,100}$/i.test(stored.completionId)
    ) {
      fallback.completionId = stored.completionId;
      fallback.completionAcknowledged = stored.completionAcknowledged === true;
    }

    Dataset.scenarios.forEach((scenario) => {
      const source = stored.scenarios?.[scenario.id];
      if (!source) return;
      const target = fallback.scenarios[scenario.id];
      const validTokenIds = new Set(
        scenario.candidates.map((candidate) => String(candidate.id)),
      );
      if (
        source.predictionTokenId != null &&
        validTokenIds.has(String(source.predictionTokenId))
      ) {
        target.predictionTokenId = Number(source.predictionTokenId);
      }
      target.drawCount = Math.min(
        MAX_DRAWS_PER_SCENARIO,
        Math.max(0, Math.floor(Number(source.drawCount) || 0)),
      );
      if (source.histogram && typeof source.histogram === "object") {
        Object.entries(source.histogram).forEach(([tokenId, count]) => {
          if (!validTokenIds.has(tokenId)) return;
          const safeCount = Math.max(0, Math.floor(Number(count) || 0));
          if (safeCount > 0) target.histogram[tokenId] = safeCount;
        });
      }
      target.drawCount = Math.min(
        MAX_DRAWS_PER_SCENARIO,
        Object.values(target.histogram).reduce(
          (total, count) => total + count,
          0,
        ),
      );
      if (Array.isArray(source.sampledBands)) {
        target.sampledBands = Array.from(
          new Set(source.sampledBands.filter((band) => VALID_BANDS.has(band))),
        );
      }
      if (
        source.lastDraw &&
        validTokenIds.has(String(source.lastDraw.tokenId)) &&
        Number.isFinite(source.lastDraw.randomValue)
      ) {
        const candidate = scenario.candidates.find(
          (item) => item.id === Number(source.lastDraw.tokenId),
        );
        target.lastDraw = {
          drawIndex: Math.max(
            0,
            Math.floor(Number(source.lastDraw.drawIndex) || 0),
          ),
          randomValue: Math.min(
            1 - Number.EPSILON,
            Math.max(0, Number(source.lastDraw.randomValue)),
          ),
          tokenId: candidate.id,
          tokenText: candidate.text,
          temperature: Engine.clampTemperature(source.lastDraw.temperature),
        };
      }
    });
    return fallback;
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      announce(
        "No s'ha pogut desar el progrés en aquest navegador. Pots continuar l'activitat.",
      );
    }
  }

  function currentScenario() {
    return scenariosById.get(state.currentScenarioId) || Dataset.scenarios[0];
  }

  function currentScenarioState() {
    return state.scenarios[currentScenario().id];
  }

  function populateScenarioSelect() {
    elements.scenarioSelect.replaceChildren();
    const coreGroup = document.createElement("optgroup");
    coreGroup.label = "Ruta guiada";
    const exploreGroup = document.createElement("optgroup");
    exploreGroup.label = "Exploració";

    Dataset.scenarios.forEach((scenario) => {
      const option = document.createElement("option");
      option.value = scenario.id;
      option.textContent = `${scenario.order}. ${scenario.shortTitle}`;
      (scenario.core ? coreGroup : exploreGroup).appendChild(option);
    });
    elements.scenarioSelect.append(coreGroup, exploreGroup);
  }

  function bindEvents() {
    elements.scenarioSelect.addEventListener("change", () => {
      selectScenario(elements.scenarioSelect.value);
    });
    elements.previousScenario.addEventListener("click", () => moveScenario(-1));
    elements.nextScenario.addEventListener("click", () => moveScenario(1));

    elements.predictionOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-prediction-token-id]");
      if (!button || button.disabled) return;
      recordPrediction(Number(button.dataset.predictionTokenId), {
        moveFocus: event.detail === 0,
      });
    });

    elements.temperatureSlider.addEventListener("input", () => {
      state.temperature = Engine.clampTemperature(
        elements.temperatureSlider.value,
      );
      saveState();
      renderTemperature();
      renderDistribution();
      renderSampleResult();
    });
    elements.temperatureSlider.addEventListener("change", () => {
      announce(
        `Temperatura ${formatTemperature(state.temperature)}. ${temperatureCopy(
          state.temperature,
        )}`,
      );
      dispatchProgress();
    });

    document.querySelectorAll("[data-temperature]").forEach((button) => {
      button.addEventListener("click", () => {
        state.temperature = Engine.clampTemperature(button.dataset.temperature);
        saveState();
        renderTemperature();
        renderDistribution();
        renderSampleResult();
        announce(
          `Temperatura ${formatTemperature(state.temperature)}. ${temperatureCopy(
            state.temperature,
          )}`,
        );
        dispatchProgress();
      });
    });

    document.querySelectorAll("[data-sample-count]").forEach((button) => {
      button.addEventListener("click", () => {
        sampleTokens(Number(button.dataset.sampleCount));
      });
    });
    elements.resetSamples.addEventListener("click", resetCurrentSamples);
    elements.applySeed.addEventListener("click", applySeed);
    elements.seedInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applySeed();
      }
    });

    elements.reflectionForm.addEventListener("submit", submitReflection);
    elements.completeButton.addEventListener("click", completeActivity);
    window.addEventListener("message", handleParentMessage);
    elements.resetActivity.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Vols esborrar el progrés i començar tota l'activitat de nou?",
      );
      if (!confirmed) return;
      state = createDefaultState();
      completionSentThisPage = false;
      completionAcknowledged = false;
      saveState();
      renderAll();
      announce("Activitat reiniciada.");
      document.getElementById("progressTitle").focus?.();
    });
  }

  function selectScenario(scenarioId) {
    if (!scenariosById.has(scenarioId)) return;
    state.currentScenarioId = scenarioId;
    saveState();
    renderAll();
    announce(
      `Escenari ${currentScenario().order} de ${Dataset.scenarios.length}: ${
        currentScenario().title
      }.`,
    );
  }

  function moveScenario(direction) {
    const currentIndex = Dataset.scenarios.findIndex(
      (scenario) => scenario.id === currentScenario().id,
    );
    const targetIndex = Math.min(
      Dataset.scenarios.length - 1,
      Math.max(0, currentIndex + direction),
    );
    if (targetIndex === currentIndex) return;
    selectScenario(Dataset.scenarios[targetIndex].id);
  }

  function recordPrediction(tokenId, { moveFocus = false } = {}) {
    const scenario = currentScenario();
    const scenarioState = currentScenarioState();
    if (scenarioState.predictionTokenId != null) return;
    if (!scenario.predictionTokenIds.includes(tokenId)) return;

    scenarioState.predictionTokenId = tokenId;
    saveState();
    renderAll();

    const predicted = scenario.candidates.find(
      (candidate) => candidate.id === tokenId,
    );
    const top = scenario.candidates[0];
    const comparison =
      predicted.id === top.id
        ? "La teva predicció coincideix amb el token més probable de la simulació."
        : `La simulació situa ${formatToken(
            top.text,
          )} al capdamunt. La predicció serveix per fer visible la diferència.`;
    announce(
      `Distribució revelada. Has triat ${formatToken(
        predicted.text,
      )}. ${comparison}`,
    );
    if (moveFocus) {
      elements.temperatureSlider.focus();
    }
  }

  function sampleTokens(requestedCount) {
    const scenario = currentScenario();
    const scenarioState = currentScenarioState();
    if (scenarioState.predictionTokenId == null) {
      announce("Fes una predicció abans de mostrejar.");
      return;
    }

    const available = MAX_DRAWS_PER_SCENARIO - scenarioState.drawCount;
    const count = Math.min(Math.max(1, requestedCount), available);
    if (count <= 0) {
      announce(
        "Has arribat al límit de mostres d'aquest escenari. Reinicia-les per continuar.",
      );
      return;
    }

    const result = Engine.sampleBatch({
      candidates: scenario.candidates,
      temperature: state.temperature,
      seed: state.seed,
      scenarioId: scenario.id,
      startIndex: scenarioState.drawCount,
      count,
    });

    Object.entries(result.counts).forEach(([tokenId, tokenCount]) => {
      scenarioState.histogram[tokenId] =
        (scenarioState.histogram[tokenId] || 0) + tokenCount;
    });
    scenarioState.drawCount += result.draws.length;
    scenarioState.lastDraw = result.draws[result.draws.length - 1] || null;
    scenarioState.sampledBands = Array.from(
      new Set([
        ...scenarioState.sampledBands,
        Engine.temperatureBand(state.temperature),
      ]),
    );

    saveState();
    renderAll();

    if (result.draws.length === 1) {
      announce(
        `Token mostrejat: ${formatToken(
          scenarioState.lastDraw.tokenText,
        )}, identificador ${scenarioState.lastDraw.tokenId}. És una mostra independent del mateix context.`,
      );
    } else {
      const mostFrequent = mostFrequentToken(scenarioState.histogram, scenario);
      announce(
        `${result.draws.length} mostres completades. Total de l'escenari: ${
          scenarioState.drawCount
        }. El token més freqüent és ${formatToken(mostFrequent.text)}.`,
      );
    }
  }

  function resetCurrentSamples() {
    state.scenarios[currentScenario().id] = {
      ...createScenarioState(),
      predictionTokenId: currentScenarioState().predictionTokenId,
    };
    saveState();
    renderAll();
    announce("Mostres de l'escenari reiniciades.");
  }

  function applySeed() {
    const nextSeed = elements.seedInput.value.trim().slice(0, 32);
    if (!nextSeed) {
      elements.seedInput.value = state.seed;
      announce("La llavor no pot estar buida.");
      return;
    }
    state.seed = nextSeed;
    Dataset.scenarios.forEach((scenario) => {
      const predictionTokenId = state.scenarios[scenario.id].predictionTokenId;
      state.scenarios[scenario.id] = {
        ...createScenarioState(),
        predictionTokenId,
      };
    });
    saveState();
    renderAll();
    announce(
      `Llavor ${state.seed} aplicada. Les mostres s'han reiniciat; les prediccions es conserven.`,
    );
  }

  function submitReflection(event) {
    event.preventDefault();
    if (elements.reflectionFieldset.disabled) return;
    const choice = new FormData(elements.reflectionForm).get("reflection");
    if (!choice) {
      elements.reflectionFeedback.hidden = false;
      elements.reflectionFeedback.className = "reflection-feedback incorrect";
      elements.reflectionFeedback.textContent =
        "Tria una resposta abans de comprovar-la.";
      announce(elements.reflectionFeedback.textContent);
      return;
    }

    state.reflectionChoice = String(choice);
    state.reflectionCorrect = choice === "distribution";
    saveState();
    renderAll();
    announce(
      state.reflectionCorrect
        ? "Resposta correcta. La temperatura canvia la selecció, no afegeix coneixement ni verificació."
        : "Encara no. Revisa la diferència entre la distribució de selecció i el coneixement del model.",
    );
  }

  function completeActivity() {
    const progress = Engine.calculateProgress(state);
    if (!progress.readyToComplete || state.completed) return;
    state.completed = true;
    state.completionId = createCompletionId();
    state.completionAcknowledged = false;
    completionAcknowledged = false;
    saveState();
    renderAll();
    emitCompletion();
    announce(
      window.parent && window.parent !== window && validParentOrigin()
        ? "Activitat completada en aquest navegador. La finalització s'ha enviat al contenidor del curs i espera confirmació."
        : "Activitat completada i desada en aquest navegador.",
    );
  }

  function renderAll() {
    elements.versionText.textContent = VERSION;
    elements.scenarioSelect.value = currentScenario().id;
    elements.seedInput.value = state.seed;
    renderScenario();
    renderPrediction();
    renderTemperature();
    renderDistribution();
    renderSampleResult();
    renderHistogram();
    renderProgress();
    renderReflection();
    renderCompletion();
    dispatchProgress();
  }

  function renderScenario() {
    const scenario = currentScenario();
    const index = Dataset.scenarios.findIndex(
      (item) => item.id === scenario.id,
    );
    elements.previousScenario.disabled = index === 0;
    elements.nextScenario.disabled = index === Dataset.scenarios.length - 1;
    elements.scenarioEyebrow.textContent = scenario.eyebrow;
    elements.scenarioTitle.textContent = scenario.title;
    elements.promptText.textContent = scenario.prompt;
    elements.promptText.lang = scenario.language;
    elements.contextTokenCount.textContent = `${integerFormatter.format(
      scenario.promptTokens.length,
    )} tokens al context`;
    elements.predictionPrompt.textContent = scenario.predictionPrompt;

    const meta = [
      scenario.core ? "Ruta guiada" : "Exploració",
      scenario.language.toUpperCase(),
      shapeLabel(scenario.shape),
      `${scenario.candidates.length} tokens`,
    ];
    elements.scenarioMeta.replaceChildren(
      ...meta.map((label) => {
        const span = document.createElement("span");
        span.className = "meta-tag";
        span.textContent = label;
        return span;
      }),
    );

    elements.promptTokenList.replaceChildren(
      ...scenario.promptTokens.map((token) => {
        const item = document.createElement("li");
        item.lang = scenario.language;
        const text = document.createElement("span");
        text.textContent = formatToken(token.text);
        const id = document.createElement("small");
        id.textContent = `#${token.id}`;
        item.append(text, id);
        return item;
      }),
    );
  }

  function renderPrediction() {
    const scenario = currentScenario();
    const scenarioState = currentScenarioState();
    const topCandidate = scenario.candidates[0];
    elements.predictionOptions.replaceChildren();

    scenario.predictionTokenIds.forEach((tokenId) => {
      const candidate = scenario.candidates.find((item) => item.id === tokenId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "prediction-option";
      button.dataset.predictionTokenId = String(candidate.id);
      button.lang = scenario.language;
      button.disabled = scenarioState.predictionTokenId != null;
      button.setAttribute(
        "aria-pressed",
        String(scenarioState.predictionTokenId === candidate.id),
      );
      if (scenarioState.predictionTokenId === candidate.id) {
        button.classList.add("selected");
      }

      const label = document.createElement("span");
      label.className = "token-label";
      label.textContent = formatToken(candidate.text);
      const id = document.createElement("span");
      id.className = "token-id";
      id.textContent = `token #${candidate.id}`;
      button.append(label, id);
      elements.predictionOptions.appendChild(button);
    });

    if (scenarioState.predictionTokenId == null) {
      elements.predictionFeedback.hidden = true;
      elements.predictionFeedback.textContent = "";
      elements.distributionPanel.hidden = true;
      return;
    }

    const prediction = scenario.candidates.find(
      (candidate) => candidate.id === scenarioState.predictionTokenId,
    );
    elements.predictionFeedback.hidden = false;
    elements.predictionFeedback.textContent =
      prediction.id === topCandidate.id
        ? `Has triat ${formatToken(
            prediction.text,
          )}. Coincideix amb el primer token de la simulació; ara mira com es reparteix la resta.`
        : `Has triat ${formatToken(
            prediction.text,
          )}. La simulació posa ${formatToken(
            topCandidate.text,
          )} al capdamunt; la predicció no es puntua, serveix per comparar.`;
    elements.distributionPanel.hidden = false;
  }

  function renderTemperature() {
    const scenarioState = currentScenarioState();
    const enabled = scenarioState.predictionTokenId != null;
    elements.temperatureSlider.disabled = !enabled;
    elements.temperatureSlider.value = String(state.temperature);
    elements.temperatureValue.textContent = formatTemperature(
      state.temperature,
    );
    elements.temperatureHint.textContent = temperatureCopy(state.temperature);
    elements.temperatureSlider.setAttribute(
      "aria-valuetext",
      `${formatTemperature(state.temperature)} — ${temperatureCopy(
        state.temperature,
      )}`,
    );

    document.querySelectorAll("[data-temperature]").forEach((button) => {
      button.disabled = !enabled;
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.temperature) === state.temperature),
      );
    });
    document.querySelectorAll("[data-sample-count]").forEach((button) => {
      button.disabled = !enabled;
    });
    elements.resetSamples.disabled =
      !enabled || currentScenarioState().drawCount === 0;
  }

  function renderDistribution() {
    const scenario = currentScenario();
    const scenarioState = currentScenarioState();
    if (scenarioState.predictionTokenId == null) return;

    const distribution = Engine.applyTemperature(
      scenario.candidates,
      state.temperature,
    );
    const displayRows = Engine.aggregateDisplayRows(
      distribution,
      DISPLAY_TOKEN_COUNT,
    );
    const top = distribution.reduce((best, candidate) =>
      candidate.adjustedProbability > best.adjustedProbability
        ? candidate
        : best,
    );

    elements.distributionSummary.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = `${formatToken(top.text)} · ${formatPercent(
      top.adjustedProbability,
    )}`;
    const text = document.createTextNode(
      `Entropia ${formatterTwoDecimals.format(
        Engine.entropy(distribution),
      )} bits`,
    );
    elements.distributionSummary.append(strong, text);

    elements.distributionBody.replaceChildren(
      ...displayRows.map((row) => createDistributionRow(row, scenario)),
    );
    elements.lessonTitle.textContent = scenario.lessonTitle;
    elements.lessonText.textContent = scenario.lesson;
  }

  function createDistributionRow(row, scenario) {
    const tableRow = document.createElement("tr");
    if (row.isAggregate) tableRow.classList.add("aggregate-row");

    const tokenCell = document.createElement("td");
    tokenCell.className = "token-cell";
    const tokenLabel = document.createElement("code");
    tokenLabel.lang = row.isAggregate ? "ca" : scenario.language;
    tokenLabel.textContent = row.isAggregate
      ? `Altres ${row.aggregateCount} tokens`
      : formatToken(row.text);
    const tokenMeta = document.createElement("small");
    tokenMeta.textContent = row.isAggregate
      ? "agrupats només per visualitzar"
      : `#${row.id}`;
    tokenCell.append(tokenLabel, tokenMeta);

    const barCell = document.createElement("td");
    barCell.className = "bar-cell";
    const pair = document.createElement("div");
    pair.className = "bar-pair";
    pair.setAttribute("aria-hidden", "true");
    pair.append(
      createBar(row.probability, "bar-base"),
      createBar(row.adjustedProbability, "bar-current"),
    );
    barCell.appendChild(pair);

    const baseCell = document.createElement("td");
    baseCell.className = "probability-cell base-probability";
    baseCell.textContent = formatPercent(row.probability);
    const currentCell = document.createElement("td");
    currentCell.className = "probability-cell current-probability";
    currentCell.textContent = formatPercent(row.adjustedProbability);

    tableRow.append(tokenCell, barCell, baseCell, currentCell);
    return tableRow;
  }

  function createBar(probability, className) {
    const track = document.createElement("span");
    track.className = "bar-track";
    const bar = document.createElement("span");
    bar.className = `bar ${className}`;
    bar.style.width = `${Math.max(0, Math.min(100, probability * 100))}%`;
    track.appendChild(bar);
    return track;
  }

  function renderSampleResult() {
    const scenario = currentScenario();
    const scenarioState = currentScenarioState();
    const draw = scenarioState.lastDraw;
    if (!draw) {
      elements.sampleResult.hidden = true;
      elements.counterfactual.hidden = true;
      return;
    }

    elements.sampleResult.hidden = false;
    elements.sampleToken.textContent = formatToken(draw.tokenText);
    elements.sampleToken.lang = scenario.language;
    elements.sampleMeta.textContent = `token #${
      draw.tokenId
    } · mostra ${integerFormatter.format(draw.drawIndex + 1)} · T = ${formatTemperature(
      draw.temperature,
    )}`;
    const markerPosition = Math.min(
      99.5,
      Math.max(0.5, draw.randomValue * 100),
    );
    elements.randomMarker.style.left = `${markerPosition}%`;
    elements.randomCaption.textContent = `Nombre pseudoaleatori u = ${formatterTwoDecimals.format(
      draw.randomValue,
    )}. La llavor permet reproduir exactament l'extracció.`;

    const distribution = Engine.applyTemperature(
      scenario.candidates,
      state.temperature,
    );
    const counterfactualToken = Engine.selectCandidate(
      distribution,
      draw.randomValue,
    );
    elements.counterfactual.hidden = false;
    elements.counterfactualText.textContent =
      counterfactualToken.id === draw.tokenId
        ? `Amb u = ${formatterTwoDecimals.format(
            draw.randomValue,
          )}, el token continua sent ${formatToken(
            counterfactualToken.text,
          )} a T = ${formatTemperature(state.temperature)}.`
        : `La mostra original era ${formatToken(
            draw.tokenText,
          )} a T = ${formatTemperature(
            draw.temperature,
          )}; amb el mateix u, a T = ${formatTemperature(
            state.temperature,
          )} sortiria ${formatToken(counterfactualToken.text)}.`;
  }

  function renderHistogram() {
    const scenario = currentScenario();
    const scenarioState = currentScenarioState();
    const total = scenarioState.drawCount;
    elements.sampleCountText.textContent =
      total === 0
        ? "Encara no hi ha mostres."
        : `${integerFormatter.format(total)} mostres acumulades amb la llavor ${
            state.seed
          }.`;
    elements.histogramEmpty.hidden = total > 0;
    elements.histogramTable.hidden = total === 0;
    elements.histogramBody.replaceChildren();
    if (total === 0) return;

    const rows = scenario.candidates
      .map((candidate) => ({
        ...candidate,
        count: scenarioState.histogram[candidate.id] || 0,
      }))
      .filter((candidate) => candidate.count > 0)
      .sort(
        (first, second) =>
          second.count - first.count || second.probability - first.probability,
      );

    rows.forEach((candidate) => {
      const row = document.createElement("tr");
      const token = document.createElement("td");
      token.lang = scenario.language;
      token.textContent = `${formatToken(candidate.text)} (#${candidate.id})`;
      const count = document.createElement("td");
      count.textContent = integerFormatter.format(candidate.count);
      const frequency = document.createElement("td");
      frequency.textContent = formatPercent(candidate.count / total);
      row.append(token, count, frequency);
      elements.histogramBody.appendChild(row);
    });
  }

  function renderProgress() {
    const progress = Engine.calculateProgress(state);
    elements.progressCount.textContent = `${progress.completedCount}/${progress.totalMilestones}`;
    elements.progressBar.setAttribute(
      "aria-valuenow",
      String(progress.completedCount),
    );
    elements.progressBar.setAttribute(
      "aria-valuetext",
      `${progress.completedCount} de ${progress.totalMilestones} evidències completades`,
    );
    elements.progressFill.style.width = `${
      (progress.completedCount / progress.totalMilestones) * 100
    }%`;

    let currentAssigned = false;
    Object.entries(progress.milestones).forEach(([name, complete]) => {
      const item = elements.milestoneList.querySelector(
        `[data-milestone="${name}"]`,
      );
      if (!item) return;
      const current = !complete && !currentAssigned && !state.completed;
      if (current) currentAssigned = true;
      item.classList.toggle("complete", complete);
      item.classList.toggle("current", current);
      if (current) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
      const mark = item.querySelector(".milestone-mark");
      mark.textContent = complete
        ? "✓"
        : String(Array.from(elements.milestoneList.children).indexOf(item) + 1);
      item.setAttribute(
        "aria-label",
        `${item.querySelector("strong").textContent}: ${
          complete ? "completat" : current ? "pas actual" : "pendent"
        }`,
      );
    });
  }

  function renderReflection() {
    const progress = Engine.calculateProgress(state);
    const unlocked =
      state.completed ||
      (progress.milestones.predictions &&
        progress.milestones.samples &&
        progress.milestones.temperatures);
    elements.reflectionFieldset.disabled = !unlocked;

    const missing = [];
    if (!progress.milestones.predictions) {
      missing.push(
        `${Math.max(0, 3 - progress.predictedScenarios)} predicció${
          3 - progress.predictedScenarios === 1 ? "" : "ns"
        }`,
      );
    }
    if (!progress.milestones.samples) {
      missing.push(
        `${Math.max(0, 10 - progress.sampleCount)} mostra${
          10 - progress.sampleCount === 1 ? "" : "s"
        }`,
      );
    }
    if (!progress.milestones.temperatures) {
      missing.push("mostres en una segona zona de temperatura");
    }
    elements.reflectionUnlockStatus.textContent = unlocked
      ? "Reflexió desbloquejada."
      : `Et falta: ${missing.join(", ")}.`;

    elements.reflectionForm
      .querySelectorAll('input[name="reflection"]')
      .forEach((input) => {
        input.checked = input.value === state.reflectionChoice;
      });

    if (!state.reflectionChoice) {
      elements.reflectionFeedback.hidden = true;
      elements.reflectionFeedback.textContent = "";
      elements.reflectionFeedback.className = "reflection-feedback";
      return;
    }

    elements.reflectionFeedback.hidden = false;
    elements.reflectionFeedback.className = `reflection-feedback ${
      state.reflectionCorrect ? "correct" : "incorrect"
    }`;
    elements.reflectionFeedback.textContent = state.reflectionCorrect
      ? "Correcte. La temperatura redistribueix la probabilitat usada per seleccionar; no modifica el coneixement après ni comprova la veritat."
      : "Encara no. La temperatura actua sobre la distribució de selecció. No afegeix coneixement i tampoc converteix la probabilitat en veritat.";
  }

  function renderCompletion() {
    const progress = Engine.calculateProgress(state);
    if (state.completed) {
      elements.completeButton.disabled = true;
      elements.completeButton.textContent = "Activitat completada";
      elements.completionHelp.textContent =
        "Has completat la predicció, el mostreig, la comparació i la reflexió.";
      if (completionAcknowledged) {
        elements.completionStatus.textContent =
          "Moodle ha confirmat la finalització. Ja pots tornar al curs.";
      } else if (
        window.parent &&
        window.parent !== window &&
        validParentOrigin()
      ) {
        elements.completionStatus.textContent =
          "Finalització enviada; esperant la confirmació de Moodle.";
      } else if (window.parent && window.parent !== window) {
        elements.completionStatus.textContent =
          "Finalització desada localment; no hi ha cap origen de Moodle validat per enviar-la.";
      } else {
        elements.completionStatus.textContent =
          "Finalització desada en aquest navegador.";
      }
      return;
    }

    elements.completeButton.disabled = !progress.readyToComplete;
    elements.completeButton.textContent = "Finalitza l'activitat";
    elements.completionHelp.textContent = progress.readyToComplete
      ? "Ja tens totes les evidències. Finalitza per registrar l'activitat."
      : "Completa les quatre evidències anteriors per habilitar la finalització.";
    elements.completionStatus.textContent = progress.readyToComplete
      ? "Preparada per finalitzar."
      : "Encara hi ha evidències pendents.";
  }

  function dispatchProgress() {
    const progress = Engine.calculateProgress(state);
    const payload = {
      type: "enti-widget-progress",
      widget: WIDGET_ID,
      version: VERSION,
      completionId: state.completionId,
      outcome: {
        completed: state.completed,
        completedMilestones: progress.completedCount,
        totalMilestones: progress.totalMilestones,
        predictedScenarios: progress.predictedScenarios,
        sampleCount: progress.sampleCount,
        temperatureBandCount: progress.temperatureBands.length,
        reflectionCorrect: state.reflectionCorrect,
      },
    };
    document.dispatchEvent(
      new CustomEvent("enti-widget-progress", { detail: payload }),
    );
  }

  function completionPayload() {
    const progress = Engine.calculateProgress(state);
    return {
      type: "enti-widget-complete",
      widget: WIDGET_ID,
      version: VERSION,
      outcome: {
        completed: true,
        predictedScenarios: progress.predictedScenarios,
        sampleCount: progress.sampleCount,
        temperatureBandCount: progress.temperatureBands.length,
        reflectionCorrect: state.reflectionCorrect,
        datasetVersion: Dataset.metadata.datasetVersion,
      },
    };
  }

  function emitCompletion({ dispatchDomEvent = true } = {}) {
    if (completionSentThisPage || !state.completed) return;
    const payload = completionPayload();
    if (dispatchDomEvent) {
      document.dispatchEvent(
        new CustomEvent("enti-widget-complete", { detail: payload }),
      );
    }
    postToParent(payload);
    completionSentThisPage = true;
  }

  function handleParentMessage(event) {
    if (!window.parent || event.source !== window.parent) return;
    const targetOrigin = validParentOrigin();
    if (!targetOrigin || event.origin !== targetOrigin) return;
    if (
      event.data?.type !== "enti-widget-complete-ack" ||
      event.data?.widget !== WIDGET_ID ||
      event.data?.version !== VERSION ||
      event.data?.completionId !== state.completionId
    ) {
      return;
    }
    completionAcknowledged = true;
    state.completionAcknowledged = true;
    saveState();
    renderCompletion();
    announce("Moodle ha confirmat la finalització de l'activitat.");
  }

  function setupResizeContract() {
    const emitResize = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      const payload = {
        type: "enti-widget-resize",
        widget: WIDGET_ID,
        version: VERSION,
        height,
      };
      document.dispatchEvent(
        new CustomEvent("enti-widget-resize", { detail: payload }),
      );
      postToParent(payload);
    };

    const schedule = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(emitResize, 100);
    };
    if ("ResizeObserver" in window) {
      new ResizeObserver(schedule).observe(document.documentElement);
    }
    window.addEventListener("load", schedule, { once: true });
  }

  function postToParent(payload) {
    if (!window.parent || window.parent === window) return;
    const targetOrigin = validParentOrigin();
    if (targetOrigin) window.parent.postMessage(payload, targetOrigin);
  }

  function validParentOrigin() {
    const configured = new URLSearchParams(window.location.search).get(
      "parentOrigin",
    );
    const candidates = [configured, document.referrer].filter(Boolean);
    for (const candidate of candidates) {
      try {
        const origin = new URL(candidate).origin;
        if (origin.startsWith("https://") || origin.startsWith("http://")) {
          return origin;
        }
      } catch {
        // Ignore invalid candidates and try the next trusted source.
      }
    }
    return null;
  }

  function createCompletionId() {
    if (window.crypto?.randomUUID) {
      return `b3-${window.crypto.randomUUID()}`;
    }
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      return `b3-${Array.from(values, (value) =>
        value.toString(16).padStart(8, "0"),
      ).join("")}`;
    }
    return `b3-${Date.now().toString(36)}-${Engine.hashString(
      `${state.seed}:${Date.now()}`,
    ).toString(36)}`;
  }

  function mostFrequentToken(histogram, scenario) {
    return scenario.candidates.reduce((best, candidate) => {
      const candidateCount = histogram[candidate.id] || 0;
      const bestCount = histogram[best.id] || 0;
      return candidateCount > bestCount ? candidate : best;
    }, scenario.candidates[0]);
  }

  function formatToken(text) {
    return String(text)
      .replaceAll(" ", "␠")
      .replaceAll("\n", "↵")
      .replaceAll("\t", "⇥");
  }

  function formatPercent(probability) {
    if (probability <= 0) return "0 %";
    if (probability < 0.001) return "< 0,1 %";
    const formatter =
      probability < 0.01 ? formatterTwoDecimals : formatterOneDecimal;
    return `${formatter.format(probability * 100)} %`;
  }

  function formatTemperature(temperature) {
    return formatterOneDecimal.format(Engine.clampTemperature(temperature));
  }

  function temperatureCopy(temperature) {
    const value = Engine.clampTemperature(temperature);
    if (value === 0) {
      return "Selecció greedy: sempre guanya el token més probable.";
    }
    if (value <= 0.7) {
      return "Distribució més concentrada: menys varietat, no més veritat.";
    }
    if (value <= 1.2) {
      return "A prop de la distribució base de la simulació.";
    }
    if (value <= 1.6) {
      return "Distribució més plana: augmenta la varietat de selecció.";
    }
    return "Distribució molt plana: fins i tot els tokens de cua guanyen pes.";
  }

  function shapeLabel(shape) {
    const labels = {
      concentrated: "Concentrada",
      mixed: "Mixta",
      dispersed: "Dispersa",
    };
    return labels[shape] || shape;
  }

  function announce(message) {
    statusSequence += 1;
    elements.activityStatus.textContent = `${message} (${statusSequence})`;
  }

  function showFatalError(message) {
    const main = document.getElementById("mainContent") || document.body;
    const box = document.createElement("section");
    box.className = "noscript";
    const title = document.createElement("h2");
    title.textContent = "No es pot iniciar l'activitat";
    const text = document.createElement("p");
    text.textContent = message;
    box.append(title, text);
    main.replaceChildren(box);
  }
})();
