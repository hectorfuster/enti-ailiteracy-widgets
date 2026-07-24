(function initB8Content(globalScope) {
  "use strict";

  const SOURCES = Object.freeze({
    dsm: {
      id: "dsm",
      title:
        "Directiva (UE) 2019/790 — extracció de textos i dades, articles 3 i 4",
      url: "https://eur-lex.europa.eu/legal-content/CA/TXT/?uri=CELEX:32019L0790",
    },
    "ai-act": {
      id: "ai-act",
      title:
        "Reglament (UE) 2024/1689 — obligacions dels proveïdors de models d’IA d’ús general",
      url: "https://eur-lex.europa.eu/legal-content/CA/TXT/?uri=CELEX:32024R1689",
    },
    "training-summary": {
      id: "training-summary",
      title:
        "Comissió Europea — plantilla del resum públic del contingut d’entrenament",
      url: "https://digital-strategy.ec.europa.eu/en/faqs/template-general-purpose-ai-model-providers-summarise-their-training-content",
    },
    "gpai-code": {
      id: "gpai-code",
      title:
        "Comissió Europea — Codi voluntari de bones pràctiques per als models d’IA d’ús general",
      url: "https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai",
    },
    "gpai-guidelines": {
      id: "gpai-guidelines",
      title:
        "Comissió Europea — directrius sobre les obligacions dels proveïdors de models d’IA d’ús general",
      url: "https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers",
    },
    euipo: {
      id: "euipo",
      title: "EUIPO — IA generativa des de la perspectiva dels drets d’autor",
      url: "https://www.euipo.europa.eu/en/publications/genai-from-a-copyright-perspective-2025",
    },
    culture: {
      id: "culture",
      title:
        "Ministeri de Cultura — nota de bones pràctiques internes sobre IA (2024)",
      url: "https://www.cultura.gob.es/dam/jcr%3A469163cc-0fdf-4fe2-964f-d4815cde40b1/240219-nota-informativa-ia.pdf",
    },
  });

  const DIMENSIONS = Object.freeze([
    {
      id: "training-rights",
      shortTitle: "Autorització i reserves",
      title: "Autorització, llicències i reserves de drets",
      principle:
        "Fer servir material creatiu sota unes condicions comprensibles, verificables i respectades.",
      context:
        "A la UE, l’extracció de textos i dades distingeix els usos de recerca científica d’altres usos. Per a aquests altres usos importen, entre altres factors, l’accés lícit i que els titulars no hagin reservat adequadament els drets. Això no equival ni a «tot el que és en línia és lliure» ni a «sempre cal un permís individual».",
      evidence:
        "Política de compliment del proveïdor, categories i fonts de dades, mètodes de recollida, llicències, mecanismes de reserva i canal de reclamacions.",
      sourceIds: ["dsm", "ai-act", "gpai-code", "gpai-guidelines", "euipo"],
      studio: {
        prompt:
          "Quines proves demanaries abans de llicenciar el model per al flux de treball artístic de l’estudi?",
        choices: [
          {
            id: "studio-lawful-baseline",
            policy: "lawful-baseline",
            label:
              "Acceptaria una declaració de compliment i el resum públic; aprofundiria si apareguessin indicis de risc.",
          },
          {
            id: "studio-documented-process",
            policy: "documented-process",
            label:
              "Exigiria una explicació documentada de fonts, llicències, reserves de drets i reclamacions.",
          },
          {
            id: "studio-licensed-scope",
            policy: "licensed-scope",
            label:
              "Només compraria un model amb un corpus creatiu de llicència o permís documentats per a l’abast previst.",
          },
          {
            id: "studio-need-evidence",
            policy: "need-evidence",
            label:
              "No ho decidiria encara: necessito saber la jurisdicció, les fonts i l’ús concret.",
          },
        ],
      },
      creator: {
        prompt:
          "Quines condicions voldries poder expressar si una empresa volgués entrenar amb el teu portafolis?",
        choices: [
          {
            id: "creator-lawful-baseline",
            policy: "lawful-baseline",
            label:
              "Em basaria en el marc aplicable i faria una reserva de drets quan no volgués autoritzar l’ús.",
          },
          {
            id: "creator-documented-process",
            policy: "documented-process",
            label:
              "Voldria termes comprensibles, una manera efectiva de reservar drets i un canal de reclamacions.",
          },
          {
            id: "creator-licensed-scope",
            policy: "licensed-scope",
            label:
              "Només ho autoritzaria amb una llicència explícita que definís material, finalitat, termini i abast.",
          },
          {
            id: "creator-need-evidence",
            policy: "need-evidence",
            label:
              "No ho decidiria encara: necessito saber la jurisdicció, les fonts i l’ús concret.",
          },
        ],
      },
    },
    {
      id: "licensing-remuneration",
      shortTitle: "Llicència i remuneració",
      title: "Llicències, valor i remuneració",
      principle:
        "Decidir amb transparència qui aporta valor, quins drets es llicencien i com es reparteixen costos i beneficis.",
      context:
        "Una preferència de remuneració, una llicència de mercat i una obligació legal no són el mateix. Hi ha acords individuals, llicències col·lectives i corpus amb termes diversos; l’activitat no pressuposa una tarifa universal per obra.",
      evidence:
        "Tipus de llicència, usos autoritzats, durada, mecanisme de pagament, cobertura dels titulars i possibilitat d’auditar els termes.",
      sourceIds: ["dsm", "euipo", "culture"],
      studio: {
        prompt:
          "Quin pes tindrien les llicències i la remuneració dels titulars en la selecció del model?",
        choices: [
          {
            id: "studio-no-extra-payment",
            policy: "no-extra-payment",
            label:
              "No afegiria una condició de pagament més enllà dels termes lícits i documentats del proveïdor.",
          },
          {
            id: "studio-collective-market",
            policy: "collective-market",
            label:
              "Preferiria un model amb llicències o mecanismes col·lectius de remuneració si cost i qualitat fossin viables.",
          },
          {
            id: "studio-negotiated-paid",
            policy: "negotiated-paid",
            label:
              "La llicència i una remuneració acordada serien una condició de compra, encara que augmentés el pressupost.",
          },
          {
            id: "studio-remuneration-unknown",
            policy: "need-evidence",
            label:
              "No ho decidiria sense conèixer els titulars coberts, els usos, el preu i el mecanisme de pagament.",
          },
        ],
      },
      creator: {
        prompt:
          "Amb quines condicions econòmiques acceptaries llicenciar obres del teu portafolis?",
        choices: [
          {
            id: "creator-no-extra-payment",
            policy: "no-extra-payment",
            label:
              "Podria donar una llicència sense pagament per a un ús definit i limitat, si els termes em convencessin.",
          },
          {
            id: "creator-collective-market",
            policy: "collective-market",
            label:
              "Acceptaria termes estàndard o col·lectius si fossin clars, proporcionals i revisables.",
          },
          {
            id: "creator-negotiated-paid",
            policy: "negotiated-paid",
            label:
              "Només ho llicenciaria amb una remuneració negociada i un abast contractual concret.",
          },
          {
            id: "creator-remuneration-unknown",
            policy: "need-evidence",
            label:
              "No ho decidiria sense conèixer els usos, el termini, l’abast i el mecanisme de pagament.",
          },
        ],
      },
    },
    {
      id: "traceability",
      shortTitle: "Transparència",
      title: "Transparència, traçabilitat i prova",
      principle:
        "Donar informació útil perquè compradors i titulars puguin fer diligència deguda i exercir els seus drets.",
      context:
        "El Reglament d’IA exigeix als proveïdors de models d’ús general un resum prou detallat del contingut d’entrenament. La plantilla europea equilibra transparència i secrets comercials: un resum públic no és necessàriament una llista obra per obra ni un registre públic de cada autor.",
      evidence:
        "Resum públic, grans conjunts i fonts, períodes de recollida, rastrejadors, documentació confidencial de diligència deguda i resposta motivada a reclamacions.",
      sourceIds: ["ai-act", "training-summary", "gpai-code", "gpai-guidelines"],
      studio: {
        prompt:
          "Quin nivell de traçabilitat demanaries al proveïdor abans de desplegar el model?",
        choices: [
          {
            id: "studio-public-summary",
            policy: "public-summary",
            label:
              "Em bastaria un resum públic prou detallat de tipus de contingut, fonts principals i recollida.",
          },
          {
            id: "studio-audit-access",
            policy: "audit-access",
            label:
              "Demanaria documentació addicional o accés d’auditoria sota confidencialitat per verificar riscos concrets.",
          },
          {
            id: "studio-public-record",
            policy: "public-record",
            label:
              "Prioritzaria el màxim registre públic viable de conjunts, fonts, períodes i versions del model.",
          },
          {
            id: "studio-traceability-unknown",
            policy: "need-evidence",
            label:
              "No puc fixar el nivell sense saber el risc del projecte, el model i les dades utilitzades.",
          },
        ],
      },
      creator: {
        prompt:
          "Quina informació necessitaries per valorar si el teu tipus de contingut o una font concreta s’ha pogut utilitzar?",
        choices: [
          {
            id: "creator-public-summary",
            policy: "public-summary",
            label:
              "Em bastaria informació pública prou detallada sobre tipus de contingut, fonts principals i recollida.",
          },
          {
            id: "creator-audit-access",
            policy: "audit-access",
            label:
              "Voldria una via de reclamació en què el proveïdor comprovés registres i donés una resposta motivada.",
          },
          {
            id: "creator-public-record",
            policy: "public-record",
            label:
              "Voldria el màxim registre públic viable de conjunts, fonts, períodes i versions del model.",
          },
          {
            id: "creator-traceability-unknown",
            policy: "need-evidence",
            label:
              "No puc fixar el nivell sense saber el risc, el model i com s’han recollit les dades.",
          },
        ],
      },
    },
    {
      id: "style-identity",
      shortTitle: "Estil i identitat",
      title: "Estil identificable, identitat i salvaguardes de sortida",
      principle:
        "Definir límits comprensibles quan un sistema busca deliberadament l’estil identificable o el nom d’una persona viva.",
      context:
        "La protecció d’un estil abstracte i la possible reproducció d’expressions protegides en obres concretes són preguntes diferents. També poden intervenir el nom o la identitat, els contractes, la confusió comercial i les normes de la plataforma. «L’estil no té drets d’autor» no resol tot el cas.",
      evidence:
        "Política sobre noms d’artistes, dades d’ajust, proves de similitud, filtres, etiquetatge, revisió humana, condicions de màrqueting i resposta a reclamacions.",
      sourceIds: ["ai-act", "euipo", "culture"],
      studio: {
        prompt:
          "Quina política aplicaries a una funció que pot evocar deliberadament l’estil d’una persona viva?",
        choices: [
          {
            id: "studio-general-safeguards",
            policy: "general-safeguards",
            label:
              "Permetria inspiració general, però impediria resultats enganyosos, còpies massa properes i màrqueting amb el nom de l’artista.",
          },
          {
            id: "studio-consent-terms",
            policy: "consent-terms",
            label:
              "Només permetria apuntar a una persona concreta amb un acord que definís ús, crèdit, control i compensació.",
          },
          {
            id: "studio-no-targeting",
            policy: "no-targeting",
            label:
              "Prohibiria al projecte els prompts, ajustos o campanyes que busquessin deliberadament una persona viva.",
          },
          {
            id: "studio-style-case-by-case",
            policy: "need-evidence",
            label:
              "Ho decidiria cas per cas després de veure la finalitat, les dades, les sortides i els termes amb l’artista.",
          },
        ],
      },
      creator: {
        prompt:
          "Quina política voldries que s’apliqués quan el teu nom o el teu estil identificable orientés els resultats?",
        choices: [
          {
            id: "creator-general-safeguards",
            policy: "general-safeguards",
            label:
              "Acceptaria inspiració general si s’evitessin resultats enganyosos, còpies massa properes i màrqueting amb el meu nom.",
          },
          {
            id: "creator-consent-terms",
            policy: "consent-terms",
            label:
              "Ho acceptaria amb un acord que definís ús, crèdit, control i compensació.",
          },
          {
            id: "creator-no-targeting",
            policy: "no-targeting",
            label:
              "Demanaria que no s’apuntés deliberadament al meu nom ni al meu estil identificable.",
          },
          {
            id: "creator-style-case-by-case",
            policy: "need-evidence",
            label:
              "Ho decidiria cas per cas després de veure la finalitat, les dades, les sortides i els termes.",
          },
        ],
      },
    },
    {
      id: "remediation",
      shortTitle: "Reclamació i remei",
      title: "Reclamacions, exclusió futura i remei",
      principle:
        "Oferir una resposta documentada i un remei proporcionat, sense confondre accions tècniques diferents.",
      context:
        "Reservar drets per a recollides futures, eliminar una obra d’un conjunt, limitar sortides, actualitzar un model, aplicar desaprenentatge automàtic i reentrenar són accions diferents. El remei adequat depèn dels fets, el contracte, el marc aplicable i la viabilitat tècnica.",
      evidence:
        "Canal de contacte, terminis, registres, abast de l’exclusió, investigació, mesures sobre dades i sortides, actualitzacions, versions afectades i via d’escalat.",
      sourceIds: ["dsm", "gpai-code", "euipo"],
      studio: {
        prompt:
          "Quina resposta exigiria l’estudi al proveïdor davant una reserva o reclamació documentada?",
        choices: [
          {
            id: "studio-future-exclusion",
            policy: "future-exclusion",
            label:
              "Com a mínim, exclusió de recollides futures i una explicació clara de l’abast i les limitacions.",
          },
          {
            id: "studio-complaint-remedy",
            policy: "complaint-remedy",
            label:
              "Un procés amb termini, investigació i remei proporcionat sobre dades, sortides o versions afectades.",
          },
          {
            id: "studio-model-remedy",
            policy: "model-remedy",
            label:
              "Un compromís contractual de remei tècnic efectiu, inclosa actualització, substitució o reentrenament quan fos necessari i viable.",
          },
          {
            id: "studio-remedy-unknown",
            policy: "need-evidence",
            label:
              "No fixaria el remei abans de conèixer el problema, el model, el contracte i les opcions tècniques.",
          },
        ],
      },
      creator: {
        prompt:
          "Quina resposta esperaries després de presentar una reserva o reclamació documentada?",
        choices: [
          {
            id: "creator-future-exclusion",
            policy: "future-exclusion",
            label:
              "Com a mínim, exclusió de recollides futures i una explicació clara de l’abast i les limitacions.",
          },
          {
            id: "creator-complaint-remedy",
            policy: "complaint-remedy",
            label:
              "Un procés amb termini, investigació i remei proporcionat sobre dades, sortides o versions afectades.",
          },
          {
            id: "creator-model-remedy",
            policy: "model-remedy",
            label:
              "Un remei tècnic efectiu, inclosa actualització, substitució o reentrenament quan fos necessari i viable.",
          },
          {
            id: "creator-remedy-unknown",
            policy: "need-evidence",
            label:
              "No fixaria el remei abans de conèixer el problema, el model, els termes i les opcions tècniques.",
          },
        ],
      },
    },
  ]);

  const PREDICTIONS = Object.freeze([
    {
      id: "same",
      label: "Crec que mantindré els mateixos principis.",
    },
    {
      id: "different",
      label: "Crec que alguna decisió canviarà amb el rol.",
    },
    {
      id: "unsure",
      label: "No ho sé; prefereixo veure què passa.",
    },
  ]);

  const DIFFERENCE_REASONS = Object.freeze([
    {
      id: "legal-duty",
      label: "Les obligacions jurídiques dels dos rols són diferents.",
    },
    {
      id: "affected-rights",
      label:
        "Els drets o els danys possibles no recauen igual en els dos rols.",
    },
    {
      id: "bargaining-power",
      label: "El poder de negociació i la capacitat d’escollir són diferents.",
    },
    {
      id: "technical-feasibility",
      label: "La viabilitat tècnica canvia el que es pot exigir.",
    },
    {
      id: "reversibility",
      label: "Una de les decisions és més reversible que l’altra.",
    },
    {
      id: "cost-risk",
      label: "Els costos i els riscos es reparteixen de manera diferent.",
    },
    {
      id: "missing-evidence",
      label: "Em falta informació i he omplert el buit de manera diferent.",
    },
    {
      id: "self-interest",
      label: "El meu interès ha canviat amb el costat de la taula.",
    },
    {
      id: "another-reason",
      label: "Hi ha un altre principi o una altra raó rellevant.",
    },
  ]);

  const DISPOSITIONS = Object.freeze([
    {
      id: "maintain",
      label:
        "Mantinc la decisió: la raó canvia l’aplicació, però puc defensar el principi compartit.",
    },
    {
      id: "revisit",
      label:
        "La vull revisar: encara no puc defensar aquesta diferència o aquest principi.",
    },
    {
      id: "pending",
      label:
        "La deixo pendent: necessito una prova o una dada abans de decidir.",
    },
  ]);

  const SAME_DISPOSITIONS = Object.freeze([
    {
      id: "maintain",
      label: "Mantinc aquest principi compartit.",
    },
    {
      id: "revisit",
      label: "Tot i coincidir, vull revisar si aquest principi és prou sòlid.",
    },
    {
      id: "pending",
      label:
        "La coincidència és provisional: em falta informació per sostenir-la.",
    },
  ]);

  const TRANSFER = Object.freeze({
    title: "Un cas nou: del mirall al projecte",
    scenario:
      "Un estudi vol provar una funció que adapta concept art a l’estil intern de dues artistes contractades. Ara seria un prototip tancat, però podria passar a producció. El proveïdor només diu «complim la llei» i no concreta les dades, els termes amb les artistes ni els remeis.",
    prompt: "Quina seria la teva primera decisió defensable?",
    choices: [
      {
        id: "scope-first",
        label:
          "Definir per escrit abast, termes amb les artistes i proves del proveïdor abans d’iniciar la prova.",
        feedback:
          "Prioritza termes i evidència abans de l’ús. Redueix ambigüitat, però encara caldrà concretar qui revisa les sortides i com es gestionen incidències.",
      },
      {
        id: "sandbox-first",
        label:
          "Fer només una prova interna, amb accés limitat i sense sortides comercials, mentre es reuneixen termes i proves abans de producció.",
        feedback:
          "Utilitza reversibilitat i controls per reduir risc. El caràcter intern no resol per si sol els drets sobre dades, l’acord amb les artistes ni el remei.",
      },
      {
        id: "provider-assurance",
        label:
          "Acceptar la declaració general del proveïdor i avançar, perquè el projecte encara és intern.",
        feedback:
          "És una decisió possible, però la declaració general aporta poca prova sobre fonts, termes, salvaguardes i remeis. El mirall et convida a preguntar si acceptaries la mateixa incertesa com a artista.",
      },
      {
        id: "pause-for-evidence",
        label:
          "Pausar la prova fins que el proveïdor i l’estudi responguin les preguntes pendents.",
        feedback:
          "Tracta la manca de prova com una incertesa real. Pausar evita avançar a cegues, però convé convertir la pausa en una llista concreta d’informació i una persona responsable.",
      },
    ],
  });

  const COMMITMENT_STANDARDS = Object.freeze([
    {
      id: "terms-evidence",
      label:
        "No desplegaré un ús creatiu sense un abast, uns termes i unes proves comprensibles.",
    },
    {
      id: "reciprocal-rights",
      label:
        "Com a comprador demanaré la via de decisió i reclamació que voldria tenir com a creador.",
    },
    {
      id: "proportionate-remedy",
      label:
        "Abans de l’ús definiré com es respondrà a una reserva, una incidència o una reclamació.",
    },
    {
      id: "evidence-before-confidence",
      label:
        "Quan faltin proves, ho tractaré com una incertesa pendent, no com un sí.",
    },
  ]);

  const EVIDENCE_CHOICES = Object.freeze([
    {
      id: "training-summary",
      label:
        "Resum de contingut d’entrenament i descripció de fonts i recollida.",
    },
    {
      id: "licence-records",
      label: "Registres de llicències, permisos, abast i remuneració.",
    },
    {
      id: "rights-process",
      label: "Procés de reserves, reclamacions, terminis i remeis documentats.",
    },
    {
      id: "output-safeguards",
      label:
        "Proves de salvaguardes de sortida, revisió humana i resposta a incidències.",
    },
  ]);

  const CHECKLIST = Object.freeze([
    "Quin ús es proposa i què queda fora de l’abast?",
    "Quines fonts, llicències i reserves de drets es poden demostrar?",
    "Quins termes de remuneració o autorització s’apliquen?",
    "Quines salvaguardes hi ha per a l’estil, la identitat i les sortides?",
    "Quina via de reclamació i quin remei existeixen?",
  ]);

  const api = Object.freeze({
    REVIEWED_ON: "2026-07-24",
    NEXT_REVIEW_ON: "2027-07-24",
    JURISDICTION: "Unió Europea / Espanya",
    CONTENT_OWNER_ROLE: "Coordinació acadèmica d’ENTI-UB",
    SOURCES,
    DIMENSIONS,
    PREDICTIONS,
    DIFFERENCE_REASONS,
    DISPOSITIONS,
    SAME_DISPOSITIONS,
    TRANSFER,
    COMMITMENT_STANDARDS,
    EVIDENCE_CHOICES,
    CHECKLIST,
  });

  globalScope.B8Content = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
