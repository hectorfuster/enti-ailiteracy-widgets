export const WIDGET_ID = "B9-declaracio-compatible";
export const WIDGET_VERSION = "2.1.0";

export const ACTIVITY_CONVENTION = Object.freeze({
  id: "b9-activity-convention",
  version: "2026-07-24",
  title: "Convenció didàctica de l'activitat B9",
  disclaimer:
    "Aquesta és una convenció de pràctica, no una política institucional. La consigna de cada assignatura sempre té prioritat.",
  requiredGroupIds: ["tool", "purpose", "extent", "human"],
});

export const OPENING_DECLARATION =
  "He fet servir IA per ajudar-me amb el document.";

export const WORLDS = Object.freeze([
  {
    id: "proofread",
    title: "Corrector ortogràfic",
    description:
      "Va escriure tot el document i va acceptar correccions ortogràfiques suggerides per una eina d'IA.",
    profile: {
      purpose: "proofread",
      usedInSubmission: true,
      contribution: "spelling-only",
      humanRole: "authored-all-accepted-corrections",
    },
  },
  {
    id: "brainstorm",
    title: "Pluja d'idees prèvia",
    description:
      "Va explorar idees amb l'eina abans de redactar, va descartar-ne la sortida i va escriure tot el document.",
    profile: {
      purpose: "brainstorm",
      usedInSubmission: false,
      contribution: "discarded-ideas",
      humanRole: "authored-all-discarded-output",
    },
  },
  {
    id: "full-draft",
    title: "Document sencer generat",
    description:
      "Va demanar un esborrany complet del document i només hi va fer canvis menors.",
    profile: {
      purpose: "generate-document",
      usedInSubmission: true,
      contribution: "full-draft",
      humanRole: "lightly-edited-full-draft",
    },
  },
  {
    id: "outline-own-text",
    title: "Estructura generada, text propi",
    description:
      "Va demanar tres propostes d'estructura, en va combinar i reorganitzar una, i va escriure tot el text final.",
    profile: {
      purpose: "structure",
      usedInSubmission: true,
      contribution: "outline-only",
      humanRole: "reorganized-outline-authored-text",
    },
  },
  {
    id: "translation",
    title: "Traducció",
    description:
      "Va escriure el document en català, en va generar una traducció anglesa i va revisar-ne la terminologia.",
    profile: {
      purpose: "translate",
      usedInSubmission: true,
      contribution: "full-translation",
      humanRole: "authored-source-reviewed-translation",
    },
  },
  {
    id: "design-consultation",
    title: "Consultes de disseny",
    description:
      "Va fer preguntes sobre disseny de nivells, va aplicar algun consell i no va copiar cap text de l'eina.",
    profile: {
      purpose: "consult-design",
      usedInSubmission: false,
      contribution: "advice-only",
      humanRole: "authored-all-used-advice",
    },
  },
  {
    id: "generated-sections",
    title: "Dues seccions generades",
    description:
      "Va generar les seccions 2 i 4, les va conservar gairebé sense canvis i va escriure la resta.",
    profile: {
      purpose: "generate-sections",
      usedInSubmission: true,
      contribution: "sections-2-4",
      humanRole: "retained-generated-sections",
    },
  },
  {
    id: "outline-and-section",
    title: "Estructura i una secció",
    description:
      "Va generar l'estructura i la secció 4, va reorganitzar l'estructura i va retocar lleument la secció.",
    profile: {
      purpose: "outline-and-section",
      usedInSubmission: true,
      contribution: "outline-and-section-4",
      humanRole: "reorganized-outline-lightly-edited-section",
    },
  },
]);

const ALL_HUMAN_ROLES = WORLDS.map((world) => world.profile.humanRole);

