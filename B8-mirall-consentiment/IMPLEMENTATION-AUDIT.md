# Auditoria d’implementació B8

Data de l’auditoria: 2026-07-24  
Versió del widget: 2.0.0  
Contracte de contingut: UE/Espanya, revisat el 2026-07-24

Aquest document contrasta la implementació amb la definició de fet de
`IMPROVEMENT-ROADMAP.md`. Separa l’evidència reproduïble del repositori de les
validacions institucionals que necessiten persones, comptes o entorns reals.

## Resultat tècnic reproduïble

Ordre executada en una instal·lació local:

```powershell
npm run check:all
```

Resultat:

- format Prettier: correcte;
- validació estàtica i CSP: correcta;
- 12/12 proves unitàries, de contingut i de contracte: correctes;
- 14/14 proves de navegador: correctes;
- axe WCAG A/AA a orientació, mirall i finalització: cap infracció;
- `git diff --check`: correcte.

La inspecció manual al navegador integrat va confirmar UTF-8 català, jerarquia
visual, focus al títol de la pantalla, reflow sense amplada excedent, absència
de recursos externs de runtime i absència d’errors o avisos de consola. A
1.265 × 720 CSS px, el botó de començament queda completament dins del primer
viewport després de mostrar progrés, privacitat i política del curs.

La comprovació optativa `npm run sources:check` va confirmar resposta dels
recursos EUR-Lex i Comissió Europea, va identificar correctament la restricció
automatitzada d’EUIPO i va deixar com a inconclusiva la comprovació de transport
del Ministeri de Cultura. Les pàgines oficials d’EUIPO i el document del
Ministeri es van verificar manualment el 2026-07-24.

## Matriu de requisits implementats

| Requisit                                  | Evidència                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Principis recíprocs, no distància d’índex | `content.js` assigna polítiques semàntiques equivalents als dos rols; `mirror-core.js` només compara `policy`.                      |
| Cinc parells comparables                  | Les cinc dimensions tenen principi, escenari d’estudi, contrapart de creador, context, prova i fonts.                               |
| Resultats no punitius                     | Només s’utilitzen principi compartit, diferència examinada, per revisar i informació pendent.                                       |
| Incertesa legítima                        | Cada dimensió conté `need-evidence`; `pending` és una disposició vàlida.                                                            |
| Diferència explicable i revisable         | Hi ha nou raons, tres disposicions i revisió dels dos costats sense esborrar la primera resposta.                                   |
| Flux guiat complet                        | Orientació → estudi → predicció → creador → cinc miralls → transferència → compromís → finalització.                                |
| Transferència i sortida reutilitzable     | Cas nou, estàndard mínim, evidència concreta, resum copiable/imprimible i cinc preguntes.                                           |
| Context jurídic prudent                   | Àmbit i dates visibles, fonts oficials, context expandible i avís de no assessorament jurídic.                                      |
| Privacitat local-first                    | Sense peticions de tercers; `sessionStorage` versionat, divulgat i reiniciable; text opcional local.                                |
| Moodle mínim                              | Esdeveniments només de progrés, finalització i alçada; cap resposta, motiu, nota o ID d’intent.                                     |
| Origen segur                              | `parentOrigin` HTTP(S) exacte; `targetOrigin` exacte; receptor valida `source`, origen, widget, versió, esquema, claus i rangs.     |
| Finalització significativa i única        | Exigeix cinc respostes per rol, cinc reflexions, transferència revisada i compromís; la marca d’emissió es desa abans del missatge. |
| Accessibilitat semàntica                  | `main`, `fieldset`, `legend`, radios natius, `progress`, estat concís, focus programàtic, errors enfocats i diàleg natiu.           |
| Preferències i reflow                     | Objectius de 44 px, límits visibles, 320 px, moviment reduït, colors forçats i impressió.                                           |
| Resiliència                               | Fitxers separats compatibles amb CSP, fallback sense JavaScript, recuperació d’estat corrupte i funcionament sense emmagatzematge.  |
| Separació i mantenibilitat                | Contingut, nucli, UI, estils, integració, proves i scripts tenen responsabilitats separades.                                        |
| Integració contínua                       | El workflow B8 instal·la Chromium i bloqueja canvis que trenquen format, estàtica, unitat, navegador, accessibilitat o fonts.       |
| Governança                                | Política de fonts, revisió anual/extraordinària, rols responsables, procés de canvi i criteris de retirada.                         |
| Validació d’aprenentatge                  | Protocol de pilot amb tasques, rúbrica, mesures, llindars i guió posterior, sense telemetria de respostes.                          |
| Política del curs                         | Avís diferenciat i enllaç HTTPS opcional, escapat i no precarregat, configurable des de Moodle.                                     |
| Facilitació                               | Debrief, malentesos, privacitat i quatre casos alternatius sense exposar respostes individuals.                                     |

## Cobertura automatitzada

Les proves comproven:

- unicitat i integritat de les cinc dimensions;
- correspondència de polítiques als dos rols;
- les 80 combinacions de resposta possibles dins de cada dimensió;
- coincidència, diferència, revisió, incertesa i estat incomplet;
- notes limitades i estat restaurat coherent;
- finalització basada en etapes, no creences;
- esquema tancat de missatges i rebuig d’origen o finestra incorrectes;
- flux complet compartit i flux amb diferències/revisió;
- error obligatori visible i enfocat;
- persistència vàlida i descart d’estat corrupte;
- fletxes de teclat en radios natius;
- axe WCAG A/AA en pantalles representatives;
- reflow a 320 px i moviment reduït;
- xarxa de producció limitada a l’origen local;
- finalització completa amb la xarxa desconnectada després de carregar;
- finalització completa quan `sessionStorage` no està disponible;
- reset a un únic estat inicial sense registre de sessió residual;
- text de l’alumnat escapat com a text, mai com a marcatge executable;
- fallback útil amb JavaScript desactivat;
- selecció, focus i reflow amb colors forçats;
- còpia privada del resum, sol·licitud d’impressió i absència de decisions de
  rol al text copiat;
- iframe, redimensionament, rebuig de camp privat i una finalització per intent,
  també després de recarregar, reiniciar i completar un intent nou.

## Portes humanes i institucionals pendents

El codi no pot fabricar aquesta evidència. Abans d’etiquetar la versió com a
validada per a docència, cal completar i signar `VALIDATION.md`:

1. aprovació del constructe i dels cinc mapatges per la persona responsable del
   curs;
2. revisió formal jurídica/factual i revisió editorial catalana;
3. prova manual amb les tecnologies de suport del parc real;
4. pilot amb alumnat representatiu que confirmi 6–8 minuts i transferència;
5. prova al Moodle objectiu amb comptes d’estudiant/docent, tema, política de
   dominis, còpia/restauració, finalització, app mòbil i absència de scroll
   intern;
6. incorporació o confirmació de la política específica del curs, que no està
   present al repositori i no s’ha d’inventar.

Els noms, dates i incidències s’han de registrar a la taula de signatures de
`VALIDATION.md`. Aquestes portes són deliberadament explícites: mantenen
l’activitat honesta sobre què està verificat i què encara requereix el context
institucional.
