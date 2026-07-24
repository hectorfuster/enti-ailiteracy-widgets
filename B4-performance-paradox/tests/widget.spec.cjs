const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const STORAGE_KEY = "enti-b4-performance-paradox-v3";

async function answerQuestion(
  surface,
  answerName,
  submitName,
  confidence = "Alta",
) {
  await surface.getByRole("radio", { name: answerName, exact: true }).check();
  await surface.getByRole("radio", { name: confidence, exact: true }).check();
  await surface.getByRole("button", { name: submitName, exact: true }).click();
}

async function completeFlow(surface) {
  await surface
    .getByRole("button", {
      name: "Comença pel punt de partida",
      exact: true,
    })
    .click();

  await answerQuestion(surface, "72 punts", "Continua");
  await answerQuestion(surface, "40 DPS", "Tanca el punt de partida");

  await surface
    .getByRole("button", { name: "Comença la pràctica", exact: true })
    .click();
  await surface
    .getByRole("radio", {
      name: "Perquè cada reducció s’aplica successivament a la quantitat que queda.",
      exact: true,
    })
    .check();
  await surface
    .getByRole("button", { name: "Comprova la idea", exact: true })
    .click();
  await surface
    .getByRole("button", {
      name: "Següent tipus d’ajuda",
      exact: true,
    })
    .click();

  await surface
    .getByLabel("DPS sense comptar els crítics", { exact: true })
    .selectOption("40");
  await surface
    .getByLabel("Multiplicador mitjà dels crítics", { exact: true })
    .selectOption("1.25");
  await surface
    .getByLabel("DPS esperat final", { exact: true })
    .selectOption("50");
  await surface
    .getByRole("button", {
      name: "Demana una comprovació",
      exact: true,
    })
    .click();
  await surface
    .getByRole("button", {
      name: "Passa a la transferència",
      exact: true,
    })
    .click();

  await surface
    .getByRole("button", {
      name: "Resol els problemes nous",
      exact: true,
    })
    .click();
  await answerQuestion(surface, "96 punts", "Continua");
  await answerQuestion(surface, "54 DPS", "Tanca la transferència");

  await surface
    .getByRole("button", {
      name: "Fes primer el teu càlcul",
      exact: true,
    })
    .click();
  await answerQuestion(surface, "6 segons", "Compromet la resposta");
  await answerQuestion(surface, "6 segons", "Tanca la resposta final");

  await surface
    .getByRole("button", { name: "Mira el mapa complet", exact: true })
    .click();
  await surface
    .getByRole("button", {
      name: "Aplica la idea a una situació nova",
      exact: true,
    })
    .click();
  await surface
    .getByRole("radio", {
      name: "Intentar-ho, demanar pistes, explicar el procediment i fer una comprovació final sense IA.",
      exact: true,
    })
    .check();
  await surface
    .getByRole("button", {
      name: "Comprova l’estratègia",
      exact: true,
    })
    .click();

  await surface.locator('input[name="guardrail"][value="hints-first"]').check();
  await surface
    .getByRole("button", {
      name: "Completa l’activitat",
      exact: true,
    })
    .click();
}

async function expectNoAxeViolations(page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual(
    [],
  );
}

test("completes the full evidence-faithful flow and can restart", async ({
  page,
}) => {
  const runtimeErrors = [];
  const requests = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/?variant=a");
  await expect(
    page.getByRole("heading", {
      name: "Quan encertar no és el mateix que aprendre",
    }),
  ).toBeVisible();

  await completeFlow(page);

  await expect(
    page.getByRole("heading", {
      name: "Rendiment, aprenentatge i confiança ja no són sinònims",
    }),
  ).toBeVisible();
  await expect(page.locator("#progressBar")).toHaveAttribute("value", "100");
  await expect(page.getByText("Demanaré pistes, no la resposta")).toBeVisible();

  const storage = await page.evaluate(
    (key) => ({
      session: window.sessionStorage.getItem(key),
      localLength: window.localStorage.length,
    }),
    STORAGE_KEY,
  );
  expect(JSON.parse(storage.session).completed).toBe(true);
  expect(storage.localLength).toBe(0);
  expect(requests.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  expect(runtimeErrors).toEqual([]);

  await page
    .getByRole("button", { name: "Torna a començar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vols tornar a començar?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Esborra i reinicia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Quan encertar no és el mateix que aprendre",
    }),
  ).toBeVisible();
  const resetState = await page.evaluate(
    (key) => window.sessionStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(resetState).toBeNull();
});

test("validates required choices, preserves progress, and rejects corrupt state", async ({
  page,
}) => {
  await page.goto("/?variant=a");
  await page
    .getByRole("button", {
      name: "Comença pel punt de partida",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Reinicia", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vols tornar a començar?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Reso sense assistència" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(page.locator(".form-error")).toBeFocused();

  await answerQuestion(page, "72 punts", "Continua", "Mitjana");
  await page.reload();
  await expect(page.getByText("Hem recuperat el progrés")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Resol sense assistència" }),
  ).toBeVisible();
  await expect(page.getByText("Pregunta 2 de 2")).toBeVisible();

  await page.evaluate((key) => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ version: 3, variant: "a", screen: "admin" }),
    );
  }, STORAGE_KEY);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Quan encertar no és el mateix que aprendre",
    }),
  ).toBeVisible();
});