export const DISCLOSURE_GROUPS = Object.freeze([
  {
    id: "tool",
    stepLabel: "L'eina",
    legend: "1. Identifica l'ús d'IA",
    help:
      "Dir que hi ha hagut IA és imprescindible en aquesta activitat. El producte, el mode o la data poden afegir procedència, però no expliquen per si sols el procés.",
    required: true,
    options: [
      {
        id: "tool-none",
        label: "No dir-ho",
        sentence: "",
        where: {},
        fulfills: false,
        explanation: "Sense una menció explícita, el text no és una declaració d'ús d'IA.",
      },
      {
        id: "tool-generic",
        label: "«una eina d'IA generativa»",
        sentence: "He fet servir una eina d'IA generativa.",
        where: {},
        fulfills: true,
        explanation:
          "Declara l'ús, però no aporta procedència sobre el producte o el moment.",
      },
      {
        id: "tool-provenance",
        label: "«ChatGPT al web, juliol de 2026; model no registrat»",
        sentence:
          "He fet servir ChatGPT al web el juliol de 2026; no vaig registrar quin model exacte estava actiu.",
        where: {},
        fulfills: true,
        explanation:
          "Afegeix procedència amb honestedat. No separa els vuit casos perquè tots comparteixen aquesta dada en el conjunt de prova.",
      },
    ],
  },
  {
    id: "purpose",
    stepLabel: "La finalitat",
    legend: "2. Explica per a què",
    help:
      "La finalitat descriu la tasca concreta. «Ajudar-me» és cert en molts casos, però encara deixa gairebé tot per saber.",
    required: true,
    options: [
      {
        id: "purpose-none",
        label: "No dir-ho",
        sentence: "",
        where: {},
        fulfills: false,
        explanation: "Falta explicar quina tasca es va delegar o compartir amb l'eina.",
      },
      {
        id: "purpose-vague",
        label: "«per ajudar-me amb el document»",
        sentence:
          "La finalitat de l'ús d'IA era ajudar-me amb el document.",
        where: {},
        fulfills: true,
        vague: true,
        explanation:
          "Completa el camp, però no diferencia cap dels casos de prova.",
      },
      {
        id: "purpose-proofread",
        label: "«per corregir l'ortografia»",
        sentence:
          "La finalitat de l'ús d'IA era corregir l'ortografia del text.",
        where: { purpose: ["proofread"] },
        fulfills: true,
        explanation: "Descriu una correcció formal, no generació de contingut.",
      },
      {
        id: "purpose-brainstorm",
        label: "«per explorar idees abans de redactar»",
        sentence:
          "La finalitat de l'ús d'IA era explorar idees abans de redactar.",
        where: { purpose: ["brainstorm"] },
        fulfills: true,
        explanation: "Situa l'ús en la fase d'ideació.",
      },
      {
        id: "purpose-full-draft",
        label: "«per generar un esborrany complet»",
        sentence:
          "La finalitat de l'ús d'IA era generar un esborrany complet del document.",
        where: { purpose: ["generate-document"] },
        fulfills: true,
        explanation: "Declara generació de principi a fi.",
      },
      {
        id: "purpose-structure",
        label: "«per proposar estructures»",
        sentence:
          "La finalitat de l'ús d'IA era proposar estructures per al document.",
        where: { purpose: ["structure", "outline-and-section"] },
        fulfills: true,
        explanation:
          "Diferencia el treball sobre l'estructura, però encara no diu si també es va generar text.",
      },
      {
        id: "purpose-translate",
        label: "«per traduir el meu text»",
        sentence:
          "La finalitat de l'ús d'IA era traduir a l'anglès un text que jo havia escrit en català.",
        where: { purpose: ["translate"] },
        fulfills: true,
        explanation: "Identifica una transformació lingüística del text propi.",
      },
      {
        id: "purpose-consult",
        label: "«per consultar dubtes de disseny»",
        sentence:
          "La finalitat de l'ús d'IA era consultar dubtes de disseny de nivells.",
        where: { purpose: ["consult-design"] },
        fulfills: true,
        explanation: "Descriu assessorament, no generació de text per al lliurament.",
      },
      {
        id: "purpose-sections",
        label: "«per generar text d'una o més seccions concretes»",
        sentence:
          "La finalitat de l'ús d'IA era generar text per a una o més seccions concretes.",
        where: { purpose: ["generate-sections", "outline-and-section"] },
        fulfills: true,
        explanation:
          "Declara generació parcial; encara cal concretar quines parts.",
      },
    ],
  },
  {
    id: "extent",
    stepLabel: "L'abast",
    legend: "3. Delimita què va afectar",
    help:
      "Indica la fase, l'artefacte i l'abast. Aquesta dada evita que «al document» amagui diferències importants.",
    required: true,
    options: [
      {
        id: "extent-none",
        label: "No dir-ho",
        sentence: "",
        where: {},
        fulfills: false,
        explanation: "Falta delimitar quina part o fase va rebre la contribució d'IA.",
      },
      {
        id: "extent-document",
        label: "«va afectar el document lliurat»",
        sentence: "La intervenció d'IA va afectar el document lliurat.",
        where: { usedInSubmission: [true] },
        fulfills: true,
        vague: true,
        explanation:
          "És cert, però encara agrupa correcció, estructura, traducció i generació.",
      },
      {
        id: "extent-spelling",
        label: "«només les correccions ortogràfiques»",
        sentence:
          "La intervenció d'IA es va limitar a suggeriments ortogràfics sobre el text final.",
        where: { contribution: ["spelling-only"] },
        fulfills: true,
        explanation: "Delimita una intervenció formal i local.",
      },
      {
        id: "extent-no-output",
        label: "«cap fragment de la sortida no s'hi va incorporar directament»",
        sentence:
          "Cap fragment de la sortida de l'eina no es va incorporar directament al lliurament.",
        where: { usedInSubmission: [false] },
        fulfills: true,
        explanation:
          "Separa l'ús previ o consultiu de la incorporació directa de sortides.",
      },
      {
        id: "extent-full-draft",
        label: "«tot l'esborrany va ser generat»",
        sentence:
          "La intervenció d'IA va produir l'esborrany complet del document.",
        where: { contribution: ["full-draft"] },
        fulfills: true,
        explanation: "Declara que l'abast generat cobreix el document sencer.",
      },
      {
        id: "extent-outline-only",
        label: "«només l'estructura; cap paràgraf final»",
        sentence:
          "La intervenció d'IA es va limitar a propostes d'estructura; cap paràgraf del text final no va ser generat.",
        where: { contribution: ["outline-only"] },
        fulfills: true,
        explanation:
          "Diferencia amb precisió una bastida estructural del text final.",
      },
      {
        id: "extent-translation",
        label: "«la traducció anglesa de tot el text»",
        sentence:
          "La intervenció d'IA va produir una traducció anglesa de tot el text català.",
        where: { contribution: ["full-translation"] },
        fulfills: true,
        explanation: "Delimita la llengua, la transformació i l'abast complet.",
      },
      {
        id: "extent-sections",
        label: "«el text de les seccions 2 i 4»",
        sentence:
          "La intervenció d'IA va produir el text de les seccions 2 i 4.",
        where: { contribution: ["sections-2-4"] },
        fulfills: true,
        explanation: "Identifica exactament quines parts contenen text generat.",
      },
      {
        id: "extent-outline-section",
        label: "«l'estructura i el text de la secció 4»",
        sentence:
          "La intervenció d'IA va produir l'estructura i el text de la secció 4.",
        where: { contribution: ["outline-and-section-4"] },
        fulfills: true,
        explanation: "Separa dos tipus de contribució dins del mateix document.",
      },
    ],
  },
  {
    id: "human",
    stepLabel: "La teva contribució",
    legend: "4. Explica què vas fer tu",
    help:
      "«Ho he revisat» és difícil d'auditar. Digues què vas escriure, canviar, descartar o comprovar.",
    required: true,
    options: [
      {
        id: "human-none",
        label: "No dir-ho",
        sentence: "",
        where: {},
        fulfills: false,
        explanation: "Falta descriure la contribució o la verificació humana.",
      },
      {
        id: "human-reviewed",
        label: "«ho vaig revisar»",
        sentence: "Vaig revisar el resultat de l'eina.",
        where: { humanRole: ALL_HUMAN_ROLES },
        fulfills: true,
        vague: true,
        explanation:
          "És compatible amb tots els casos i no explica què es va comprovar o canviar.",
      },
      {
        id: "human-authored-all",
        label: "«vaig escriure tot el text final»",
        sentence: "Jo vaig escriure tot el text final.",
        where: {
          humanRole: [
            "authored-all-accepted-corrections",
            "authored-all-discarded-output",
            "reorganized-outline-authored-text",
            "authored-all-used-advice",
          ],
        },
        fulfills: true,
        explanation:
          "Aclareix l'autoria del text, però encara no descriu com es va usar la sortida.",
      },
      {
        id: "human-proofread",
        label: "«vaig escriure el text i acceptar correccions una per una»",
        sentence:
          "Jo vaig escriure tot el text i vaig acceptar les correccions ortogràfiques una per una.",
        where: { humanRole: ["authored-all-accepted-corrections"] },
        fulfills: true,
        explanation: "Descriu autoria i decisió humana sobre cada correcció.",
      },
      {
        id: "human-brainstorm",
        label: "«vaig descartar les idees i escriure el document»",
        sentence:
          "Jo vaig descartar la sortida de la pluja d'idees i vaig escriure tot el document.",
        where: { humanRole: ["authored-all-discarded-output"] },
        fulfills: true,
        explanation: "Explica què es va fer amb la sortida i qui va redactar.",
      },
      {
        id: "human-full-draft",
        label: "«només hi vaig fer canvis menors»",
        sentence:
          "Jo només vaig fer canvis menors sobre l'esborrany complet generat.",
        where: { humanRole: ["lightly-edited-full-draft"] },
        fulfills: true,
        explanation: "No infla una revisió lleu fins a convertir-la en autoria.",
      },
      {
        id: "human-outline",
        label: "«vaig reorganitzar l'estructura i escriure tot el text»",
        sentence:
          "Jo vaig combinar i reorganitzar una proposta d'estructura i vaig escriure tot el text final.",
        where: { humanRole: ["reorganized-outline-authored-text"] },
        fulfills: true,
        explanation: "Descriu la transformació de la bastida i l'autoria del text.",
      },
      {
        id: "human-translation",
        label: "«vaig escriure l'original i revisar la terminologia»",
        sentence:
          "Jo vaig escriure l'original català i vaig revisar la terminologia de la traducció anglesa.",
        where: { humanRole: ["authored-source-reviewed-translation"] },
        fulfills: true,
        explanation: "Separa l'autoria de l'original de la revisió de la traducció.",
      },
      {
        id: "human-consult",
        label: "«vaig aplicar consells sense copiar-ne el text»",
        sentence:
          "Jo vaig aplicar alguns consells de disseny, però no vaig copiar cap text de l'eina.",
        where: { humanRole: ["authored-all-used-advice"] },
        fulfills: true,
        explanation: "Descriu una influència conceptual sense incorporació de text.",
      },
      {
        id: "human-sections",
        label: "«vaig conservar les seccions gairebé sense canvis»",
        sentence:
          "Jo vaig conservar les seccions 2 i 4 gairebé sense canvis i vaig escriure la resta.",
        where: { humanRole: ["retained-generated-sections"] },
        fulfills: true,
        explanation: "Fa visible que la intervenció humana sobre les parts generades va ser mínima.",
      },
      {
        id: "human-outline-section",
        label: "«vaig reorganitzar l'estructura i retocar la secció»",
        sentence:
          "Jo vaig reorganitzar l'estructura i vaig fer retocs menors a la secció 4 generada.",
        where: { humanRole: ["reorganized-outline-lightly-edited-section"] },
        fulfills: true,
        explanation: "Descriu dues intervencions humanes diferents.",
      },
    ],
  },
]);

