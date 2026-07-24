# B3 — Laboratori del token següent

Activitat local-first per al curs d'alfabetització en IA d'ENTI-UB. Ensenya
predicció del token següent, mostreig, temperatura, probabilitat versus veritat
i el bucle autoregressiu.

## Principis del disseny

- Les probabilitats són una simulació didàctica explícita, no la sortida d'un
  model.
- Cada candidat visible és exactament un token real de `o200k_base`, verificat
  amb `gpt-tokenizer@3.4.0`.
- Cada vocabulari tancat suma 100 %. La temperatura s'aplica a tots els tokens
  abans d'agrupar la cua només per visualitzar.
- Les mostres repetides són extraccions independents. Mai no s'afegeixen a una
  frase sense una distribució nova condicionada pel context resultant.
- El progrés es manté visible en una franja flotant discreta: recompte, barra i
  cinc passos; només el pas actual rep èmfasi.
- No hi ha dependències, fonts, analítica ni crides de model en temps
  d'execució.

## Execució local

Es pot servir amb qualsevol servidor estàtic:

```powershell
node scripts/static-server.cjs 4174
```

Obre `http://127.0.0.1:4174/`.

## Validació

```powershell
npm ci
npm run check
npm run test:browser
```

`npm run check` valida format, estructura estàtica, probabilitats, invariants de
temperatura, mostreig reproduïble, el resum SHA-256 del dataset, el pressupost
de mida i la correspondència exacta amb `o200k_base`. `npm run check:all` hi
afegeix les proves de navegador del flux complet, accessibilitat, teclat,
moviment reduït, privacitat de xarxa i reflow a 320 px.

Les versions i integritats transitives queden fixades a `package-lock.json`.
El mateix procés s'executa a
`.github/workflows/b3-token-predictor.yml`.

## Contracte Moodle

El widget emet tres esdeveniments DOM:

- `enti-widget-progress`
- `enti-widget-complete`
- `enti-widget-resize`

En iframe, només `enti-widget-complete` i `enti-widget-resize` es publiquen al
pare. L'origen de destinació es resol des de `parentOrigin` o un
`document.referrer` HTTP(S) vàlid; mai s'utilitza `*`.

El contenidor ha de respondre amb `enti-widget-complete-ack` només després que
Moodle accepti l'actualització. Fins llavors, la interfície no afirma que Moodle
hagi registrat res. Vegeu `integration/README.md` i
`integration/moodle-wrapper-example.js`.

Exemple de finalització:

```json
{
  "type": "enti-widget-complete",
  "widget": "b3-token-predictor",
  "version": "3.0.0",
  "completionId": "b3-550e8400-e29b-41d4-a716-446655440000",
  "outcome": {
    "completed": true,
    "predictedScenarios": 3,
    "sampleCount": 13,
    "temperatureBandCount": 2,
    "reflectionCorrect": true,
    "datasetVersion": "2026.07.24"
  }
}
```

La finalització requereix:

1. predir almenys tres escenaris;
2. acumular almenys deu mostres;
3. mostrejar en dues zones de temperatura;
4. respondre correctament la reflexió;
5. activar `Finalitza l'activitat`.

`postMessage` no modifica Moodle per si sol. El contenidor Moodle ha de validar
l'origen, la versió, l'esquema i `completionId`, i traduir l'esdeveniment a
l'API de finalització corresponent. Els reintents reutilitzen el mateix
`completionId`; el contenidor l'ha de tractar com una clau d'idempotència. El
widget desa la confirmació i no reemet una finalització ja acceptada.

## Persistència i privacitat

Es desa en `localStorage`:

- escenari actual;
- prediccions sobre escenaris fixos;
- recomptes agregats de mostres;
- zones de temperatura visitades;
- llavor de reproduïbilitat;
- reflexió i finalització;
- identificador intern de finalització i confirmació del contenidor.

No hi ha cap camp de text lliure de l'alumne. En mode iframe només es
transmeten la finalització, les mètriques agregades del contracte i l'alçada
necessària; mai l'historial de mostres.

## Seguretat i desplegament

La pàgina inclou una política CSP local estricta i no conté APIs de xarxa. En
producció, el servidor també ha d'enviar `frame-ancestors` amb l'origen exacte
de Moodle i les capçaleres descrites a `SECURITY.md`.
