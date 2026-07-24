(function initScenarioData(root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = data;
  } else {
    root.B3ScenarioData = data;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildScenarioData() {
    "use strict";

    const metadata = Object.freeze({
      schemaVersion: 1,
      datasetVersion: "2026.07.24",
      mode: "didactic-simulation",
      generatedAt: "2026-07-24",
      tokenizer: Object.freeze({
        id: "o200k_base",
        implementation: "gpt-tokenizer",
        implementationVersion: "3.4.0",
      }),
      license: "MIT",
      contentDigestAlgorithm: "sha256",
      contentDigest:
        "b4a6ea78f8e7fd4702b78dbb8e90413bcf796ca2832bb9c26574aaa228d6fba2",
      probabilityMethod:
        "Distribucions construïdes per a l'aprenentatge sobre un vocabulari tancat de tokens reals.",
    });

    const scenarios = [
      {
        id: "proverb-ca",
        order: 1,
        core: true,
        language: "ca",
        shape: "concentrated",
        purpose: "mechanics",
        title: "Una dita molt restringida",
        shortTitle: "Dita popular",
        eyebrow: "Context concentrat",
        prompt: "Tant va el càntir a la",
        promptTokens: [
          { id: 51, text: "T" },
          { id: 493, text: "ant" },
          { id: 3423, text: " va" },
          { id: 650, text: " el" },
          { id: 77949, text: " cà" },
          { id: 578, text: "nt" },
          { id: 380, text: "ir" },
          { id: 261, text: " a" },
          { id: 557, text: " la" },
        ],
        predictionPrompt:
          "Quin token esperes que tingui més probabilitat després d'aquest context?",
        predictionTokenIds: [5109, 38815, 10859],
        candidates: [
          { id: 5109, text: " font", probability: 0.8 },
          { id: 38815, text: " porta", probability: 0.05 },
          { id: 10859, text: " casa", probability: 0.04 },
          { id: 165070, text: " plaça", probability: 0.03 },
          { id: 51164, text: " boca", probability: 0.025 },
          { id: 29023, text: " terra", probability: 0.02 },
          { id: 110141, text: " ciutat", probability: 0.012 },
          { id: 50858, text: " escola", probability: 0.01 },
          { id: 94852, text: " biblioteca", probability: 0.008 },
          { id: 5241, text: " pou", probability: 0.005 },
        ],
        lessonTitle: "El context pot concentrar molt la distribució",
        lesson:
          "En aquesta simulació, el token «␠font» concentra la major part de la massa. Una seqüència molt familiar restringeix fortament les continuacions plausibles. Això no demostra comprensió ni ens permet saber quantes vegades apareixia al corpus d'entrenament.",
      },
      {
        id: "creative-ca",
        order: 2,
        core: true,
        language: "ca",
        shape: "dispersed",
        purpose: "creative",
        title: "Una porta que obre possibilitats",
        shortTitle: "Obertura narrativa",
        eyebrow: "Context obert",
        prompt: "Quan vaig obrir la porta vaig veure",
        promptTokens: [
          { id: 119117, text: "Quan" },
          { id: 127368, text: " vaig" },
          { id: 1067, text: " ob" },
          { id: 16883, text: "rir" },
          { id: 557, text: " la" },
          { id: 38815, text: " porta" },
          { id: 127368, text: " vaig" },
          { id: 99273, text: " veure" },
        ],
        predictionPrompt:
          "Quin token creus que liderarà una continuació tan oberta?",
        predictionTokenIds: [537, 1969, 661],
        candidates: [
          { id: 537, text: " un", probability: 0.22 },
          { id: 1969, text: " una", probability: 0.19 },
          { id: 661, text: " que", probability: 0.14 },
          { id: 557, text: " la", probability: 0.09 },
          { id: 650, text: " el", probability: 0.08 },
          { id: 3406, text: " dos", probability: 0.06 },
          { id: 2417, text: " tot", probability: 0.055 },
          { id: 694, text: " res", probability: 0.05 },
          { id: 13043, text: " sang", probability: 0.04 },
          { id: 45109, text: " fum", probability: 0.03 },
          { id: 31975, text: " gat", probability: 0.025 },
          { id: 2237, text: " home", probability: 0.02 },
        ],
        lessonTitle:
          "La creativitat comença sovint amb tokens poc espectaculars",
        lesson:
          "Articles, pronoms i connectors ocupen bona part de la massa. El token següent encara no conté tota la idea narrativa: la direcció emergeix després de repetir predicció, selecció i recàlcul moltes vegades.",
      },
      {
        id: "truth-en",
        order: 3,
        core: true,
        language: "en",
        shape: "mixed",
        purpose: "factuality",
        title: "Probabilitat no vol dir veritat",
        shortTitle: "Factualitat",
        eyebrow: "Contranarrativa factual",
        prompt: "The capital of Australia is",
        promptTokens: [
          { id: 976, text: "The" },
          { id: 9029, text: " capital" },
          { id: 328, text: " of" },
          { id: 11930, text: " Australia" },
          { id: 382, text: " is" },
        ],
        predictionPrompt:
          "Quin token esperes que la simulació hagi situat al capdamunt?",
        predictionTokenIds: [134455, 31677, 39178],
        candidates: [
          { id: 31677, text: " Sydney", probability: 0.4 },
          { id: 134455, text: " Canberra", probability: 0.34 },
          { id: 39178, text: " Melbourne", probability: 0.07 },
          { id: 73716, text: " Brisbane", probability: 0.05 },
          { id: 76207, text: " Perth", probability: 0.03 },
          { id: 290, text: " the", probability: 0.025 },
          { id: 84976, text: " Adelaide", probability: 0.02 },
          { id: 7567, text: " located", probability: 0.02 },
          { id: 261, text: " a", probability: 0.015 },
          { id: 306, text: " in", probability: 0.01 },
          { id: 4771, text: " actually", probability: 0.01 },
          { id: 625, text: " not", probability: 0.01 },
        ],
        lessonTitle: "La probabilitat del token no és una puntuació de veritat",
        lesson:
          "Aquesta distribució s'ha construït expressament amb «␠Sydney» per davant de «␠Canberra», tot i que la capital real és Canberra. Baixar la temperatura faria més estable l'error; no verificaria el fet.",
      },
      {
        id: "representation-en",
        order: 4,
        core: false,
        language: "en",
        shape: "mixed",
        purpose: "representation",
        title: "Quan una distribució conté un estereotip",
        shortTitle: "Representació",
        eyebrow: "Distribució hipotètica",
        prompt: "The lead programmer entered the room and",
        promptTokens: [
          { id: 976, text: "The" },
          { id: 4124, text: " lead" },
          { id: 72896, text: " programmer" },
          { id: 18375, text: " entered" },
          { id: 290, text: " the" },
          { id: 3435, text: " room" },
          { id: 326, text: " and" },
        ],
        predictionPrompt:
          "Quin pronom creus que domina aquesta distribució hipotètica?",
        predictionTokenIds: [501, 1770, 1023],
        candidates: [
          { id: 501, text: " he", probability: 0.32 },
          { id: 1023, text: " they", probability: 0.18 },
          { id: 2059, text: " said", probability: 0.14 },
          { id: 290, text: " the", probability: 0.09 },
          { id: 7747, text: " asked", probability: 0.07 },
          { id: 10802, text: " looked", probability: 0.05 },
          { id: 1770, text: " she", probability: 0.05 },
          { id: 52846, text: " smiled", probability: 0.04 },
          { id: 10377, text: " began", probability: 0.025 },
          { id: 10139, text: " sat", probability: 0.015 },
          { id: 11297, text: " announced", probability: 0.012 },
          { id: 24461, text: " spoke", probability: 0.008 },
        ],
        lessonTitle: "El mostreig reprodueix els desequilibris que rep",
        lesson:
          "Aquesta distribució és hipotètica: no mesura cap model real. Serveix per veure la mecànica. Si una distribució assigna molta més massa a un pronom, el mostreig en reproduirà el desequilibri. La temperatura pot modular-lo, però no és una correcció de biaix.",
      },
      {
        id: "opening-ca",
        order: 5,
        core: false,
        language: "ca",
        shape: "dispersed",
        purpose: "temperature",
        title: "Una obertura amb molts camins",
        shortTitle: "Temperatura",
        eyebrow: "Distribució dispersa",
        prompt: "Un cop, fa molt de temps,",
        promptTokens: [
          { id: 2265, text: "Un" },
          { id: 8039, text: " cop" },
          { id: 11, text: "," },
          { id: 2229, text: " fa" },
          { id: 45559, text: " molt" },
          { id: 334, text: " de" },
          { id: 11160, text: " temps" },
          { id: 11, text: "," },
        ],
        predictionPrompt:
          "Quin token pot liderar quan moltes continuacions són plausibles?",
        predictionTokenIds: [5911, 1969, 469],
        candidates: [
          { id: 5911, text: " hi", probability: 0.18 },
          { id: 1969, text: " una", probability: 0.15 },
          { id: 469, text: " en", probability: 0.13 },
          { id: 537, text: " un", probability: 0.11 },
          { id: 12576, text: " els", probability: 0.1 },
          { id: 3423, text: " va", probability: 0.09 },
          { id: 39125, text: " havia", probability: 0.08 },
          { id: 31110, text: " quan", probability: 0.06 },
          { id: 2417, text: " tot", probability: 0.055 },
          { id: 13308, text: " sempre", probability: 0.045 },
        ],
        lessonTitle: "La temperatura és més visible en distribucions obertes",
        lesson:
          "Quan moltes opcions parteixen de probabilitats semblants, concentrar o aplanar la distribució canvia molt les freqüències observades. La temperatura modifica com seleccionem; no afegeix coneixement al model.",
      },
    ];

    return Object.freeze({
      metadata,
      scenarios: Object.freeze(scenarios),
    });
  },
);
