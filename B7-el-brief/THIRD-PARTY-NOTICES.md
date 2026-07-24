# Avisos de tercers

Els fitxers de producció de B7 no inclouen biblioteques de tercers ni fan
peticions a CDN, fonts remotes o serveis d’IA.

Les dependències següents existeixen només per al desenvolupament i les proves:

- `@playwright/test` 1.61.1 — Apache-2.0;
- `playwright` / `playwright-core` 1.61.1 — Apache-2.0;
- `@axe-core/playwright` 4.12.1 — MPL-2.0;
- `axe-core` 4.12.1 — MPL-2.0;
- `prettier` 3.6.2 — MIT.

Les dependències no es despleguen amb el widget estàtic. Consulta
`package-lock.json` per a integritat, versions transitives i metadades exactes.
