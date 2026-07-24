# Guia docent de B9 — Una declaració que informa

Versió de l'activitat: 2.0.0  
Durada objectiu: 5–7 minuts  
Modalitat: pràctica formativa sense nota

## Resultat d'aprenentatge

En acabar, l'estudiant ha de poder redactar una declaració d'ús d'IA que sigui:

- certa respecte del procés que ha seguit;
- prou específica per distingir què va fer l'eina i què va fer la persona;
- completa segons els camps que exigeix l'activitat;
- separada de la pregunta normativa sobre si aquell ús estava permès.

L'activitat no detecta ús d'IA, no avalua integritat acadèmica i no substitueix
la política de l'assignatura.

## On situar-la a Moodle

Col·loqueu-la després d'introduir els criteris de declaració i abans de la
primera tasca en què l'alumnat els hagi d'aplicar. Afegiu, just abans o després
del widget:

1. un enllaç a la política vigent;
2. el nom de l'activitat o activitats a què s'aplica;
3. el canal on l'estudiant pot preguntar pels casos dubtosos.

Feu servir el mode de recurs estàtic si només cal que l'estudiant la consulti.
Feu servir el wrapper amb seguiment només si el curs necessita registrar la
finalització; el contracte tècnic és a `README.md`.

## Guió de facilitació

| Minut | Acció docent | Evidència que cal observar |
|---|---|---|
| 0–1 | Demaneu que prediguin quants processos encaixen amb una frase vaga. | No es busca encertar, sinó fer explícita la intuïció inicial. |
| 1–3 | Deixeu que completin el cas guiat i provin l'exemple llarg però vague. | Han d'identificar que més paraules no impliquen més precisió. |
| 3–4 | Feu la pregunta de reflexió sense avançar la resposta. | Han de distingir procedència de l'eina i repartiment del procés. |
| 4–6 | Feu completar un cas de transferència. | La declaració ha de correspondre als fets visibles del cas nou. |
| 6–7 | Tanqueu amb les dues preguntes de debat següents. | Han de separar descripció, completesa i permís. |

## Debat immediat

Preguntes per copiar a Moodle:

1. **Quina informació permet entendre el repartiment real del treball entre
   l'eina i la persona?**
2. **Per què una declaració pot ser certa i específica, però l'ús continuar
   sense estar permès?**

Resposta esperada: la finalitat, la part i l'abast afectats, i la contribució
humana expliquen el procés. El permís depèn de la consigna i la política
aplicables; una declaració no el concedeix.

## Errors freqüents i resposta docent

| Idea equivocada | Resposta recomanada |
|---|---|
| “Si dic el model, ja he informat prou.” | El model explica procedència, però no quina part va afectar ni què va aportar la persona. |
| “Com més llarga és la frase, millor.” | La precisió depèn de les distincions que permet fer, no del recompte de paraules. |
| “Si ho declaro, estava permès.” | Declarar descriu el procés; la consigna decideix el permís. |
| “Revisat per mi” sempre és suficient. | Cal concretar què es va comprovar, canviar, descartar o verificar. |
| Una única coincidència sempre és correcta. | També ha de ser el procés real, no un altre cas que les paraules descriguin per accident. |
| La plantilla serveix igual per a totes les assignatures. | Els camps finals depenen de la política i de la tasca concreta. |

## Fitxa d'adopció de política

El responsable del curs ha d'aprovar aquesta fitxa abans de publicar el widget.
No modifiqueu `content.js` fins que les decisions estiguin confirmades.

| Camp | Decisió del curs |
|---|---|
| Responsable i data d'aprovació |  |
| Versió i data d'efecte |  |
| Activitats a què s'aplica |  |
| Usos d'IA permesos |  |
| Usos prohibits o que requereixen consulta |  |
| Camps obligatoris de la declaració |  |
| Cal indicar eina, model o data? |  |
| Cal adjuntar prompts, converses, fonts o enllaços? |  |
| Expectativa de verificació o revisió humana |  |
| Lloc exacte on s'ha d'entregar la declaració |  |
| Contacte per resoldre dubtes |  |

Després d'adaptar el contingut, executeu `npm.cmd run validate` i repetiu tota la
matriu manual de `VALIDATION.md`.

## Pilot amb alumnat

Feu una prova amb 5–8 estudiants representatius abans del desplegament general.
No recolliu el text copiat ni els detalls del seu treball real.

Per participant, registreu només:

- finalització autònoma: sí/no;
- temps total en minuts;
- declaració de transferència certa: sí/no;
- tots els camps B9 presents: sí/no;
- distingeix procedència i procés: sí/no;
- distingeix declaració i permís: sí/no;
- barrera o confusió observada, sense dades personals.

Objectius de sortida:

- almenys 85% completa la ruta sense ajuda;
- almenys 80% resol correctament el cas de transferència;
- almenys 75% inclou tots els camps requerits;
- almenys 80% explica la diferència entre procedència i procés;
- mediana de 5–7 minuts;
- cap barrera crítica d'accessibilitat.

Atureu el desplegament si apareix una falsa confirmació, una barrera crítica
d'accessibilitat, una contradicció sense explicació recuperable o una transferència
involuntària de dades de l'estudiant.

## Aprovació de publicació

Abans de publicar, han de constar:

- responsable de política i versió aprovats;
- revisió lingüística catalana;
- `npm.cmd run validate` en verd;
- matriu de navegador, teclat i tecnologia d'assistència completada;
- mode Moodle i comportament de finalització documentats;
- pilot dins dels objectius o incidències corregides i repetides.
