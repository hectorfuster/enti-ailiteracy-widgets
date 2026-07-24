# B4 — La paradoxa del rendiment

Activitat local-first per al mòdul 2, capítol 2, del curs
d’alfabetització en IA d’ENTI-UB.

La versió 3 separa explícitament tres fenòmens que no s’han d’interpretar com
si fossin equivalents:

1. **Rendiment assistit:** completar una tasca correctament mentre l’eina és
   present.
2. **Transferència:** reconstruir el procediment en un problema nou sense
   ajuda.
3. **Fiabilitat:** decidir què fer amb una recomanació segura però incorrecta.

## Flux d’aprenentatge

1. Resol dos problemes breus sense assistència i indica la confiança.
2. Practica dues mecàniques de joc:
   - una amb una resposta completa;
   - una amb un tutor que divideix el problema i ofereix pistes.
3. Resol dos problemes de transferència sense IA.
4. Compromet una resposta, revisa una recomanació errònia simulada i torna a
   respondre.
5. Separa els resultats personals descriptius de l’evidència experimental.
6. Aplica la idea a una nova situació i tria una barrera de protecció
   reutilitzable.

L’assignació de mecànica a tipus d’ajuda està contrabalançada entre dues
variants. No es presenta aquesta comparació individual com un efecte causal.

## Base empírica

El debrief cita i contextualitza:

> Bastani, H., Bastani, O., Sungu, A., Ge, H., Kabakcı, Ö., & Mariman, R.
> (2025). _Generative AI without guardrails can harm learning: Evidence from
> high school mathematics_. PNAS, 122(26), e2422633122.
> <https://doi.org/10.1073/pnas.2422633122>

La interfície distingeix l’experiment publicat d’aquesta experiència individual
i descriu GPT Base i GPT Tutor sense identificar-los incorrectament amb el
producte públic ChatGPT.

## Privacitat

- No hi ha cap servei analític ni petició de xarxa de producció.
- L’assistent és contingut determinista escrit prèviament; no és una IA en
  directe.
- El progrés i les respostes es conserven a `sessionStorage`, només durant la
  sessió de la pestanya.
- Els missatges cap al contenidor Moodle inclouen només progrés, alçada i
  finalització. No inclouen respostes, confiança ni el compromís escollit.
- Reiniciar esborra la clau `enti-b4-performance-paradox-v3`.

## Execució local

```powershell
cd B4-performance-paradox
node scripts/static-server.mjs
```

Obre:

```text
http://127.0.0.1:43174/
```

El paràmetre opcional `variant=a` o `variant=b` fixa la variant
contrabalançada per a revisió i QA. No codifica dades de l’alumne.

## Verificació

```powershell
cd B4-performance-paradox
npm.cmd install --ignore-scripts
npm.cmd run check
```

Per executar també les proves reals de navegador, iframe, accessibilitat,
persistència, privacitat i disseny responsiu:

```powershell
npx.cmd playwright install chromium
npm.cmd run check:all
```

Consulta [VALIDATION.md](VALIDATION.md) per veure l’evidència registrada i les
comprovacions manuals que encara corresponen al propietari del curs.

## Integració amb Moodle

El widget emet un `CustomEvent` al document i, quan està incrustat amb un origen
pare validat, un `postMessage` per a:

- `enti-widget-progress`
- `enti-widget-complete`
- `enti-widget-resize`

Passa l’origen exacte del contenidor:

```text
index.html?parentOrigin=https%3A%2F%2Fmoodle.example.edu
```

Exemple de finalització:

```json
{
  "type": "enti-widget-complete",
  "widget": "b4-performance-paradox",
  "version": "3.0.0",
  "outcome": {
    "completed": true,
    "restored": false
  }
}
```

El contenidor és responsable de traduir aquest resultat a l’API de finalització
que faci servir el curs. La implementació de referència valida `event.source`,
l’origen exacte, el widget, la versió i l’esquema abans de cridar cap callback:

```html
<script src="integration/moodle-wrapper.js"></script>
<script>
  const iframe = document.querySelector("#b4-performance-paradox");
  iframe.src =
    ENTIPerformanceParadoxMoodleBridge.withParentOrigin(
      "https://widgets.example.edu/B4-performance-paradox/",
    );

  const bridge = ENTIPerformanceParadoxMoodleBridge.create({
    iframe,
    widgetOrigin: "https://widgets.example.edu",
    onComplete(outcome) {
      // Registra la finalització amb l’API Moodle usada pel curs.
    },
    onResize({ height }) {
      iframe.style.height = `${height}px`;
    },
  });
<\/script>
```

`tests/iframe-harness.html` proporciona un contenidor interactiu de referència.

## Desplegament

Serveix tots els fitxers del directori sota HTTPS i amb UTF-8. El servidor ha de
permetre que el domini Moodle incrusti el widget mitjançant una política
`frame-ancestors` explícita. La política CSP de referència no permet connexions,
scripts inline, objectes ni formularis cap a tercers.

Els fitxers de producció no depenen dels paquets de desenvolupament descrits a
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
