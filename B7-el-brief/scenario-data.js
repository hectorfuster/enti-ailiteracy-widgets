(function exposeBriefData(globalScope) {
  "use strict";

  const CONTENT_VERSION = "2.1.0";
  const CONTENT_REVIEW_DATE = "2026-07-24";

  const DIMENSIONS = [
    {
      id: "cost",
      name: "Cost",
      short:
        "On pagues: quota o ús, maquinari, energia, manteniment i temps humà.",
      question:
        "Quin és el cost total durant la vida de la feina, inclòs canviar de solució?",
    },
    {
      id: "privacy",
      name: "Privadesa",
      short:
        "Al núvol depèn del contracte i la configuració; en local, les entrades no han de viatjar.",
      question:
        "Quines dades hi entren i quins entorns estan aprovats per processar-les?",
    },
    {
      id: "transparency",
      name: "Transparència",
      short:
        "Què pots inspeccionar, documentar i verificar sobre el model i el servei.",
      question:
        "Què sabem de les dades, els límits, els canvis i la manera com s’ha avaluat?",
    },
    {
      id: "capacity",
      name: "Capacitat",
      short:
        "Si el sistema arriba a la qualitat necessària per a aquesta tasca concreta.",
      question:
        "Quin llindar de qualitat necessites i amb quina prova el compararàs?",
    },
    {
      id: "control",
      name: "Control",
      short:
        "Qui pot canviar, restringir o retirar la versió de què depèn el procés.",
      question:
        "Pots congelar, reproduir i substituir la solució sense trencar producció?",
    },
  ];

  const STATUS = {
    proportionate: {
      label: "Proporcionada",
      title: "La decisió encaixa amb l’evidència disponible",
    },
    defensible: {
      label: "Defensable si…",
      title: "La decisió pot funcionar sota condicions explícites",
    },
    "over-engineered": {
      label: "Sobredimensionada",
      title: "La solució protegeix una cosa a un cost difícil de justificar",
    },
    "under-evidenced": {
      label: "Poc contrastada",
      title: "La idea pot funcionar, però falta provar la hipòtesi principal",
    },
    invalid: {
      label: "Incompatible",
      title: "La decisió incompleix una restricció explícita del brief",
    },
  };

  const ROUNDS = [
    {
      id: "prototype-dialogue",
      stamp: "Mes 1 · Preproducció",
      title: "Brief 1: quaranta PNJ sense veu",
      brief:
        "Necessiteu 400 línies de diàleg provisional per provar el ritme de les escenes. La font és el document de lore, material original i confidencial de l’estudi. El text es descartarà abans del llançament. Pressupost gairebé zero; termini, aquesta setmana.",
      facts: [
        "Entrada: lore confidencial i propietat intel·lectual de l’estudi.",
        "Sortida: text provisional, no contingut final.",
        "Volum: 400 línies en una setmana.",
        "Maquinari: una estació amb 16 GB de VRAM disponible a les nits.",
      ],
      pressure: ["privacy", "capacity"],
      questions: [
        {
          id: "approval",
          label: "Quins serveis estan aprovats per al lore?",
          reveal:
            "Política interna: cap xat de consum pot rebre lore. Es permet execució local i un servei professional si contracte, configuració i accés han estat revisats.",
        },
        {
          id: "quality",
          label: "Quina qualitat mínima necessita el prototip?",
          reveal:
            "Una prova interna de 20 línies considera suficient que el text mantingui noms, intenció i longitud. No cal veu literària final.",
        },
        {
          id: "local-fit",
          label: "El model local cap a la màquina?",
          reveal:
            "Un model petit quantificat hi cap i produeix una primera passada en menys d’una hora. Encara no s’ha provat amb aquest lore.",
        },
        {
          id: "enterprise",
          label: "Què inclou realment el pla professional?",
          reveal:
            "Hi ha DPA i exclusió d’entrenament, però encara cal revisar retenció, subprocessadors, permisos, regió i configuració. La quota mínima és anual.",
        },
      ],
      workflows: [
        {
          id: "local",
          title: "Model obert petit, executat en local",
          summary:
            "Processar el lore a l’estació de l’estudi i conservar una versió reproduïble.",
          benefit:
            "Les entrades no surten de la màquina i la versió es pot congelar.",
          tradeoff:
            "La qualitat i el temps d’operació encara s’han de mesurar; maquinari i manteniment també són cost.",
          reconsider:
            "si la prova no arriba al llindar o mantenir el procés costa més que una alternativa aprovada",
          baseStatus: "defensible",
          safeguardStatus: { pilot: "proportionate" },
        },
        {
          id: "enterprise",
          title: "Servei professional al núvol",
          summary:
            "Usar el servei aprovat només després de tancar contracte, configuració i accessos.",
          benefit:
            "Ofereix molta capacitat amb una via contractual per al material confidencial.",
          tradeoff:
            "La quota anual i la dependència del proveïdor poden ser excessives per a text provisional.",
          reconsider:
            "si la revisió contractual deixa buits o el volum no justifica la quota",
          baseStatus: "defensible",
          priorityStatus: { cost: "over-engineered" },
          safeguardStatus: { budget: "defensible", minimise: "defensible" },
        },
        {
          id: "consumer",
          title: "Xat de consum amb el document de treball",
          summary:
            "Aprofitar el servei gratuït i la seva capacitat sense un acord específic amb l’estudi.",
          benefit: "Redueix el cost directe i accelera la primera passada.",
          tradeoff:
            "El lore no pot entrar en aquest servei segons la política del brief.",
          reconsider:
            "només si l’entrada es converteix en dades sintètiques sense cap fragment del lore i la política ho permet",
          baseStatus: "invalid",
          safeguardStatus: { minimise: "defensible" },
        },
        {
          id: "human",
          title: "Plantilles i redacció humana",
          summary:
            "Dividir els PNJ en arquetips i escriure la passada provisional sense model.",
          benefit: "Manté el material dins l’equip i evita dependències noves.",
          tradeoff:
            "Consumeix temps especialitzat per a un actiu que es descartarà.",
          reconsider:
            "si el calendari es comprimeix o apareixen tasques de més valor per a l’equip narratiu",
          baseStatus: "defensible",
          priorityStatus: { cost: "over-engineered" },
          safeguardStatus: { timebox: "defensible" },
        },
      ],
      safeguards: [
        {
          id: "pilot",
          title: "Pilot amb criteris d’acceptació",
          description:
            "Provar 20 línies contra noms, intenció, longitud, temps i errors abans d’escalar.",
          effect:
            "El pilot converteix una afirmació de capacitat en evidència pròpia de la tasca.",
        },
        {
          id: "minimise",
          title: "Minimització i dades sintètiques",
          description:
            "Enviar només el mínim necessari o substituir el lore per marcadors i exemples inventats.",
          effect:
            "La minimització redueix l’exposició, però cal comprovar que no quedi cap detall confidencial.",
        },
        {
          id: "budget",
          title: "Límit de cost total",
          description:
            "Comparar quota, màquina, energia, manteniment i hores abans de comprometre l’any.",
          effect:
            "El límit evita confondre preu zero, quota i cost total de propietat.",
        },
        {
          id: "timebox",
          title: "Temps humà acotat",
          description:
            "Reservar un màxim d’hores i reutilitzar plantilles si la redacció és manual.",
          effect:
            "El temps acotat protegeix el calendari, però pot reduir cobertura o varietat.",
        },
      ],
    },
    {
      id: "trailer-script",
      stamp: "Mes 8 · Producció",
      title: "Brief 2: el guió del tràiler",
      brief:
        "L’editor vol un guió narratiu per al tràiler d’anunci. El text final serà públic i necessita una veu convincent. El dossier de treball, però, encara conté girs no anunciats i notes de marca. Hi ha 48 hores i sis hores de guionista disponibles.",
      facts: [
        "Sortida: text públic i d’alta visibilitat.",
        "Entrades: una sinopsi publicable i un dossier intern amb spoilers.",
        "Recurs escàs: sis hores de guionista.",
        "Criteri: veu de marca, claredat, ritme i absència de revelacions.",
      ],
      pressure: ["capacity", "privacy"],
      questions: [
        {
          id: "inputs",
          label: "Tot el material d’entrada és públic?",
          reveal:
            "No. Només la sinopsi d’una pàgina està autoritzada per sortir. El dossier complet continua sent confidencial fins a l’anunci.",
        },
        {
          id: "benchmark",
          label: "Què diu una prova breu de qualitat?",
          reveal:
            "En dotze variants cegues, l’editor prefereix deu textos del servei allotjat i set del model local; tots dos necessiten edició de marca.",
        },
        {
          id: "approval",
          label: "Quin ús del núvol està aprovat?",
          reveal:
            "El servei professional està aprovat per a còpia de màrqueting pública. No pot rebre el dossier intern; sí una sinopsi revisada i publicable.",
        },
        {
          id: "human-time",
          label: "Què pot fer el guionista en sis hores?",
          reveal:
            "Pot definir l’angle, escriure una versió completa i editar variants, però no produir i comparar moltes direccions des de zero.",
        },
      ],
      workflows: [
        {
          id: "hybrid-hosted",
          title: "Direcció humana + variants allotjades",
          summary:
            "El guionista fixa l’angle, el servei genera variants des de la sinopsi pública i el guionista edita el resultat.",
          benefit:
            "Concentra la capacitat del servei en una sortida visible i conserva autoria i revisió humanes.",
          tradeoff:
            "Només és segur si el paquet d’entrada ha estat separat i revisat.",
          reconsider:
            "si la prova de qualitat no compensa la preparació o si el material d’entrada no es pot separar",
          baseStatus: "defensible",
          safeguardStatus: {
            "public-pack": "proportionate",
            editorial: "proportionate",
          },
        },
        {
          id: "human",
          title: "Guió humà, amb una sola ronda editorial",
          summary:
            "El guionista escriu una direcció completa i reserva temps per revisar marca i spoilers.",
          benefit: "Maximitza control creatiu i redueix preparació tècnica.",
          tradeoff:
            "Explora menys variants i consumeix gairebé tot el marge humà.",
          reconsider:
            "si l’editor demana més direccions o el calendari es redueix",
          baseStatus: "defensible",
          priorityStatus: { cost: "over-engineered" },
          safeguardStatus: { timebox: "defensible" },
        },
        {
          id: "local",
          title: "Model local + edició humana",
          summary:
            "Generar variants localment amb tot el dossier i dedicar les hores humanes a la veu final.",
          benefit:
            "Manté les entrades internes a l’estudi i conserva la versió del model.",
          tradeoff: "La qualitat per a aquesta veu pública no es pot suposar.",
          reconsider:
            "si una comparació cega mostra que l’edició necessària elimina l’avantatge",
          baseStatus: "under-evidenced",
          safeguardStatus: { benchmark: "proportionate" },
        },
        {
          id: "bakeoff",
          title: "Comparació curta abans de produir",
          summary:
            "Invertir noranta minuts en variants humana, local i allotjada amb el mateix paquet públic; acabar amb la millor.",
          benefit:
            "Decideix amb evidència pròpia i evita convertir una família en dogma.",
          tradeoff:
            "Gasta part del termini en avaluació i necessita una rúbrica acordada.",
          reconsider:
            "si el termini no permet una comparació o la mostra no representa la veu final",
          baseStatus: "defensible",
          safeguardStatus: {
            benchmark: "proportionate",
            timebox: "proportionate",
          },
        },
      ],
      safeguards: [
        {
          id: "public-pack",
          title: "Paquet d’entrada publicable",
          description:
            "Separar una sinopsi aprovada i verificar que no conté spoilers ni notes internes.",
          effect:
            "Separar entrades evita deduir que una sortida pública converteix tot el material font en públic.",
        },
        {
          id: "benchmark",
          title: "Comparació cega amb rúbrica",
          description:
            "Comparar poques variants amb veu, claredat, ritme, edició necessària i errors.",
          effect:
            "La comparació substitueix «aquest model és millor» per evidència de la tasca.",
        },
        {
          id: "editorial",
          title: "Revisió de marca, drets i revelacions",
          description:
            "Una persona responsable aprova cada frase abans de lliurar el tràiler.",
          effect:
            "La revisió humana protegeix una sortida d’alta visibilitat, encara que l’entrada sigui pública.",
        },
        {
          id: "timebox",
          title: "Temps d’exploració acotat",
          description:
            "Tancar direcció i eina després d’un màxim de noranta minuts.",
          effect:
            "L’acotació conserva temps per a l’edició final i evita avaluar indefinidament.",
        },
      ],
    },
    {
      id: "review-analysis",
      stamp: "Mes 14 · Postllançament",
      title: "Brief 3: quaranta mil ressenyes",
      brief:
        "El joc ja té 40.000 ressenyes públiques i n’arriben unes 1.200 cada setmana. Direcció vol tendències generals, però també alertes de regressions rares de rendiment. L’informe ha de ser setmanal i reproduïble.",
      facts: [
        "Històric: 40.000 ressenyes; flux nou: unes 1.200 per setmana.",
        "Objectius diferents: prevalença general i alertes rares.",
        "Distribució: idiomes i plataformes no estan repartits uniformement.",
        "Minimització: les ressenyes són públiques, però noms d’usuari i metadades no són necessaris.",
      ],
      pressure: ["cost", "control"],
      questions: [
        {
          id: "scope",
          label: "N’hi ha prou amb una tendència global?",
          reveal:
            "No. Direcció vol percentatges globals i detectar pics petits per idioma, plataforma i versió del joc.",
        },
        {
          id: "sample",
          label: "Què pot dir una mostra aleatòria de 200?",
          reveal:
            "Per a una proporció global, una mostra aleatòria simple de 200 té un marge màxim aproximat de ±6,9 punts al 95 %. No garanteix veure incidències rares ni subgrups petits.",
        },
        {
          id: "benchmark",
          label: "Com funcionen els classificadors en una mostra etiquetada?",
          reveal:
            "En 300 casos, el model local obté F1 macro 0,82 i el servei allotjat 0,86. Tots dos fallen més amb sarcasme i categories rares.",
        },
        {
          id: "operations",
          label: "Quin cost operatiu té cada setmana?",
          reveal:
            "El model local cap en una màquina disponible i triga dues hores. L’API es pot processar per lots. L’equip pot dedicar tres hores a mostreig, QA i incidències.",
        },
      ],
      workflows: [
        {
          id: "local-pipeline",
          title: "Classificador local + escalat per confiança",
          summary:
            "Processar només ressenyes noves, enviar casos dubtosos a revisió i conservar versió i etiquetes.",
          benefit:
            "Fa previsible el cost recurrent i manté control de versió i reproduïbilitat.",
          tradeoff:
            "Necessita validació, manteniment i vigilància d’errors per segment.",
          reconsider:
            "si deriva la qualitat, canvia el volum o el manteniment supera l’alternativa allotjada",
          baseStatus: "defensible",
          safeguardStatus: {
            validation: "proportionate",
            stratify: "proportionate",
          },
        },
        {
          id: "hosted-pipeline",
          title: "Classificador allotjat per lots + QA",
          summary:
            "Enviar només el text necessari de les ressenyes noves i revisar una mostra d’errors.",
          benefit: "Aporta més capacitat mesurada i evita operar el model.",
          tradeoff:
            "Converteix ús i canvis del proveïdor en cost i dependència recurrents.",
          reconsider:
            "si la diferència de qualitat no compensa el cost o el proveïdor canvia model, preu o condicions",
          baseStatus: "defensible",
          safeguardStatus: {
            validation: "proportionate",
            budget: "proportionate",
          },
        },
        {
          id: "hybrid-sample",
          title: "Mostra estratificada + detectors dirigits",
          summary:
            "Estimar tendències amb una mostra per segments i buscar incidències rares amb regles, consultes i revisió dirigida.",
          benefit:
            "Pot reduir inferència massiva i separar la pregunta global de la detecció rara.",
          tradeoff:
            "El resultat depèn del marc mostral, els estrats i la cobertura dels detectors.",
          reconsider:
            "si creixen els subgrups, canvia el vocabulari o apareixen incidències fora dels detectors",
          baseStatus: "defensible",
          safeguardStatus: {
            stratify: "proportionate",
            validation: "proportionate",
          },
        },
        {
          id: "random-only",
          title: "Mostra aleatòria simple de 200",
          summary:
            "Llegir una mostra nova cada setmana i estimar manualment els temes generals.",
          benefit:
            "És barata, interpretable i pot estimar proporcions globals amb incertesa declarada.",
          tradeoff:
            "No respon tota sola a alertes rares ni garanteix cobertura de subgrups.",
          reconsider:
            "si la decisió exigeix més precisió, incidències rares o resultats per segment",
          baseStatus: "under-evidenced",
          safeguardStatus: { stratify: "defensible" },
        },
      ],
      safeguards: [
        {
          id: "validation",
          title: "Conjunt etiquetat i vigilància de deriva",
          description:
            "Mesurar errors globals i per segment abans de desplegar i en dates programades.",
          effect:
            "La validació fa visible quan la capacitat deixa de ser suficient.",
        },
        {
          id: "stratify",
          title: "Mostreig estratificat",
          description:
            "Protegir idioma, plataforma, versió, recència i categories rares en la revisió humana.",
          effect:
            "L’estratificació millora cobertura, però s’ha de ponderar i documentar.",
        },
        {
          id: "minimise",
          title: "Minimització de camps",
          description:
            "Eliminar noms d’usuari, perfils i metadades que l’anàlisi no necessita.",
          effect:
            "Que una ressenya sigui pública no obliga a copiar totes les dades disponibles.",
        },
        {
          id: "budget",
          title: "Pressupost i pla de sortida",
          description:
            "Fixar un llindar mensual i conservar etiquetes, rúbrica i exportació per poder canviar.",
          effect:
            "El límit i l’exportació fan mesurables el cost recurrent i la dependència.",
        },
      ],
    },
  ];

  const TRANSFER = {
    stamp: "Cas nou · Transferència",
    title: "Moderació de comunitat",
    brief:
      "L’estudi ha de prioritzar missatges públics del fòrum i denúncies privades d’assetjament en quatre idiomes. El volum varia amb cada actualització; els casos greus necessiten resposta humana en trenta minuts. Dissenya el brief abans de triar la família d’eines.",
    questions: [
      {
        id: "policy",
        label: "Quines dades i entorns estan aprovats?",
      },
      {
        id: "volume",
        label: "Quin volum i quins pics ha d’absorbir el sistema?",
      },
      {
        id: "quality",
        label: "Quins errors són més costosos i com es mesuraran?",
      },
      {
        id: "languages",
        label: "Quina cobertura real té cada idioma?",
      },
    ],
    workflows: [
      {
        id: "single-auto",
        title: "Un únic model que decideix i actua automàticament",
        summary:
          "Enviar tots els canals al mateix sistema i ocultar o escalar segons la seva etiqueta.",
        status: "under-evidenced",
        feedback:
          "Ajunta dades, severitats i idiomes diferents sense demostrar que els errors siguin acceptables.",
      },
      {
        id: "approved-cloud",
        title: "Servei aprovat per triatge + cua humana",
        summary:
          "Usar un entorn contractualment aprovat, llindars conservadors i revisió humana dels casos sensibles.",
        status: "defensible",
        feedback:
          "Pot absorbir pics i mantenir supervisió, si contracte, dades, idiomes i temps de resposta passen la prova.",
      },
      {
        id: "human-rules",
        title: "Regles i equip humà, sense model",
        summary:
          "Filtrar senyals explícits amb regles i enviar tota decisió a moderació humana.",
        status: "defensible",
        feedback:
          "Maximitza explicabilitat, però la capacitat i el cost humà s’han de provar contra els pics.",
      },
      {
        id: "separate-lanes",
        title: "Carrils separats segons dades i risc",
        summary:
          "Processar contingut públic i denúncies privades en fluxos aprovats diferents, amb llindars, proves per idioma i escalat humà.",
        status: "proportionate",
        feedback:
          "La solució parteix el problema segons privadesa i severitat en lloc de forçar una sola eina.",
      },
    ],
    safeguards: [
      {
        id: "human-escalation",
        title: "Escalat humà per severitat i confiança",
        effect:
          "Protegeix els casos amb més impacte i converteix la confiança en una acció operativa.",
      },
      {
        id: "evaluation",
        title: "Prova per idioma, severitat i tipus d’error",
        effect:
          "Evita que una mitjana global amagui errors en idiomes o casos rars.",
      },
      {
        id: "data-gate",
        title: "Porta de dades i entorn aprovat",
        effect:
          "Separa què pot viatjar, on pot processar-se i qui hi pot accedir.",
      },
      {
        id: "fallback",
        title: "Cua de reserva i procediment de caiguda",
        effect:
          "Manté el servei quan el model, l’API o la capacitat humana fallen.",
      },
    ],
    triggers: [
      {
        id: "measured-change",
        label:
          "Quan canviïn l’error mesurat, el volum, la política, el cost o el servei.",
        strong: true,
      },
      {
        id: "leaderboard",
        label:
          "Quan un altre model passi al primer lloc d’un rànquing general.",
        strong: false,
      },
      {
        id: "vendor-message",
        label: "Quan el proveïdor afirmi que la nova versió és millor.",
        strong: false,
      },
      {
        id: "never",
        label: "Mai: un cop triada, la família ja és la resposta.",
        strong: false,
      },
    ],
  };

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  deepFreeze(DIMENSIONS);
  deepFreeze(STATUS);
  deepFreeze(ROUNDS);
  deepFreeze(TRANSFER);

  const api = {
    CONTENT_VERSION,
    CONTENT_REVIEW_DATE,
    DIMENSIONS,
    STATUS,
    ROUNDS,
    TRANSFER,
  };

  globalScope.B7Data = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
