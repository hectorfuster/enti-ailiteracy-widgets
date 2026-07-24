# Registre de canvis

Els canvis de contingut es classifiquen com a jurídics, factuals, pedagògics o
tècnics. Una actualització normativa o de política exigeix seguir
`CONTENT-GOVERNANCE.md`.

## 2.1.0 · 2026-07-24

### Simplificació pedagògica

- Substitució de cinc pantalles de justificació per un únic mirall resumit amb
  cinc apartats opcionals.
- Eliminació dels motius, disposicions, revisions i camps de text.
- Reducció del compromís final a una sola tria reutilitzable.
- Durada objectiu reduïda de 6–8 a 4–6 minuts.
- Conservació dels cinc principis, els dos rols, la incertesa, el cas de
  transferència i els resultats no punitius.

### Tècnic i privacitat

- Estat local reduït i migrat a `enti-b8-consent-mirror-v3`.
- Contracte del widget incrementat a `2.1.0`; l’esquema privat de Moodle no
  canvia.
- Proves actualitzades per garantir que el mirall no conté formularis ni text
  lliure.

## 2.0.0 · 2026-07-24

### Pedagògic

- Substitució del marcador de distància per cinc principis recíprocs.
- Flux orientació → estudi → predicció → creador → mirall → transferència →
  compromís.
- Resultats neutres, incertesa vàlida, raons explícites i revisió sense perdre
  la primera resposta.
- Cas de transferència, principi reutilitzable, checklist i guia de
  facilitació.

### Jurídic i factual

- Àmbit UE/Espanya, dates de revisió i rol responsable visibles.
- Separació de marc, evidència, política institucional i preferència.
- Fonts oficials EUR-Lex, Comissió Europea, EUIPO i Ministeri de Cultura.
- Incorporació de la plantilla de resum d’entrenament, el Codi voluntari GPAI
  i les directrius GPAI vigents.

### Privacitat i Moodle

- Runtime sense recursos de tercers ni analítica.
- Persistència només de pestanya, reset real i funcionament sense
  `sessionStorage`.
- Esquema tancat de progrés, finalització i alçada amb origen exacte.
- Finalització una vegada per intent i cap resposta, motiu o text al pare.
- Enllaç opcional HTTPS a la política del curs, sense precàrrega.

### Accessibilitat i resiliència

- Radios natius, `fieldset`/`legend`, focus a cada pantalla, errors enfocats,
  progrés semàntic i estat concís.
- Reflow a 320 px, colors forçats, moviment reduït, impressió i fallback sense
  JavaScript.
- CSP estricta, sortida escapada i recuperació d’estat corrupte.

### Qualitat

- Separació de contingut, nucli, UI, integració, estils i proves.
- 12 proves unitàries/de contingut/contracte i 14 proves de navegador.
- Validació axe WCAG A/AA, xarxa offline, iframe i integració contínua.