test("supports the counterbalanced variant and both corrective-feedback branches", async ({
  page,
}) => {
  await page.goto("/?variant=b");
  await page
    .getByRole("button", {
      name: "Comença pel punt de partida",
      exact: true,
    })
    .click();
  await answerQuestion(page, "40 DPS", "Continua");
  await answerQuestion(page, "72 punts", "Tanca el punt de partida");
  await page
    .getByRole("button", { name: "Comença la pràctica", exact: true })
    .click();

  await page
    .getByLabel("Dany després de la primera reducció del 20 %", {
      exact: true,
    })
    .selectOption("70");
  await page
    .getByLabel("Dany després d’aplicar el 30 % al que queda", {
      exact: true,
    })
    .selectOption("50");
  await page
    .getByRole("button", {
      name: "Demana una comprovació",
      exact: true,
    })
    .click();
  await expect(page.getByText("Revisa aquests passos")).toBeVisible();
  await expect(page.getByText("Conserves el 80 % de 100.")).toBeVisible();

  await page
    .getByLabel("Dany després de la primera reducció del 20 %", {
      exact: true,
    })
    .selectOption("80");
  await page
    .getByLabel("Dany després d’aplicar el 30 % al que queda", {
      exact: true,
    })
    .selectOption("56");
  await page
    .getByRole("button", {
      name: "Demana una comprovació",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Següent tipus d’ajuda",
      exact: true,
    })
    .click();

  await page
    .getByRole("radio", {
      name: "Que tots els atacs fan un 25 % menys de dany.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Comprova la idea", exact: true })
    .click();
  await expect(page.getByText("Encara no")).toBeVisible();

  await page
    .getByRole("radio", {
      name: "Que, a llarg termini, els crítics afegeixen un 25 % al DPS base.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Comprova la idea", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Passa a la transferència",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ara l’assistent marxa" }),
  ).toBeVisible();
});

test("provides logical keyboard focus and accessible states", async ({
  page,
}) => {
  await page.goto("/?variant=a");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  const outline = await page.locator(".skip-link").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(3);

  await page
    .getByRole("button", {
      name: "Comença pel punt de partida",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resol sense assistència" }),
  ).toBeFocused();
  await expectNoAxeViolations(page);

  await answerQuestion(page, "72 punts", "Continua");
  await answerQuestion(page, "40 DPS", "Tanca el punt de partida");
  await page
    .getByRole("button", { name: "Comença la pràctica", exact: true })
    .click();
  await expectNoAxeViolations(page);
});

test("has no accessibility violations in the completed debrief", async ({
  page,
}) => {
  await page.goto("/?variant=a");
  await completeFlow(page);
  await expectNoAxeViolations(page);
});

test.describe("320 CSS pixel reflow", () => {
  test.use({ viewport: { width: 320, height: 740 } });

  test("keeps the initial and question views within the viewport", async ({
    page,
  }) => {
    await page.goto("/?variant=b");
    let dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    await page
      .getByRole("button", {
        name: "Comença pel punt de partida",
        exact: true,
      })
      .click();
    dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expectNoAxeViolations(page);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("disables progress and option transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?variant=a");
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    const durations = await page.evaluate(() => {
      const option = document.querySelector(".objective");
      const progress = document.querySelector("#progressBar");
      return {
        option: option ? getComputedStyle(option).transitionDuration : "0s",
        progress: getComputedStyle(progress).transitionDuration,
      };
    });
    expect(durations.option).toBe("0s");
    expect(durations.progress).toBe("0s");
  });
});

test("emits only validated, privacy-preserving messages in an iframe", async ({
  page,
}) => {
  await page.goto("/tests/iframe-harness.html");
  const widget = page.frameLocator("#widgetFrame");
  const log = page.locator("#messageLog");

  await expect(
    widget.getByRole("heading", {
      name: "Quan encertar no és el mateix que aprendre",
    }),
  ).toBeVisible();
  await expect(log).toContainText('"type": "progress"');
  await expect(log).toContainText('"type": "resize"');

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "enti-widget-complete",
          widget: "b4-performance-paradox",
          version: "3.0.0",
          outcome: { completed: true, restored: false },
        },
        origin: window.location.origin,
        source: window,
      }),
    );
  });
  await expect(log).not.toContainText('"type": "complete"');

  await completeFlow(widget);
  await expect(log).toContainText('"type": "complete"');

  const entries = JSON.parse(await log.textContent());
  const completion = entries.find((entry) => entry.type === "complete");
  expect(Object.keys(completion.outcome).sort()).toEqual([
    "completed",
    "restored",
  ]);
  expect(completion.outcome.completed).toBe(true);
  expect(await page.locator("#widgetFrame").getAttribute("style")).toMatch(
    /height:\s*\d+px/,
  );
});
