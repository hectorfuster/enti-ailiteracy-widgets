# Governança del contingut

El contingut tracta drets, pràctiques de mercat i obligacions que poden canviar.
Aquest document defineix com mantenir-lo precís sense convertir l’activitat en
assessorament jurídic.

## Àmbit i propietat

- Àmbit declarat: Unió Europea / Espanya.
- Revisió de contingut actual: 2026-07-24.
- Revisió ordinària següent: 2027-07-24.
- Responsable pedagògic: persona coordinadora de l’assignatura.
- Responsable de contingut: persona designada amb competència en propietat
  intel·lectual i governança d’IA.
- Responsable tècnic: mantenidor del widget i del contracte Moodle.

Els noms s’han de registrar al full de versió institucional abans de publicar.

## Principis editorials

Cada dimensió ha de separar explícitament:

1. el principi recíproc;
2. el context normatiu o factual;
3. la prova que ajudaria a decidir;
4. una preferència o decisió defensable.

No es poden presentar preferències de mercat com a obligacions legals. No es
pot inferir que tot ús en línia és lliure ni que tot ús necessita un permís
individual. La manca d’evidència ha de continuar sent una opció vàlida.

Les opcions recíproques s’aparellen amb `policy`, mai per posició. Afegir,
treure o reordenar una opció exigeix:

- mantenir el mateix conjunt de polítiques als dos rols;
- conservar identificadors estables o documentar una migració;
- afegir proves de totes les combinacions;
- revisar si el text continua sent comparable sense ser artificialment
  simètric.

## Jerarquia de fonts

Prioritza, en aquest ordre:

1. legislació consolidada i diaris oficials;
2. Comissió Europea i organismes públics competents;
3. guies institucionals amb data i àmbit;
4. recerca acadèmica o informes de mercat per a fets no normatius.

Les notícies, entrades comercials i opinions poden inspirar casos, però no
s’han d’utilitzar com a única base d’una afirmació normativa. Les fonts
externes són evidència per revisar: no s’executen ni es carreguen
automàticament al widget.

## Quan fer una revisió extraordinària

Revisa abans de la data anual si canvia qualsevol d’aquests elements:

- aplicació temporal o orientació oficial del Reglament d’IA;
- plantilla europea del resum de contingut d’entrenament;
- codi de bones pràctiques per a models d’ús general;
- interpretació rellevant de l’extracció de textos i dades;
- normativa espanyola o jurisprudència material per als exemples;
- mecanismes de llicència, reserva o reclamació que facin una opció enganyosa.

## Procés d’un canvi

1. Obre una incidència amb l’afirmació, la font oficial i la data d’efecte.
2. Etiqueta cada canvi com a jurídic, factual, pedagògic o estilístic.
3. Fes revisar els canvis jurídics per la persona responsable de contingut.
4. Executa `npm run check:all`.
5. Amb xarxa disponible, executa `npm run sources:check` i revisa manualment
   qualsevol redirecció o resposta restringida.
6. Fes una lectura completa en català per claredat, registre i inclusió.
7. Si canvia el significat d’una política, repeteix un mini-pilot i incrementa
   la versió del widget.
8. Actualitza `REVIEWED_ON`, `NEXT_REVIEW_ON` i el registre institucional.

## Criteris de retirada

Despublica temporalment l’activitat si una afirmació central és materialment
incorrecta, una font ha estat retirada sense substitució fiable, el contracte
filtra dades de resposta o una prova crítica d’accessibilitat deixa de passar.
