# Privacitat i tractament de dades

## Resum per a l’alumnat

Les decisions es processen al navegador. Es conserven a `sessionStorage`, és a
dir, només a la pestanya actual, per permetre recuperar el pas després d’una
recàrrega. Reiniciar l’activitat n’elimina la còpia. Tancar la pestanya o la
sessió del navegador normalment també l’elimina. El widget no demana text
lliure.

L’activitat no carrega analítica, fonts web, píxels, anuncis ni recursos de
tercers. Els enllaços de fonts oficials només generen una petició externa quan
la persona els obre deliberadament. Si Moodle configura `coursePolicyUrl`, el
mateix s’aplica a l’enllaç HTTPS de la política del curs: no es precarrega.

## Dades locals

Clau de sessió: `enti-b8-consent-mirror-v3`.

La còpia local inclou:

- pas actual i identificador aleatori de l’intent;
- decisions dels dos rols i predicció;
- marca de revisió del mirall;
- cas de transferència i estàndard final;
- marques de finalització i d’emissió.

No s’utilitzen cookies, `localStorage`, IndexedDB ni emmagatzematge de servidor.
La còpia no està xifrada i no s’ha de reutilitzar per afegir informació
personal, sensible o confidencial.

## Dades que pot rebre Moodle

Només hi ha comunicació amb el pare si:

1. la pàgina està realment dins d’un iframe;
2. l’URL conté un `parentOrigin` HTTP(S) vàlid;
3. el widget envia a aquest origen exacte.

El contracte permet exclusivament:

- progrés: identificador i etiqueta del pas, número, percentatge i estat de
  finalització;
- finalització: `completed: true` i si l’intent s’havia restaurat;
- mida: alçada sencera del document.

No permet opcions, polítiques, motius, text lliure, resultats per dimensió ni
l’identificador de l’intent. El contenidor de referència torna a validar
l’origen, la finestra, la versió, les claus i els rangs abans d’acceptar res.

## Responsabilitat del desplegament

La institució ha de documentar la base, finalitat, retenció i visibilitat del
registre de finalització que configuri a Moodle. Si només cal una activitat
formativa sense seguiment, es pot ometre `parentOrigin` i no hi haurà
`postMessage` cap al pare.

No s’ha d’ampliar l’esquema per recollir respostes sense una nova avaluació
pedagògica, de privacitat i proporcionalitat, una informació clara a
l’alumnat i una nova versió principal del contracte.
