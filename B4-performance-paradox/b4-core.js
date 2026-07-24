(function initB4Core(globalScope) {
  "use strict";

  const STATE_VERSION = 3;
  const MECHANIC_IDS = ["stacking", "critical"];
  const CONFIDENCE_VALUES = [1, 2, 3];
  const SCREENS = new Set([
    "intro",
    "baseline",
    "practice-intro",
    "practice",
    "transfer-intro",
    "transfer",
    "reliability-intro",
    "reliability-initial",
    "reliability-review",
    "reliability-feedback",
    "debrief",
    "reflection",
    "commitment",
    "complete",
  ]);

  const MECHANICS = {
    stacking: {
      id: "stacking",
      title: "Modificadors successius",
      shortTitle: "Reduccions successives",
      principle:
        "Cada percentatge s’aplica a la quantitat que queda, no a la quantitat inicial.",
      baseline: {
        id: "baseline-stacking",
        prompt:
          "Un personatge hauria de rebre 120 punts de dany. Té dues reduccions successives, primer del 20 % i després del 25 %. Quant dany rep finalment?",
        options: [
          { value: "a", label: "66 punts" },
          { value: "b", label: "72 punts" },
          { value: "c", label: "75 punts" },
          { value: "d", label: "90 punts" },
        ],
        correct: "b",
        explanation:
          "120 × 0,80 × 0,75 = 72. Les reduccions no se sumen perquè la segona actua sobre el que queda.",
      },
      practice: {
        prompt:
          "Un atac de 100 punts passa per una armadura que redueix un 20 % i després per un escut que redueix un 30 % addicional. Quant dany arriba al personatge?",
        workedSteps: [
          "Després de l’armadura: 100 × 0,80 = 80.",
          "Després de l’escut: 80 × 0,70 = 56.",
          "Resultat: el personatge rep 56 punts de dany.",
        ],
        check: {
          prompt: "Per què el resultat no és 50?",
          options: [
            {
              value: "a",
              label:
                "Perquè cal sumar els percentatges i aplicar-los dues vegades.",
            },
            {
              value: "b",
              label:
                "Perquè cada reducció s’aplica successivament a la quantitat que queda.",
            },
            {
              value: "c",
              label: "Perquè només compta la reducció més gran.",
            },
            {
              value: "d",
              label: "Perquè els percentatges no es poden combinar.",
            },
          ],
          correct: "b",
          hint: "Pregunta’t sobre quina quantitat actua el segon 30 %.",
        },
        guidedSteps: [
          {
            id: "after-first",
            label: "Dany després de la primera reducció del 20 %",
            options: [
              { value: "70", label: "70" },
              { value: "80", label: "80" },
              { value: "90", label: "90" },
            ],
            correct: "80",
            hint: "Conserves el 80 % de 100.",
          },
          {
            id: "after-second",
            label: "Dany després d’aplicar el 30 % al que queda",
            options: [
              { value: "50", label: "50" },
              { value: "56", label: "56" },
              { value: "70", label: "70" },
            ],
            correct: "56",
            hint: "Conserves el 70 % dels 80 punts que quedaven.",
          },
        ],
        solution: "100 × 0,80 × 0,70 = 56.",
      },
      transfer: {
        id: "transfer-stacking",
        prompt:
          "Un escut rep 160 punts de dany. Una habilitat els redueix un 25 % i una runa redueix un 20 % del que queda. Quant dany rep l’escut?",
        options: [
          { value: "a", label: "88 punts" },
          { value: "b", label: "96 punts" },
          { value: "c", label: "100 punts" },
          { value: "d", label: "120 punts" },
        ],
        correct: "b",
        explanation:
          "160 × 0,75 × 0,80 = 96. S’aplica cada factor de manera successiva.",
      },
    },
    critical: {
      id: "critical",
      title: "Dany esperat dels crítics",
      shortTitle: "Dany crític esperat",
      principle:
        "El dany esperat combina el DPS base amb la probabilitat i el guany addicional del crític.",
      baseline: {
        id: "baseline-critical",
        prompt:
          "Una arma fa 16 punts de dany, ataca 2 cops per segon i té un 25 % de probabilitat de fer el doble de dany. Quin és el seu DPS esperat?",
        options: [
          { value: "a", label: "32 DPS" },
          { value: "b", label: "36 DPS" },
          { value: "c", label: "40 DPS" },
          { value: "d", label: "64 DPS" },
        ],
        correct: "c",
        explanation:
          "El DPS base és 16 × 2 = 32. Un 25 % de crítics dobles afegeix un 25 % de mitjana: 32 × 1,25 = 40.",
      },
      practice: {
        prompt:
          "Una arma fa 20 punts de dany, ataca 2 cops per segon i té un 25 % de probabilitat de fer el doble de dany. Quin és el seu DPS esperat?",
        workedSteps: [
          "DPS sense crítics: 20 × 2 = 40.",
          "Multiplicador esperat: 1 + 0,25 × (2 − 1) = 1,25.",
          "DPS esperat: 40 × 1,25 = 50.",
        ],
        check: {
          prompt: "Què representa el multiplicador esperat 1,25 en aquest cas?",
          options: [
            {
              value: "a",
              label: "Que tots els atacs fan un 25 % menys de dany.",
            },
            {
              value: "b",
              label:
                "Que, a llarg termini, els crítics afegeixen un 25 % al DPS base.",
            },
            {
              value: "c",
              label:
                "Que un de cada quatre atacs sempre apareix en aquest ordre.",
            },
            {
              value: "d",
              label: "Que el DPS base s’ha de multiplicar per 2,25.",
            },
          ],
          correct: "b",
          hint: "Pensa en el guany mitjà que aporta un 25 % de probabilitat de duplicar.",
        },
        guidedSteps: [
          {
            id: "base-dps",
            label: "DPS sense comptar els crítics",
            options: [
              { value: "20", label: "20" },
              { value: "40", label: "40" },
              { value: "50", label: "50" },
            ],
            correct: "40",
            hint: "Multiplica el dany de cada atac pels atacs per segon.",
          },
          {
            id: "expected-factor",
            label: "Multiplicador mitjà dels crítics",
            options: [
              { value: "1.20", label: "1,20" },
              { value: "1.25", label: "1,25" },
              { value: "2.00", label: "2,00" },
            ],
            correct: "1.25",
            hint: "El 25 % dels cops aporta un 100 % addicional: 1 + 0,25 × 1.",
          },
          {
            id: "expected-dps",
            label: "DPS esperat final",
            options: [
              { value: "45", label: "45" },
              { value: "50", label: "50" },
              { value: "80", label: "80" },
            ],
            correct: "50",
            hint: "Multiplica el DPS base pel multiplicador mitjà.",
          },
        ],
        solution: "20 × 2 × [1 + 0,25 × (2 − 1)] = 50 DPS.",
      },
      transfer: {
        id: "transfer-critical",
        prompt:
          "Una arma fa 30 punts de dany, ataca 1,5 cops per segon i té un 20 % de probabilitat de fer el doble de dany. Quin és el seu DPS esperat?",
        options: [
          { value: "a", label: "45 DPS" },
          { value: "b", label: "50 DPS" },
          { value: "c", label: "54 DPS" },
          { value: "d", label: "60 DPS" },
        ],
        correct: "c",
        explanation:
          "El DPS base és 30 × 1,5 = 45. El multiplicador esperat és 1,20. Per tant, 45 × 1,20 = 54 DPS.",
      },
    },
  };

  const RELIABILITY = {
    id: "reliability-cooldown",
    prompt:
      "Una habilitat té 10 segons de recàrrega. Un objecte la redueix un 20 % i un talent redueix un 25 % addicional del temps que queda. Quina és la recàrrega final?",
    options: [
      { value: "a", label: "5,5 segons" },
      { value: "b", label: "6 segons" },
      { value: "c", label: "7 segons" },
      { value: "d", label: "8 segons" },
    ],
    correct: "b",
    assistantPick: "a",
    assistantText:
      "Les reduccions són del 20 % i del 25 %. En total redueixen un 45 %: 10 × 0,55 = 5,5 segons. És la manera estàndard d’acumular reducció de recàrrega.",
    verificationHint:
      "Converteix cada reducció en el factor que queda: 0,80 i 0,75. Després multiplica 10 × 0,80 × 0,75.",
    explanation:
      "La recomanació suma percentatges que actuen successivament. El càlcul correcte és 10 × 0,80 × 0,75 = 6 segons.",
  };

  const REFLECTION = {
    id: "reflection-transfer",
    prompt:
      "Has d’aprendre a depurar shaders per a una prova on no podràs usar IA. Quina estratègia protegeix millor l’aprenentatge?",
    options: [
      {
        value: "a",
        label:
          "Demanar la solució completa i guardar-la per poder-la reutilitzar.",
      },
      {
        value: "b",
        label:
          "Intentar-ho, demanar pistes, explicar el procediment i fer una comprovació final sense IA.",
      },
      {
        value: "c",
        label:
          "Comparar dues respostes d’IA i quedar-se amb la que soni més segura.",
      },
      {
        value: "d",
        label:
          "Usar la IA només per acabar més de pressa, perquè velocitat i aprenentatge són equivalents.",
      },
    ],
    correct: "b",
    explanation:
      "La combinació d’intent propi, pistes, explicació i recuperació sense ajuda manté el treball cognitiu en mans de l’aprenent.",
  };

  const GUARDRAILS = [
    {
      id: "attempt-first",
      title: "Intentaré abans de preguntar",
      description: "Faré un primer intent real abans d’obrir l’assistent.",
    },
    {
      id: "hints-first",
      title: "Demanaré pistes, no la resposta",
      description:
        "Faré que l’assistent em guiï sense resoldre la tasca per mi.",
    },
    {
      id: "explain-back",
      title: "Ho explicaré amb paraules meves",
      description:
        "Comprovaré que puc reconstruir el procediment, no només reconèixer-lo.",
    },
    {
      id: "verify",
      title: "Verificaré abans d’acceptar",
      description:
        "Comprovaré càlculs, fonts i supòsits de manera independent.",
    },
    {
      id: "no-ai-check",
      title: "Acabaré amb una prova sense IA",
      description: "Em posaré un problema nou i el resoldré sense l’eina.",
    },
  ];

  const PROGRESS_STEPS = [
    "Punt de partida",
    "Pràctica amb IA",
    "Transferència",
    "Fiabilitat",
    "Debrief",
  ];

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value))
      return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  deepFreeze(MECHANICS);
  deepFreeze(RELIABILITY);
  deepFreeze(REFLECTION);
  deepFreeze(GUARDRAILS);

  function normaliseSeed(seed) {
    const numeric = Number(seed);
    if (!Number.isSafeInteger(numeric) || numeric < 0) return 0;
    return numeric;
  }

  function variantFromSeed(seed) {
    return normaliseSeed(seed) % 2 === 0 ? "a" : "b";
  }

  function questionOrder(variant) {
    return variant === "b"
      ? ["critical", "stacking"]
      : ["stacking", "critical"];
  }

  function practiceSequence(variant) {
    return variant === "b"
      ? [
          { mechanicId: "stacking", mode: "guided" },
          { mechanicId: "critical", mode: "direct" },
        ]
      : [
          { mechanicId: "stacking", mode: "direct" },
          { mechanicId: "critical", mode: "guided" },
        ];
  }

  function practiceModeFor(variant, mechanicId) {
    return (
      practiceSequence(variant).find((entry) => entry.mechanicId === mechanicId)
        ?.mode || "direct"
    );
  }

  function blankPracticeRecord(mode) {
    return {
      mode,
      attempts: 0,
      complete: false,
      lastAnswer: null,
      lastSteps: {},
    };
  }

  function createInitialState(seed = 0, forcedVariant) {
    const safeSeed = normaliseSeed(seed);
    const variant =
      forcedVariant === "a" || forcedVariant === "b"
        ? forcedVariant
        : variantFromSeed(safeSeed);
    return {
      version: STATE_VERSION,
      seed: safeSeed,
      variant,
      screen: "intro",
      baselineIndex: 0,
      baseline: {},
      practiceIndex: 0,
      practice: {
        stacking: blankPracticeRecord(practiceModeFor(variant, "stacking")),
        critical: blankPracticeRecord(practiceModeFor(variant, "critical")),
      },
      transferIndex: 0,
      transfer: {},
      reliability: {
        initial: null,
        final: null,
        hintOpened: false,
      },
      reflection: {
        answer: null,
        attempts: 0,
        correct: false,
      },
      guardrail: null,
      completed: false,
    };
  }

  function validAnswer(question, answer) {
    return question.options.some((option) => option.value === answer);
  }

  function sanitiseAnswerRecord(record, question) {
    if (!record || typeof record !== "object") return null;
    if (!validAnswer(question, record.answer)) return null;
    if (!CONFIDENCE_VALUES.includes(Number(record.confidence))) return null;
    return {
      answer: record.answer,
      confidence: Number(record.confidence),
    };
  }

  function boundedInteger(value, max) {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) return 0;
    return Math.min(numeric, max);
  }

  function sanitiseState(raw) {
    if (!raw || typeof raw !== "object" || raw.version !== STATE_VERSION)
      return null;
    if (raw.variant !== "a" && raw.variant !== "b") return null;
    if (!SCREENS.has(raw.screen)) return null;

    const state = createInitialState(raw.seed, raw.variant);
    state.screen = raw.screen;
    state.baselineIndex = boundedInteger(raw.baselineIndex, 2);
    state.practiceIndex = boundedInteger(raw.practiceIndex, 2);
    state.transferIndex = boundedInteger(raw.transferIndex, 2);

    for (const mechanicId of MECHANIC_IDS) {
      const mechanic = MECHANICS[mechanicId];
      const baselineRecord = sanitiseAnswerRecord(
        raw.baseline?.[mechanicId],
        mechanic.baseline,
      );
      const transferRecord = sanitiseAnswerRecord(
        raw.transfer?.[mechanicId],
        mechanic.transfer,
      );
      if (baselineRecord) state.baseline[mechanicId] = baselineRecord;
      if (transferRecord) state.transfer[mechanicId] = transferRecord;

      const sourcePractice = raw.practice?.[mechanicId];
      const targetPractice = state.practice[mechanicId];
      if (sourcePractice && typeof sourcePractice === "object") {
        targetPractice.attempts = boundedInteger(sourcePractice.attempts, 99);
        targetPractice.complete = Boolean(sourcePractice.complete);
        if (validAnswer(mechanic.practice.check, sourcePractice.lastAnswer)) {
          targetPractice.lastAnswer = sourcePractice.lastAnswer;
        }
        if (
          sourcePractice.lastSteps &&
          typeof sourcePractice.lastSteps === "object"
        ) {
          for (const step of mechanic.practice.guidedSteps) {
            const value = sourcePractice.lastSteps[step.id];
            if (step.options.some((option) => option.value === value)) {
              targetPractice.lastSteps[step.id] = value;
            }
          }
        }
      }
    }

    state.reliability.initial = sanitiseAnswerRecord(
      raw.reliability?.initial,
      RELIABILITY,
    );
    state.reliability.final = sanitiseAnswerRecord(
      raw.reliability?.final,
      RELIABILITY,
    );
    state.reliability.hintOpened = Boolean(raw.reliability?.hintOpened);

    if (validAnswer(REFLECTION, raw.reflection?.answer)) {
      state.reflection.answer = raw.reflection.answer;
    }
    state.reflection.attempts = boundedInteger(raw.reflection?.attempts, 99);
    state.reflection.correct =
      state.reflection.answer === REFLECTION.correct &&
      Boolean(raw.reflection?.correct);

    if (GUARDRAILS.some((guardrail) => guardrail.id === raw.guardrail)) {
      state.guardrail = raw.guardrail;
    }
    state.completed = Boolean(raw.completed);
    return state;
  }

  function questionIsCorrect(question, record) {
    return Boolean(record && record.answer === question.correct);
  }

  function scorePhase(state, phase) {
    if (phase !== "baseline" && phase !== "transfer") return 0;
    return MECHANIC_IDS.reduce((score, mechanicId) => {
      const question = MECHANICS[mechanicId][phase];
      return (
        score + (questionIsCorrect(question, state[phase][mechanicId]) ? 1 : 0)
      );
    }, 0);
  }

  function mechanicOutcome(state, mechanicId) {
    const mechanic = MECHANICS[mechanicId];
    return {
      mechanicId,
      mode: practiceModeFor(state.variant, mechanicId),
      baselineCorrect: questionIsCorrect(
        mechanic.baseline,
        state.baseline[mechanicId],
      ),
      transferCorrect: questionIsCorrect(
        mechanic.transfer,
        state.transfer[mechanicId],
      ),
      practiceAttempts: state.practice[mechanicId].attempts,
    };
  }

  function reliabilityOutcome(state) {
    const initial = state.reliability.initial?.answer;
    const final = state.reliability.final?.answer;
    if (!initial || !final) return "incomplete";
    if (final === RELIABILITY.correct) {
      if (initial === RELIABILITY.correct) return "held-correct";
      if (initial === RELIABILITY.assistantPick)
        return "corrected-after-agreeing";
      return "recovered-correct";
    }
    if (final === RELIABILITY.assistantPick) {
      if (initial === RELIABILITY.correct) return "swayed-from-correct";
      if (initial === RELIABILITY.assistantPick) return "agreed-throughout";
      return "moved-to-assistant";
    }
    return "other-error";
  }

  function calibrationSummary(state) {
    const records = MECHANIC_IDS.map((mechanicId) => ({
      question: MECHANICS[mechanicId].transfer,
      record: state.transfer[mechanicId],
    }));
    if (state.reliability.final) {
      records.push({
        question: RELIABILITY,
        record: state.reliability.final,
      });
    }
    return records.reduce(
      (summary, entry) => {
        if (!entry.record) return summary;
        const correct = questionIsCorrect(entry.question, entry.record);
        summary.total += 1;
        if (correct) summary.correct += 1;
        if (!correct && entry.record.confidence === 3)
          summary.highConfidenceErrors += 1;
        if (correct && entry.record.confidence === 1)
          summary.lowConfidenceCorrect += 1;
        return summary;
      },
      {
        total: 0,
        correct: 0,
        highConfidenceErrors: 0,
        lowConfidenceCorrect: 0,
      },
    );
  }

  function progressForState(state) {
    const mapping = {
      intro: { step: 0, percent: 0 },
      baseline: {
        step: 1,
        percent: 6 + Math.min(state.baselineIndex, 2) * 7,
      },
      "practice-intro": { step: 2, percent: 22 },
      practice: {
        step: 2,
        percent: 28 + Math.min(state.practiceIndex, 2) * 11,
      },
      "transfer-intro": { step: 3, percent: 50 },
      transfer: {
        step: 3,
        percent: 55 + Math.min(state.transferIndex, 2) * 7,
      },
      "reliability-intro": { step: 4, percent: 70 },
      "reliability-initial": { step: 4, percent: 73 },
      "reliability-review": { step: 4, percent: 77 },
      "reliability-feedback": { step: 4, percent: 81 },
      debrief: { step: 5, percent: 87 },
      reflection: { step: 5, percent: 92 },
      commitment: { step: 5, percent: 97 },
      complete: { step: 5, percent: 100 },
    };
    const progress = mapping[state.screen] || mapping.intro;
    return {
      step: progress.step,
      percent: progress.percent,
      label:
        progress.step === 0 ? "Introducció" : PROGRESS_STEPS[progress.step - 1],
    };
  }

  function optionLabel(question, value) {
    return (
      question.options.find((option) => option.value === value)?.label || ""
    );
  }

  const api = {
    STATE_VERSION,
    MECHANIC_IDS,
    MECHANICS,
    RELIABILITY,
    REFLECTION,
    GUARDRAILS,
    PROGRESS_STEPS,
    createInitialState,
    sanitiseState,
    questionOrder,
    practiceSequence,
    practiceModeFor,
    validAnswer,
    questionIsCorrect,
    scorePhase,
    mechanicOutcome,
    reliabilityOutcome,
    calibrationSummary,
    progressForState,
    optionLabel,
  };

  globalScope.B4Core = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
