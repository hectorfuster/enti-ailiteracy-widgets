# B7 — El brief

Laboratori de decisions per al curs d’alfabetització en IA d’ENTI-UB.

L’activitat no pregunta “quina eina és millor?”. Fa practicar una competència
més durable: convertir un encàrrec en un brief, identificar què falta saber,
prioritzar dimensions, dissenyar un flux amb salvaguardes i definir què obligaria
a revisar la decisió.

## Resultat d’aprenentatge

En acabar, l’estudiant hauria de poder:

- aplicar **cost, privadesa, transparència, capacitat i control** a una tasca
  nova;
- separar fets, hipòtesis i incerteses;
- justificar una família d’eines sota condicions explícites;
- afegir minimització, proves, revisió humana, mostreig o plans de sortida;
- explicar què mesuraria per mantenir o canviar la decisió;
- distingir obertura, execució local i privadesa.

## Flux

1. Llegeix les cinc dimensions i la distinció “obert no vol dir privat”.
2. Resol tres briefs separats per mesos:
   - diàleg provisional a partir de lore confidencial;
   - guió públic a partir d’entrades públiques i internes;
   - anàlisi recurrent de 40.000 ressenyes.
3. A cada brief:
   - prioritza dues dimensions;
   - investiga un fet;
   - tria un flux;
   - afegeix una salvaguarda;
   - revisa i compromet la hipòtesi.
4. Al brief següent, llegeix primer tots els fets nous i consulta la
   conseqüència anterior en un bloc separat i desplegable.
5. Compara les tres decisions en un mapa compacte i obre només l’anàlisi que
   necessitis, sense puntuació ni “família guanyadora”.
6. Aplica l’estructura a un cas nou de moderació de comunitat.

## Principis de contingut

- Les decisions són condicionals; no hi ha una família universalment correcta.
- “Obert”, “local” i “privat” no són sinònims.
- Un DPA és una peça de diligència, no una garantia completa.
- “Públic” no elimina automàticament privadesa, drets, política o necessitat de
  minimitzar.
- La capacitat es prova contra una rúbrica de la tasca.
- El cost inclou quota o ús, maquinari, energia, operació, hores humanes i canvi
  de solució.
- Una mostra aleatòria de 200 pot estimar proporcions globals amb incertesa; no
  és automàticament esbiaixada. No garanteix incidències rares ni cobertura per
  segment.
- El control inclou versió, reproduïbilitat, restriccions, retirada i pla de
  sortida.

Consulta [CONTENT-GOVERNANCE.md](CONTENT-GOVERNANCE.md) per a les invariants i
les fonts que han de revisar-se quan canviï el capítol.

## Privadesa

- No hi ha IA en directe, analítica, cookies ni peticions a tercers.
- Les respostes són opcions estructurades; no es demana text lliure.
- El progrés es desa només a `sessionStorage` amb la clau
  `enti-b7-el-brief-v2`.
- Reiniciar esborra només aquesta clau.
- Quan hi ha una integració Moodle configurada, el widget envia només:
  - pas i percentatge;
  - finalització i si s’ha restaurat una sessió;
  - alçada.
- No s’envien dimensions, preguntes, fluxos, salvaguardes ni resultats
  individuals.

## Execució local

```powershell
cd B7-el-brief
npm.cmd run serve
```

Obre `http://127.0.0.1:43177/`.

## Verificació

```powershell
cd B7-el-brief
npm.cmd install --ignore-scripts
npm.cmd run check:all
```

`check:all` inclou:

- format i integritat estàtica;
- pressupost de mida;
- proves de lògica sobre totes les combinacions;
- fluxos reals de navegador;
- accessibilitat automatitzada;
- reflow a 320 px;
- moviment reduït;
- recuperació i estat corrupte;
- fallback sense JavaScript;
- zero peticions a tercers;
- missatgeria iframe i rebuig de falsificacions.

Consulta [VALIDATION.md](VALIDATION.md) per a l’evidència registrada i les
comprovacions manuals.

## Integració amb Moodle

El widget emet:

- `enti-widget-progress`;
- `enti-widget-complete`;
- `enti-widget-resize`.

Els esdeveniments existeixen com a `CustomEvent` local i com a `postMessage`
només quan l’URL inclou un `parentOrigin` HTTP(S) vàlid.

Exemple:

```html
<script src="integration/moodle-wrapper.js"></script>
<script>
  const iframe = document.querySelector("#b7-el-brief");
  iframe.src = ENTIBriefMoodleBridge.withParentOrigin(
    "https://widgets.example.edu/B7-el-brief/",
  );

  const bridge = ENTIBriefMoodleBridge.create({
    iframe,
    widgetOrigin: "https://widgets.example.edu",
    onProgress(outcome) {
      // Actualitza el contenidor del curs.
    },
    onComplete(outcome) {
      // Tradueix completed=true a l’API de finalització usada pel curs.
    },
    onResize({ height }) {
      iframe.style.height = `${height}px`;
    },
  });
</script>
```

La finalització només s’emet després del cas de transferència. No hi ha nota de
correcció. El contenidor valida origen exacte, finestra emissora, widget, versió,
tipus i esquema abans d’actuar.

Exemple de finalització:

```json
{
  "type": "enti-widget-complete",
  "widget": "b7-el-brief",
  "version": "2.1.0",
  "outcome": {
    "completed": true,
    "restored": false
  }
}
```

`tests/iframe-harness.html` és el contenidor de referència. La finalització
d’intent d’H5P i la finalització d’activitat de Moodle no s’han de considerar
equivalents sense validar la configuració del curs.

## Arquitectura

- `index.html`: estructura semàntica i CSP sense scripts inline;
- `styles.css`: presentació responsiva, focus, moviment reduït, colors forçats i
  impressió;
- `scenario-data.js`: dimensions, briefs, fluxos, salvaguardes i transferència;
- `brief-core.js`: estat pur, sanejament, progrés i avaluació condicional;
- `app.js`: renderitzat, focus, persistència i missatgeria;
- `integration/moodle-wrapper.js`: adaptador segur del contenidor;
- `tests/`: proves de lògica, navegador i iframe.

La producció continua sent estàtica, determinista, sense framework i amb un
pressupost total de 160 KiB.

## Desplegament

Serveix el directori complet sota HTTPS i UTF-8. La capçalera de producció ha de:

- permetre l’origen Moodle previst amb `frame-ancestors`;
- conservar `connect-src 'none'`;
- no permetre scripts ni estils inline;
- desactivar càmera, micròfon i geolocalització;
- aplicar `nosniff` i una política de referència restrictiva.

La versió actual de contingut és `2.1.0`, revisada el 2026-07-24.

## Documents

- [Governança de contingut](CONTENT-GOVERNANCE.md)
- [Validació](VALIDATION.md)
- [Avisos de tercers](THIRD-PARTY-NOTICES.md)
