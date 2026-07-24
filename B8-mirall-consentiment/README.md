# B8 · El mirall de la reciprocitat

Activitat web autocontinguda, en català, que complementa un curs Moodle
d’alfabetització en IA. Ajuda l’alumnat a aplicar el mateix principi quan
decideix com a estudi comprador i quan decideix com a creador afectat.

No calcula una puntuació moral ni infereix trets personals. Classifica cada
parell com a principi compartit, diferència examinada, decisió per revisar o
informació pendent. L’objectiu és justificar, revisar i transferir criteris.

## Experiència d’aprenentatge

El recorregut previst dura 6–8 minuts:

1. cinc decisions com a estudi;
2. una predicció abans de canviar de rol;
3. cinc decisions com a creador;
4. revelació parell a parell del principi recíproc;
5. explicació, revisió opcional i preservació de la primera resposta;
6. aplicació a un cas nou;
7. formulació d’un estàndard mínim i una prova concreta;
8. resum reutilitzable, copiable i imprimible.

Les opcions equivalents comparteixen identificadors semàntics de política a
`content.js`; l’ordre visual no determina el resultat. «Necessito informació»
és una resposta vàlida.

## Execució local

Requereix Node.js 18 o posterior.

```powershell
npm install
npm run check:all
npm run sources:check
npm run format
node scripts/static-server.mjs
```

Obre `http://127.0.0.1:43178`. La pàgina és HTML/CSS/JavaScript estàtic i no
necessita compilació ni serveis externs.

`sources:check` és una comprovació de manteniment amb xarxa: verifica que els
enllaços oficials no siguin 404, 410 o errors de servidor. Es manté fora de
`check:all` perquè la validació normal i el runtime han de funcionar sense
xarxa.

## Desplegament a Moodle

Publica tots els fitxers de producció al mateix origen:

- `index.html`
- `styles.css`
- `content.js`
- `mirror-core.js`
- `app.js`

Serveix-los amb UTF-8, HTTPS i una política de seguretat equivalent a la del
servidor de proves. No copiïs els fitxers dins d’un camp que elimini scripts:
utilitza una URL o un recurs web allotjat.

### Contracte de suport

Objectiu documentat el 2026-07-24:

- Moodle 4.5 LTS i Moodle 5.1–5.2;
- tema Boost o tema fill que no imposi una amplada inferior a 320 CSS px;
- versions actuals de Chromium, Firefox i Safari;
- activitat oberta en navegador web.

La lògica del widget és estàtica i no depèn d’una API JavaScript de Moodle,
però aquesta matriu continua necessitant la signatura al Moodle institucional.
La Moodle App no es declara certificada: fins que passi la prova real, configura
el recurs perquè s’obri al navegador extern.

### Dos modes de finalització

**Mode A · recurs URL no seguit.** Publica `index.html` com a recurs URL i no
afegeixis `parentOrigin`. Moodle pot utilitzar «vist» o «marca manualment com a
fet». El widget no envia cap missatge al pare.

**Mode B · reflexió seguida.** Requereix una activitat, plugin o wrapper
institucional de confiança que:

1. allotgi l’iframe;
2. carregui `integration/moodle-wrapper.js`;
3. tradueixi `onComplete` a l’API de finalització de Moodle al servidor;
4. autentiqui la persona i protegeixi la petició segons la política Moodle.

El callback del navegador no actualitza per si sol la base de dades de Moodle.
No posis scripts en camps editables per l’alumnat ni exposis un endpoint de
finalització sense autenticació i control CSRF.

Per integrar progrés i alçada, carrega
`integration/moodle-wrapper.js` al contenidor i configura l’iframe abans
d’assignar-li `src`:

```html
<script src="/widgets/B8/integration/moodle-wrapper.js"></script>
<iframe id="b8" title="Activitat B8: el mirall de la reciprocitat"></iframe>
<script>
  const frame = document.getElementById("b8");
  const widgetUrl = new URL("https://widgets.example.edu/B8/index.html");
  widgetUrl.searchParams.set(
    "coursePolicyUrl",
    "https://moodle.example.edu/local/course-ai-policy",
  );
  widgetUrl.searchParams.set("coursePolicyLabel", "Política d’IA del curs");
  ENTIConsentMirrorMoodleBridge.create({
    iframe: frame,
    widgetOrigin: "https://widgets.example.edu",
    onProgress(outcome) {
      // outcome: { stageId, step, stepLabel, percent, completed }
    },
    onComplete(outcome) {
      // outcome: { completed: true, restored }
    },
    onResize(outcome) {
      frame.style.height = `${outcome.height}px`;
    },
  });
  frame.src = ENTIConsentMirrorMoodleBridge.withParentOrigin(
    widgetUrl,
    window.location.origin,
  );
</script>
```

`coursePolicyUrl` és opcional però recomanat. Només s’accepta HTTPS, no es
carrega automàticament i s’obre únicament quan l’alumnat activa l’enllaç.
Sense configuració, el widget recorda consultar la política publicada a
Moodle. `coursePolicyLabel` es limita a 80 caràcters i sempre s’escapa com a
text.

El receptor exigeix simultàniament l’origen exacte, la finestra exacta de
l’iframe, l’identificador `b8-consent-mirror`, la versió `2.0.0` i un esquema
tancat. Els tres tipus de missatge admesos són:

- `enti-widget-progress`
- `enti-widget-complete`
- `enti-widget-resize`

No s’envien respostes, motius, revisions, identificadors d’intent ni text
lliure. La finalització s’emet una sola vegada per intent. Consulta
[PRIVACY.md](PRIVACY.md) abans del desplegament.

Exemple de CSP de producció, substituint l’origen pel Moodle real:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none';
form-action 'self'; frame-ancestors https://moodle.example.edu
```

El servidor de proves utilitza `frame-ancestors 'self'` perquè el harness local
és del mateix origen. La política de producció ha d’enumerar només els orígens
Moodle autoritzats. Moodle també ha d’autoritzar l’origen del widget a
`frame-src` i el paràmetre `parentOrigin` ha de coincidir exactament amb
l’origen de la pàgina contenidora.

## Arquitectura

- `content.js`: text pedagògic, polítiques, evidències i fonts.
- `mirror-core.js`: estat, validació, reciprocitat i resultats neutres.
- `app.js`: renderitzat accessible, persistència de pestanya i esdeveniments.
- `styles.css`: sistema visual local, reflow, contrast i preferències d’usuari.
- `integration/`: receptor Moodle amb llista d’esquemes permesa.
- `tests/`: proves unitàries, de contingut, seguretat, navegador i iframe.
- `scripts/`: servidor CSP i comprovacions estàtiques.
- `FACILITATOR-GUIDE.md`: debrief, malentesos i casos de transferència.
- `CHANGELOG.md`: historial pedagògic, jurídic, tècnic i de privacitat.
- `.github/workflows/b8-consent-mirror.yml`: porta CI per cada canvi de B8.

## Manteniment

Qualsevol canvi de polítiques o text jurídic ha de seguir
[CONTENT-GOVERNANCE.md](CONTENT-GOVERNANCE.md). Abans d’una versió docent,
executa [VALIDATION.md](VALIDATION.md) i registra els resultats del pilot
descrit a [PILOT-PROTOCOL.md](PILOT-PROTOCOL.md). La sessió posterior pot
seguir [FACILITATOR-GUIDE.md](FACILITATOR-GUIDE.md) sense exposar respostes
individuals.