export const WORKED_SCENARIO = Object.freeze({
  id: "worked-outline",
  title: "Cas guiat: estructura generada, text propi",
  targetWorldId: "outline-own-text",
  facts: [
    "L'eina va proposar tres estructures.",
    "L'estudiant en va combinar i reorganitzar una.",
    "L'estudiant va escriure tot el text final.",
    "Cap paràgraf final no va ser generat.",
  ],
  recommendedSelections: {
    tool: "tool-provenance",
    purpose: "purpose-structure",
    extent: "extent-outline-only",
    human: "human-outline",
  },
});

export const TRANSFER_SCENARIOS = Object.freeze([
  {
    id: "transfer-brainstorm",
    title: "Idees descartades",
    targetWorldId: "brainstorm",
    summary:
      "Abans de redactar, l'estudiant va explorar idees amb l'eina. No en va conservar cap sortida i va escriure tot el document.",
    facts: [
      "Ús abans de la redacció.",
      "La sortida es va descartar.",
      "Cap text de l'eina no apareix al lliurament.",
      "L'estudiant va escriure tot el document.",
    ],
    recommendedSelections: {
      tool: "tool-generic",
      purpose: "purpose-brainstorm",
      extent: "extent-no-output",
      human: "human-brainstorm",
    },
  },
  {
    id: "transfer-translation",
    title: "Traducció revisada",
    targetWorldId: "translation",
    summary:
      "L'estudiant va escriure el document en català, en va generar la traducció anglesa completa i va revisar-ne la terminologia.",
    facts: [
      "L'original català és text propi.",
      "La traducció anglesa cobreix tot el document.",
      "L'estudiant va revisar la terminologia.",
    ],
    recommendedSelections: {
      tool: "tool-generic",
      purpose: "purpose-translate",
      extent: "extent-translation",
      human: "human-translation",
    },
  },
  {
    id: "transfer-sections",
    title: "Seccions conservades",
    targetWorldId: "generated-sections",
    summary:
      "L'eina va generar les seccions 2 i 4. L'estudiant les va conservar gairebé sense canvis i va escriure tota la resta.",
    facts: [
      "Les seccions 2 i 4 són text generat.",
      "Aquestes seccions es van conservar gairebé sense canvis.",
      "La resta del document és text propi.",
    ],
    recommendedSelections: {
      tool: "tool-generic",
      purpose: "purpose-sections",
      extent: "extent-sections",
      human: "human-sections",
    },
  },
]);

export const LONG_VAGUE_SELECTIONS = Object.freeze({
  tool: "tool-provenance",
  purpose: "purpose-vague",
  extent: "extent-document",
  human: "human-reviewed",
});
