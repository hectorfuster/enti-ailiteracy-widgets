# Governança de contingut de B7

Versió d’escenari: 2.0.0  
Data de revisió: 2026-07-24

## Font de veritat del curs

B7 aplica exactament les cinc dimensions del capítol:

1. **Cost:** quota o ús, maquinari, energia, operació, temps humà i cost de
   canviar.
2. **Privadesa:** al núvol depèn del contracte, la configuració i l’operació; en
   local, les dades d’entrada no han de viatjar.
3. **Transparència:** què pot inspeccionar, documentar i verificar l’equip.
4. **Capacitat:** si el sistema arriba al llindar de la tasca, mesurat amb una
   prova pròpia.
5. **Control:** versió, restriccions, canvis, retirada, reproduïbilitat i pla de
   sortida.

La frase durable és:

> Per triar entre famílies no necessites opinions: necessites dimensions de
> comparació.

## Invariants editorials

Una revisió no es pot publicar si incompleix alguna d’aquestes regles:

- Cap rànquing general substitueix una avaluació de la tasca.
- Cap família és universalment correcta.
- Cada brief té com a mínim dues opcions condicionalment defensables.
- Les opcions descriuen mecanismes i supòsits, no pistes carregades de “resposta
  bona”.
- Obertura, execució local i privadesa es tracten com eixos diferents.
- “Model obert en una web” es tracta com a núvol per a les dades d’entrada.
- “Execució local” evita el viatge de les entrades, però no elimina cost,
  seguretat operativa ni governança.
- Un DPA mai es descriu com a solució completa. Cal considerar instruccions,
  usos, configuració, retenció, subprocessadors, transferències, accés,
  seguretat, incidents i sortida.
- Que una dada sigui pública no converteix tot ús posterior en irrellevant per a
  privadesa, drets o política.
- “Capacitat” mai es dedueix només de la família o de la mida. S’associa a
  rúbrica, mostra, errors i supervisió.
- “Cost local zero” està prohibit. Maquinari, energia, manteniment i hores
  continuen existint.
- Una mostra de 200 no s’anomena automàticament esbiaixada. Se n’expliquen marc,
  selecció, incertesa, estrats i límits per a casos rars.
- Cap puntuació de l’activitat es presenta com una mesura de capacitat,
  ideologia o competència individual.
- Moodle no rep el camí de decisions.

## Afirmacions sensibles al temps

La posició relativa entre models oberts i tancats caduca ràpid. B7 evita
codificar “el model més potent avui” com una veritat de l’escenari. Quan el
capítol es revisi:

1. comprova si l’afirmació sobre frontera de capacitat continua vigent;
2. actualitza la data i la font al capítol, no l’utilitzis com a resposta de B7;
3. conserva la necessitat d’avaluació pròpia encara que canviï el líder;
4. revisa preus només si l’escenari en dona xifres; la versió actual usa costos
   relatius;
5. revisa requisits institucionals i la configuració Moodle objectiu.

## Mostreig de 200 sobre 40.000

La dada de l’activitat es calcula amb:

```text
1,96 × sqrt(0,5 × 0,5 / 200) × sqrt((40.000 − 200) / (40.000 − 1))
≈ 0,0691
```

És un marge màxim aproximat de ±6,9 punts percentuals al 95 % per a una
proporció global sota mostreig aleatori simple. No cobreix automàticament:

- biaix del marc o de selecció;
- no resposta;
- errors de codificació;
- comparacions de subgrups petits;
- detecció fiable d’incidències rares;
- deriva temporal.

La prova unitària ha de fallar si la xifra mostrada i el càlcul divergeixen.

## Responsabilitats abans de publicació

Cal registrar una aprovació per rol:

- propietat del curs i coherència amb el capítol;
- llengua catalana;
- IA, privadesa i diligència contractual;
- autenticitat de producció de videojocs;
- accessibilitat;
- integració Moodle.

Els noms poden viure al registre de publicació de l’organització; el repositori
manté rols, versió i data sense dades personals innecessàries.

## Protocol de pilot

Abans de considerar estable una revisió major:

1. Defineix abans del pilot una rúbrica de transferència.
2. Observa estudiants representatius sense explicar-los la resposta.
3. Comprova si poden:
   - triar dues dimensions i justificar-les;
   - detectar un fet absent;
   - combinar flux i salvaguarda;
   - proposar una prova de capacitat;
   - dir què faria canviar la decisió;
   - explicar per què “obert” no implica “privat”.
4. Registra on segueixen pistes de redacció en lloc de raonar.
5. Revisa el contingut, no només la satisfacció.
6. Mantén qualsevol recerca de classe separada de la finalització Moodle.

## Fonts de referència

- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
  — context, requisits, límits, costos, representativitat, supervisió i
  validació.
- [NIST AI 600-1: Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
  — gestió de risc en IA generativa.
- [EDPB: Opinion on AI models](https://www.edpb.europa.eu/news/edpb-opinion-on-ai-models-gdpr-principles-support-responsible-ai_en)
  — anàlisi cas per cas i dades públicament disponibles com un factor de
  context.
- [European Commission: processors under GDPR](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations/controllerprocessor/can-someone-else-process-data-my-organisations-behalf_en)
  — garanties, instruccions, confidencialitat, seguretat i subprocessadors.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) — criteris d’accessibilitat.
- [Moodle 5.2: Activity completion](https://docs.moodle.org/502/en/Activity_completion_FAQ)
  — comportament de finalització visible per a l’estudiant.
- Bommasani et al. (2023), _The Foundation Model Transparency Index v1.0_,
  arXiv: [2310.12941](https://arxiv.org/abs/2310.12941).

L’índex de transparència dona context al capítol, però B7 no converteix una
edició històrica de l’índex en una resposta interactiva.
