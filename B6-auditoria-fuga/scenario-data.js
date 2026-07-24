(function initScenarioData(root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.B6ScenarioData = data;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createData() {
    "use strict";

    const VERSION = "3.0.0";
    const STORAGE_VERSION = 3;

    const CHOICES = [
      {
        id: "send",
        label: "Es pot enviar tal com està",
        shortLabel: "Envia",
        description:
          "No hi ha dades del projecte ni cap context ocult en el text que es mostra.",
      },
      {
        id: "minimize",
        label: "Redueix o redacta abans",
        shortLabel: "Redueix",
        description:
          "La tasca es pot fer amb marcadors, dades sintètiques o menys detall.",
      },
      {
        id: "approved",
        label: "Només amb una eina aprovada",
        shortLabel: "Eina aprovada",
        description:
          "El contingut de treball necessita les garanties acordades per l'organització.",
      },
      {
        id: "block",
        label: "No ho enviïs",
        shortLabel: "No enviïs",
        description:
          "El secret o el risc no es resol simplement canviant de xat.",
      },
      {
        id: "depends",
        label: "Atura't i comprova el context",
        shortLabel: "Comprova",
        description:
          "La decisió depèn de la llicència, la política, el contracte o el contingut real.",
      },
    ];

    const DATA_TYPES = {
      confidential: "Informació confidencial",
      credential: "Credencial o secret",
      intellectualProperty: "Propietat intel·lectual",
      metadata: "Metadades",
      personal: "Dades personals",
      public: "Informació pública",
      thirdParty: "Dades de tercers",
    };

    const ATURA = [
      {
        letter: "A",
        title: "Autorització",
        text: "És una eina aprovada per a aquest tipus de dades?",
      },
      {
        letter: "T",
        title: "Tipus de dades",
        text: "Hi ha dades personals, confidencials, de tercers, secrets o propietat intel·lectual?",
      },
      {
        letter: "U",
        title: "Ús del proveïdor",
        text: "Què diuen el contracte, la configuració, la retenció i els usos del servei?",
      },
      {
        letter: "R",
        title: "Redueix i redacta",
        text: "Pots resoldre la tasca amb menys dades, dades sintètiques o marcadors?",
      },
      {
        letter: "A",
        title: "Actua si ja ho has enviat",
        text: "Atura, documenta, elimina si escau, revoca o rota secrets i informa pel canal establert.",
      },
    ];

    const SCENARIOS = [
      {
        id: "stack-trace",
        number: 1,
        title: "Una traça d'error",
        taskType: "Depuració",
        prompt:
          "Per què em surt aquest error? «NullReferenceException at Assets/Vessel/TideController.cs:88» · Unity 6.1.3f1",
        correctChoice: "minimize",
        dataTypes: ["metadata", "confidential"],
        clues: [
          {
            id: "vessel-from-stack",
            label: "La ruta associa el nom Vessel amb codi del projecte",
          },
          {
            id: "engine-version",
            label: "La versió exacta del motor amplia el perfil tècnic",
          },
        ],
        directDisclosures: [
          "Nom intern del projecte dins d'una ruta",
          "Versió exacta de l'entorn de desenvolupament",
        ],
        safeAlternative:
          "«Per què hi ha un NullReferenceException a <ruta-redactada>:88? Aquest és el fragment mínim reproduïble: <codi mínim sense noms interns>.»",
        postSendActions: [
          "Revisa si la ruta o el codi revelen més informació del projecte.",
          "Elimina la conversa si la política i el servei ho permeten.",
          "Informa pel canal del projecte si la classificació ho exigeix.",
        ],
        feedback: {
          send: "La pregunta sembla purament tècnica, però la ruta exposa el nom intern del projecte i la versió del motor. El servei no necessita aquests identificadors per explicar una NullReferenceException.",
          minimize:
            "Bona decisió per a aquest escenari. Una traça mínima i una ruta redactada conserven el problema tècnic sense regalar metadades del projecte.",
          approved:
            "És una opció protectora, però pot ser més restricció de la necessària: primer prova de reduir la traça i reproduir l'error amb un exemple mínim.",
          block:
            "No cal renunciar a l'ajuda. El risc es pot reduir amb una ruta genèrica i només el codi imprescindible.",
          depends:
            "Comprovar la política és prudent, però aquí ja pots aplicar una mesura concreta: elimina noms interns i comparteix un cas mínim.",
        },
      },
      {
        id: "client-email",
        number: 2,
        title: "Un correu per traduir",
        taskType: "Traducció",
        prompt:
          "Tradueix a l'anglès: «Núria, confirma a Nau Roja que la build ja incorpora els canvis de la prova privada.»",
        correctChoice: "approved",
        dataTypes: ["confidential", "personal", "thirdParty"],
        clues: [
          {
            id: "client-nau-roja",
            label: "Nau Roja queda vinculada al projecte",
          },
          {
            id: "team-member-nuria",
            label: "Núria queda vinculada a una prova privada",
          },
        ],
        directDisclosures: [
          "Identitat d'una companya",
          "Relació amb un client",
          "Existència d'una prova privada",
        ],
        safeAlternative:
          "Fes servir l'eina de traducció aprovada. Si només necessites el to, demana un model de correu amb [persona], [client] i [fita] i completa'l localment.",
        postSendActions: [
          "Documenta quins noms i quina relació comercial s'han exposat.",
          "Segueix el canal intern per a dades de tercers i informació de client.",
          "Elimina la conversa si escau, sense assumir que això resol tots els usos posteriors.",
        ],
        feedback: {
          send: "El text conté dades d'una companya, d'un client i d'una prova privada. La utilitat de traduir no converteix el contingut en públic.",
          minimize:
            "Els marcadors redueixen molt el risc si només necessites un patró de to. Si cal traduir el correu real, però, les dades de client demanen una eina aprovada.",
          approved:
            "Bona decisió. El contingut real és de treball i inclou tercers; cal usar les garanties acordades per l'organització.",
          block:
            "No cal abandonar la traducció. Una eina aprovada, o una plantilla amb marcadors que completes localment, permet fer la tasca.",
          depends:
            "Convé comprovar la política, però l'escenari ja diu que és una prova privada amb dades de tercers: no l'enviïs a aquest servei públic.",
        },
      },
      {
        id: "hardware-math",
        number: 3,
        title: "Un càlcul de memòria",
        taskType: "Càlcul",
        prompt:
          "Si la portàtil objectiu té 12 GB de memòria compartida i el sistema en reserva 3, quant em queda per a textures?",
        correctChoice: "depends",
        dataTypes: ["metadata", "confidential"],
        clues: [
          {
            id: "portable-memory-profile",
            label:
              "Un perfil de memòria apunta a una plataforma portàtil concreta",
          },
        ],
        directDisclosures: [
          "Existència d'una plataforma objectiu portàtil",
          "Perfil tècnic de la plataforma",
        ],
        safeAlternative:
          "Resol 12 − 3 localment. Si vols estudiar pressupostos de memòria, usa variables: «Amb M GB compartits i R reservats, expressa el pressupost disponible.»",
        postSendActions: [
          "Comprova si el perfil de maquinari identifica una plataforma sota acord de confidencialitat.",
          "Registra l'exposició si la política del projecte considera la plataforma no anunciada.",
        ],
        feedback: {
          send: "L'operació és trivial, però el context pot revelar una plataforma objectiu. El risc no és el resultat «9»; són els detalls que l'envolten.",
          minimize:
            "Substituir els valors per variables evita el perfil concret. També pots fer directament el càlcul local sense cap servei.",
          approved:
            "És protectora si el perfil està sota confidencialitat, però l'escenari no dona prou política per afirmar-ho. Primer classifica la dada.",
          block:
            "És una cautela possible, però no sabem si les xifres són públiques o confidencials. Cal comprovar el context abans de decidir.",
          depends:
            "Bona decisió. Aquest és el cas frontera: les xifres poden ser públiques o estar sota confidencialitat. Atura't, comprova-ho i redueix el context.",
        },
      },
      {
        id: "cover-letter",
        number: 4,
        title: "Una carta de presentació",
        taskType: "Redacció",
        prompt:
          "Escriu-me una carta per a unes pràctiques: em dic Bru Terrades, estudio segon a ENTI-UB i soc l'autor del projecte de classe.",
        correctChoice: "minimize",
        dataTypes: ["personal"],
        clues: [
          {
            id: "student-identity",
            label: "Bru Terrades queda identificat com a estudiant i autor",
          },
        ],
        directDisclosures: [
          "Nom complet",
          "Centre, curs i autoria del projecte",
        ],
        safeAlternative:
          "«Crea una plantilla de carta per a [nom], estudiant de [centre i curs], que vol destacar [experiència].» Substitueix els marcadors localment.",
        postSendActions: [
          "Revisa quines dades personals eren realment necessàries.",
          "Elimina la conversa si aquesta és la via prevista pel servei i la política.",
        ],
        feedback: {
          send: "La carta final necessita un nom, però el servei no el necessita per proposar-ne l'estructura. El nom, el centre i l'autoria connecten la persona amb la resta de pistes.",
          minimize:
            "Bona decisió. Una plantilla amb marcadors conserva tota la utilitat i evita vincular la identitat real amb l'historial del projecte.",
          approved:
            "És protectora, però una plantilla amb marcadors sol ser suficient per a aquesta tasca. Aplica primer la minimització.",
          block:
            "No cal renunciar a l'ajuda de redacció. Demana l'estructura sense identitat real i personalitza-la després.",
          depends:
            "La política importa, però el principi de minimització ja dona una resposta pràctica: el nom i el centre es poden afegir localment.",
        },
      },
      {
        id: "meeting-notes",
        number: 5,
        title: "Una acta interna",
        taskType: "Resum",
        prompt:
          "Redacta l'acta: a la reunió del 14 de març vam decidir retardar el port a portàtil perquè els recursos nous encara no havien arribat.",
        correctChoice: "approved",
        dataTypes: ["confidential", "intellectualProperty"],
        clues: [
          {
            id: "demo-march14",
            label: "La fita rellevant queda situada el 14 de març",
          },
          {
            id: "port-delay",
            label: "Es revela la decisió de retardar un port portàtil",
          },
          {
            id: "asset-delay",
            label: "Es revela un retard de producció",
          },
        ],
        directDisclosures: [
          "Decisió interna de plataforma",
          "Data d'una fita",
          "Problema de planificació",
        ],
        safeAlternative:
          "Usa l'eina aprovada per a actes. Per obtenir només una estructura, demana una plantilla amb [data], [decisió], [motiu] i [responsable].",
        postSendActions: [
          "Informa pel canal establert per a informació interna de planificació.",
          "Documenta quines decisions i dates s'han compartit.",
          "Revisa si cal ajustar accessos o enllaços relacionats.",
        ],
        feedback: {
          send: "Una acta és informació interna encara que la petició només sigui «redacta». La data, la decisió de plataforma i el retard de producció creen una imatge operativa.",
          minimize:
            "Una plantilla amb marcadors és segura per aprendre l'estructura. Si el servei ha de processar l'acta real, la redacció parcial pot no ser suficient.",
          approved:
            "Bona decisió. El contingut real de l'acta necessita una eina i un flux aprovats per a informació interna.",
          block:
            "No cal deixar de resumir l'acta. Fes-ho dins l'entorn aprovat o usa una plantilla sense contingut real.",
          depends:
            "La política sempre importa, però una acta amb decisions no anunciades ja exigeix aturar el servei públic i canviar de flux.",
        },
      },
      {
        id: "store-copy",
        number: 6,
        title: "El text de la botiga",
        taskType: "Edició",
        prompt:
          "Millora aquest text encara no publicat: «Vessel és un joc d'exploració submarina que arribarà el primer trimestre de 2027.»",
        correctChoice: "approved",
        dataTypes: ["confidential", "intellectualProperty"],
        clues: [
          {
            id: "vessel-from-store",
            label: "El text vincula Vessel amb un joc submarí",
          },
          {
            id: "release-q1",
            label: "La finestra de llançament queda fixada al primer trimestre",
          },
        ],
        directDisclosures: [
          "Títol i gènere no publicats",
          "Finestra de llançament",
        ],
        safeAlternative:
          "Edita el text real amb l'eina aprovada. Per treballar el to en públic, usa «[TÍTOL] és un joc de [GÈNERE] que arribarà [FINESTRA]».",
        postSendActions: [
          "Confirma si el text o la data ja eren públics.",
          "Si no ho eren, registra l'exposició amb el responsable del projecte.",
        ],
        feedback: {
          send: "El text està marcat com a no publicat. Exposa títol, gènere i calendari; que tingui forma de màrqueting no el converteix en públic.",
          minimize:
            "Els marcadors són adequats per provar el to. Per editar el text real complet, però, cal l'entorn aprovat.",
          approved:
            "Bona decisió. El text no publicat és propietat intel·lectual i informació de planificació del projecte.",
          block:
            "La tasca es pot fer dins l'entorn aprovat o amb marcadors. No cal abandonar-la.",
          depends:
            "L'escenari especifica que encara no s'ha publicat. En aquest servei públic, la resposta ja és aturar i canviar d'eina.",
        },
      },
      {
        id: "api-secret",
        number: 7,
        title: "Un fragment amb un secret",
        taskType: "Codi",
        prompt:
          'Corregeix aquest codi: `const DEMO_API_TOKEN = "nr_demo_7K4-XP9"; fetch(url, { token: DEMO_API_TOKEN });`',
        correctChoice: "block",
        dataTypes: ["credential", "confidential"],
        clues: [
          {
            id: "demo-api-key",
            label: "El token de demostració queda exposat íntegrament",
          },
        ],
        directDisclosures: ["Token d'accés reutilitzable"],
        safeAlternative:
          'Revoca o rota el token si és real. Comparteix només `const DEMO_API_TOKEN = "<SECRET>"` i un exemple mínim sense credencials.',
        postSendActions: [
          "Revoca o rota el token immediatament; esborrar el xat no substitueix aquesta acció.",
          "Revisa els registres d'ús i els permisos associats.",
          "Informa pel canal de seguretat o del projecte.",
          "Elimina la conversa si escau com una capa addicional, no com l'única resposta.",
        ],
        feedback: {
          send: "Un token és una credencial. Si el comparteixes, cal tractar-lo com a compromès encara que el xat no sigui públic.",
          minimize:
            "Substituir-lo per `<SECRET>` és el tractament correcte abans d'enviar codi, però si el token ja ha aparegut en un xat cal també revocar-lo o rotar-lo.",
          approved:
            "Una eina aprovada redueix riscos de tractament, però un secret actiu no s'ha d'incloure en el codi compartit. Usa un marcador.",
          block:
            "Bona decisió per al text tal com està. No enviïs el secret; substitueix-lo per un marcador i rota'l si ja l'has compartit.",
          depends:
            "No cal esperar més context: la cadena té forma de credencial activa. Atura l'enviament i tracta-la com un secret.",
        },
      },
      {
        id: "astar",
        number: 8,
        title: "Una pregunta general",
        taskType: "Aprenentatge",
        prompt:
          "Explica'm com funciona l'algorisme A* de cerca de camí i posa'n un exemple inventat.",
        correctChoice: "send",
        dataTypes: ["public"],
        clues: [],
        directDisclosures: [],
        safeAlternative:
          "Es pot enviar tal com està. Continua comprovant que no hi afegeixes després codi, mapes o dades reals del projecte.",
        postSendActions: [],
        feedback: {
          send: "Bona decisió en aquest escenari exacte. És una pregunta general i demana un exemple inventat; no incorpora dades del projecte.",
          minimize:
            "És una precaució comprensible, però aquí no hi ha res real per redactar. El text complet que es mostra és general.",
          approved:
            "Una eina aprovada també serviria, però l'escenari no conté dades de treball. No cal classificar tota pregunta tècnica com a confidencial.",
          block:
            "Bloquejar tota ajuda genera una regla poc útil. La clau és mirar les dades concretes, no prohibir el tipus de tasca.",
          depends:
            "Sempre pots comprovar la política, però el cas mostra tot el contingut: una explicació general amb un exemple inventat.",
        },
      },
      {
        id: "public-article",
        number: 9,
        title: "Un article publicat",
        taskType: "Resum",
        prompt:
          "Resumeix aquest article públic sobre disseny de nivells. No hi afegiré apunts, dades de persones ni material del projecte.",
        correctChoice: "depends",
        dataTypes: ["public", "intellectualProperty"],
        clues: [],
        directDisclosures: [],
        safeAlternative:
          "Comprova la llicència, les condicions del servei i la política del curs. Si no permeten copiar el text complet, treballa amb notes pròpies o una citació breu.",
        postSendActions: [
          "Si vas copiar material no permès, informa't sobre la via de retirada o correcció adequada.",
        ],
        feedback: {
          send: "No hi ha dades del projecte, però «públic» no significa automàticament reutilitzable sense condicions. Cal comprovar llicència i termes.",
          minimize:
            "Treballar amb notes pròpies o fragments necessaris pot ser la millor opció un cop revisades la llicència i la política.",
          approved:
            "Una eina aprovada resol el tractament institucional, però no substitueix els drets d'autor ni les condicions de la font.",
          block:
            "Potser no cal bloquejar la tasca. Primer comprova la llicència i usa només el material permès i necessari.",
          depends:
            "Bona decisió. És un cas dependent: no hi ha confidencialitat del projecte, però sí llicència, termes i minimització del material.",
        },
      },
    ];

    const INFERENCES = [
      {
        id: "project-owner",
        kind: "cumulative",
        title: "Identitat de l'autor i del projecte",
        summary:
          "Es pot vincular Bru Terrades amb Vessel i amb el seu entorn tècnic.",
        consequence:
          "Una persona o compte queda associat a propietat intel·lectual encara no publicada.",
        confidence: "alta",
        assumptions: [
          "Les converses pertanyen al mateix compte.",
          "El nom Vessel és prou distintiu dins d'aquest context.",
        ],
        evidenceRules: [
          {
            id: "owner-via-stack",
            label: "Via de la traça d'error",
            allOf: ["vessel-from-stack", "student-identity"],
          },
          {
            id: "owner-via-store",
            label: "Via del text de botiga",
            allOf: ["vessel-from-store", "student-identity"],
          },
        ],
      },
      {
        id: "client-milestone",
        kind: "cumulative",
        title: "Client i calendari d'una fita",
        summary:
          "Nau Roja es pot relacionar amb una fita del 14 de març i un llançament previst per al primer trimestre.",
        consequence:
          "La combinació exposa una relació comercial i un calendari operatiu.",
        confidence: "mitjana",
        assumptions: [
          "La reunió del 14 de març forma part del mateix encàrrec.",
          "La finestra de llançament continua vigent.",
        ],
        evidenceRules: [
          {
            id: "client-calendar-path",
            label: "Relació + data + finestra",
            allOf: ["client-nau-roja", "demo-march14", "release-q1"],
          },
        ],
      },
      {
        id: "portable-port",
        kind: "cumulative",
        title: "Port a una plataforma portàtil",
        summary:
          "El perfil de maquinari i l'acta apunten conjuntament a un port portàtil no anunciat.",
        consequence:
          "Es revela una decisió de plataforma que pot estar sota confidencialitat.",
        confidence: "alta",
        assumptions: [
          "El perfil de memòria i la decisió de l'acta fan referència a la mateixa plataforma.",
        ],
        evidenceRules: [
          {
            id: "portable-path",
            label: "Maquinari + decisió interna",
            allOf: ["portable-memory-profile", "port-delay"],
          },
        ],
      },
      {
        id: "delivery-pressure",
        kind: "cumulative",
        title: "Pressió sobre el calendari",
        summary:
          "La data, el retard de recursos i la finestra de llançament permeten inferir risc de planificació.",
        consequence:
          "Un tercer pot obtenir informació sobre l'estat i la vulnerabilitat operativa del projecte.",
        confidence: "mitjana",
        assumptions: [
          "El retard continua afectant la planificació.",
          "La data de l'acta i la finestra de llançament són comparables.",
        ],
        evidenceRules: [
          {
            id: "pressure-path",
            label: "Data + retard + llançament",
            allOf: ["demo-march14", "asset-delay", "release-q1"],
          },
        ],
      },
      {
        id: "credential-exposure",
        kind: "direct",
        title: "Credencial reutilitzable",
        summary:
          "El token de demostració queda disponible per a qui pugui accedir a la conversa.",
        consequence:
          "Un secret exposat s'ha de tractar com a compromès i rotar o revocar.",
        confidence: "alta",
        assumptions: [
          "La cadena és un token real o reutilitzable i no un valor sintètic.",
        ],
        evidenceRules: [
          {
            id: "credential-path",
            label: "Exposició directa",
            allOf: ["demo-api-key"],
          },
        ],
      },
    ];

    const REPAIR_CASES = [
      {
        id: "repair-stack",
        scenarioId: "stack-trace",
        title: "Redueix una traça",
        question: "Quina versió conserva millor la utilitat tècnica?",
        options: [
          {
            id: "full",
            text: "Envia la ruta completa i afegeix també el repositori perquè hi hagi més context.",
            correct: false,
            explanation:
              "Afegeix encara més metadades i propietat intel·lectual de la necessària.",
          },
          {
            id: "minimal",
            text: "Substitueix la ruta per <ruta-redactada> i comparteix només un fragment mínim reproduïble.",
            correct: true,
            explanation:
              "Manté l'error i el codi necessari sense el nom intern ni l'estructura del projecte.",
          },
          {
            id: "screenshot",
            text: "Envia una captura de tota la pantalla perquè el text no es pugui copiar.",
            correct: false,
            explanation:
              "Una captura continua revelant el mateix contingut i pot afegir pestanyes, noms o notificacions.",
          },
        ],
      },
      {
        id: "repair-copy",
        scenarioId: "store-copy",
        title: "Protegeix text no publicat",
        question: "Quina és la millor via per editar el text real?",
        options: [
          {
            id: "paid",
            text: "Espera a tenir un pla de pagament; pagar garanteix que el text és segur.",
            correct: false,
            explanation:
              "El preu no defineix per si sol retenció, usos, accés o adequació contractual.",
          },
          {
            id: "approved",
            text: "Usa l'eina aprovada; si només proves el to en públic, substitueix títol, gènere i data per marcadors.",
            correct: true,
            explanation:
              "Combina el control organitzatiu amb minimització quan el contingut real no és necessari.",
          },
          {
            id: "split",
            text: "Reparteix la frase entre tres xats públics perquè cap servei vegi el text complet.",
            correct: false,
            explanation:
              "Fragmentar no crea una garantia i multiplica els destinataris del contingut.",
          },
        ],
      },
      {
        id: "repair-secret",
        scenarioId: "api-secret",
        title: "Tracta un secret",
        question: "Què fas amb el token abans de demanar ajuda?",
        options: [
          {
            id: "mask",
            text: "Canvia'l per <SECRET>; si ja era real i s'ha compartit, rota'l o revoca'l.",
            correct: true,
            explanation:
              "El codi continua sent comprensible i la credencial deixa de ser reutilitzable.",
          },
          {
            id: "shorten",
            text: "Mostra només la meitat del token real; així encara es veu el format.",
            correct: false,
            explanation:
              "Una part d'un secret continua sent informació innecessària i pot facilitar-ne l'abús.",
          },
          {
            id: "delete-only",
            text: "Envia'l i després esborra el xat; no cal fer res més.",
            correct: false,
            explanation:
              "Esborrar pot ser una capa útil, però no substitueix la rotació o revocació d'un secret exposat.",
          },
        ],
      },
    ];

    const INCIDENT_OPTIONS = [
      {
        id: "rotate",
        label: "Revocar o rotar el token immediatament",
        correct: true,
        explanation:
          "Redueix directament la capacitat d'utilitzar la credencial exposada.",
      },
      {
        id: "review",
        label: "Revisar registres, permisos i possible ús del token",
        correct: true,
        explanation: "Ajuda a determinar l'abast i si calen més mesures.",
      },
      {
        id: "report",
        label: "Informar pel canal de seguretat o del projecte",
        correct: true,
        explanation:
          "Permet coordinar la resposta i complir la política interna.",
      },
      {
        id: "delete",
        label: "Eliminar la conversa si el servei i la política ho preveuen",
        correct: true,
        explanation:
          "Pot reduir part de l'exposició, però és una capa addicional i no una garantia universal.",
      },
      {
        id: "ignore",
        label:
          "No fer res: si no podem desfer qualsevol ús posterior, cap acció serveix",
        correct: false,
        explanation:
          "És una falsa dicotomia. Rotar, revisar i informar continuen reduint risc encara que no controlis tots els sistemes.",
      },
      {
        id: "publish",
        label: "Publicar el token al grup general perquè tothom sàpiga quin és",
        correct: false,
        explanation:
          "Amplia l'exposició. L'avís ha de circular pel canal adequat sense reproduir el secret.",
      },
    ];

    const TRANSFER = {
      title: "Cas nou: dades d'un playtest",
      prompt:
        "Vols agrupar comentaris d'un playtest que inclouen correus electrònics, edats i observacions lliures. Quina decisió aplica millor ATURA?",
      options: [
        {
          id: "send",
          label:
            "Enviar-ho al servei públic: agrupar comentaris és una tasca estadística.",
          correct: false,
          explanation:
            "La finalitat no elimina les dades personals ni el text lliure potencialment sensible.",
        },
        {
          id: "anonymous-public",
          label:
            "Treure només els correus i assumir que qualsevol servei públic ja és adequat.",
          correct: false,
          explanation:
            "L'edat i el text lliure encara poden permetre identificació o contenir informació no prevista.",
        },
        {
          id: "approved-minimum",
          label:
            "Comprovar base, política i eina aprovada; minimitzar o pseudonimitzar abans de processar.",
          correct: true,
          explanation:
            "Combina autorització, classificació, minimització i un entorn adequat.",
        },
        {
          id: "paid",
          label:
            "Esperar un pla de pagament, perquè el preu substitueix la revisió de la política.",
          correct: false,
          explanation:
            "El preu no substitueix contracte, configuració, retenció, finalitat ni controls.",
        },
      ],
    };

    const THREAT_MODELS = [
      {
        title: "Servei públic de consum",
        authorization: "No aprovat per a dades de projecte",
        handling: "Retenció i usos segons el servei i la configuració",
        decision: "Dades públiques o sintètiques; minimitza sempre",
      },
      {
        title: "Servei institucional aprovat",
        authorization: "Aprovat només per a les categories acordades",
        handling: "Contracte, configuració i accessos definits",
        decision:
          "Segueix la classificació; l'aprovació no justifica secrets innecessaris",
      },
      {
        title: "Model local controlat",
        authorization: "Depèn de l'equip i del desplegament",
        handling:
          "Pot limitar destinataris, però encara necessita seguretat i governança",
        decision: "Minimitza, controla accessos i evita credencials actives",
      },
    ];

    return Object.freeze({
      ATURA,
      CHOICES,
      DATA_TYPES,
      INCIDENT_OPTIONS,
      INFERENCES,
      REPAIR_CASES,
      SCENARIOS,
      STORAGE_VERSION,
      THREAT_MODELS,
      TRANSFER,
      VERSION,
    });
  },
);
