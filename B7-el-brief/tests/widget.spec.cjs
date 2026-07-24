"use strict";

const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const Data = require("../scenario-data.js");

const STORAGE_KEY = "enti-b7-el-brief-v2";

const decisions = [
  {
    priorities: ["Privadesa", "Capacitat"],
    question: "Quina qualitat mínima necessita el prototip?",
    workflow: "Model obert petit, executat en local",
    safeguard: "Pilot amb criteris d’acceptació",
  },
  {
    priorities: ["Capacitat", "Privadesa"],
    question: "Què diu una prova breu de qualitat?",
    workflow: "Direcció humana + variants allotjades",
    safeguard: "Paquet d’entrada publicable",
  },
  {
    priorities: ["Cost", "Control"],
    question: "Com funcionen els classificadors en una mostra etiquetada?",
    workflow: "Classificador local + escalat per confiança",
    safeguard: "Conjunt etiquetat i vigilància de deriva",
  },
];

async function selectByPartialName(surface, role, name) {
  const locator = surface.getByRole(role, { name, exact: false });
  await expect(locator).toHaveCount(1);
  if (role === "checkbox" || role === "radio") {
    await locator.check();
  } else {
    await locator.click();
  }
}

async function completeRound(surface, decision) {
  await surface
    .getByRole("button", { name: "Construeix el brief", exact: true })
    .click();
  for (const priority of decision.priorities) {
    await selectByPartialName(surface, "checkbox", priority);
  }
  await surface
    .getByRole("button", { name: "Investiga un fet", exact: true })
    .click();
  await selectByPartialName(surface, "radio", decision.question);
  await surface
    .getByRole("button", { name: "Dissenya el flux", exact: true })
    .click();
  await selectByPartialName(surface, "radio", decision.workflow);
  await selectByPartialName(surface, "radio", decision.safeguard);
  await surface
    .getByRole("button", {
      name: "Revisa abans de comprometre",
      exact: true,
    })
    .click();
  await surface
    .getByRole("button", { name: "Compromet la decisió", exact: true })
    .click();
}

async function completeTransfer(surface) {
  await surface
    .getByRole("button", {
      name: "Aplica el mètode a un cas nou",
      exact: true,
    })
    .click();
  await selectByPartialName(surface, "checkbox", "Privadesa");
  await selectByPartialName(surface, "checkbox", "Control");
  await selectByPartialName(
    surface,
    "radio",
    "Quines dades i entorns estan aprovats?",
  );
  await selectByPartialName(
    surface,
    "radio",
    "Carrils separats segons dades i risc",
  );
  await selectByPartialName(
    surface,
    "radio",
    "Porta de dades i entorn aprovat",
  );
  await selectByPartialName(surface, "radio", "Quan canviïn l’error mesurat");
  await surface
    .getByRole("button", {
      name: "Tanca el brief i completa l’activitat",
      exact: true,
    })
    .click();
}

async function completeThreeRounds(surface) {
  await surface
    .getByRole("button", {
      name: "Comença el primer brief",
      exact: true,
    })
    .click();
  for (const decision of decisions) {
    await completeRound(surface, decision);
  }
}

async function completeFlow(surface) {
  await completeThreeRounds(surface);
  await completeTransfer(surface);
}

async function expectNoAxeViolations(page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual(
    [],
  );
}

test("completes the full briefing lab without third-party requests", async ({
  page,
}) => {
  const requests = [];
  const runtimeErrors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Una eina no guanya: encaixa o no encaixa",
    }),
  ).toBeVisible();
  await completeFlow(page);

  await expect(
    page.getByRole("heading", {
      name: "Ja no has triat una eina: has construït un brief",
    }),
  ).toBeVisible();
  await expect(page.locator("#progressBar")).toHaveAttribute("value", "100");
  const stored = await page.evaluate((key) => {
    return {
      session: JSON.parse(window.sessionStorage.getItem(key)),
      localLength: window.localStorage.length,
    };
  }, STORAGE_KEY);
  expect(stored.session.completed).toBe(true);
  expect(stored.session.transfer.complete).toBe(true);
  expect(stored.localLength).toBe(0);
  expect(requests.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  expect(runtimeErrors).toEqual([]);
});

test("moves focus to every new screen and supports deliberate revision", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page
    .getByRole("button", {
      name: "Comença el primer brief",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Brief 1: quaranta PNJ sense veu",
    }),
  ).toBeFocused();

  await page
    .getByRole("button", { name: "Construeix el brief", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Quines dues dimensions manen?",
    }),
  ).toBeFocused();
  await selectByPartialName(page, "checkbox", "Privadesa");
  await selectByPartialName(page, "checkbox", "Capacitat");
  await expect(
    page.getByRole("button", { name: "Investiga un fet", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("checkbox", { name: "Capacitat", exact: false })
    .uncheck();
  await expect(
    page.getByRole("button", { name: "Investiga un fet", exact: true }),
  ).toBeDisabled();
  await selectByPartialName(page, "checkbox", "Control");
  await page
    .getByRole("button", { name: "Investiga un fet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Què necessites saber abans de triar?",
    }),
  ).toBeFocused();
  await expectNoAxeViolations(page);
});

test("restores valid session progress and rejects corrupt state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Comença el primer brief",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Construeix el brief", exact: true })
    .click();
  await selectByPartialName(page, "checkbox", "Privadesa");
  await selectByPartialName(page, "checkbox", "Capacitat");
  await page
    .getByRole("button", { name: "Investiga un fet", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Què necessites saber abans de triar?",
    }),
  ).toBeVisible();

  await page.evaluate((key) => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        version: 999,
        contentVersion: "bad",
        screen: "complete",
      }),
    );
  }, STORAGE_KEY);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Una eina no guanya: encaixa o no encaixa",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      STORAGE_KEY,
    ),
  ).toBeNull();
});

test("explains the sampling trade-off without calling the sample biased", async ({
  page,
}) => {
  await page.goto("/");
  await completeThreeRounds(page);
  const samplingNote = page.locator(".callout-key");
  await expect(
    page.getByRole("heading", {
      name: "Informe de decisions, no marcador de respostes",
    }),
  ).toBeVisible();
  await expect(samplingNote).toContainText("±6,9 punts");
  await expect(samplingNote).toContainText("Una mostra aleatòria de 200");
  await expect(samplingNote).not.toContainText("és esbiaixada");

  await completeTransfer(page);
  const restartButton = page.getByRole("button", {
    name: "Torna a començar",
    exact: true,
  });
  await restartButton.click();
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await expect(restartButton).toBeFocused();
  await restartButton.click();
  await page
    .getByRole("button", { name: "Esborra i reinicia", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Una eina no guanya: encaixa o no encaixa",
    }),
  ).toBeVisible();
  await expect(page.getByText("±6,9 punts", { exact: false })).toHaveCount(0);
});

test("has no automated accessibility violations on intro and completion", async ({
  page,
}) => {
  await page.goto("/");
  await expectNoAxeViolations(page);
  await completeFlow(page);
  await expectNoAxeViolations(page);
});

test.describe("320 CSS pixel reflow", () => {
  test.use({ viewport: { width: 320, height: 740 } });

  test("keeps intro, choices, and final report within the viewport", async ({
    page,
  }) => {
    await page.goto("/");
    let dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    await page
      .getByRole("button", {
        name: "Comença el primer brief",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Construeix el brief", exact: true })
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

  test("uses instant screen positioning and preserves focus", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page
      .getByRole("button", {
        name: "Comença el primer brief",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Brief 1: quaranta PNJ sense veu",
      }),
    ).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test("offers a useful fallback without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:43177/");
  await expect(
    page.getByRole("heading", {
      name: "Cal JavaScript per fer aquesta activitat",
    }),
  ).toBeVisible();
  await expect(
    page.locator(".card").getByText("La idea central", { exact: false }),
  ).toBeVisible();
  await context.close();
});

test("validates transfer before allowing completion", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => {
    const data = window.B7Data;
    const state = window.B7Core.createInitialState();
    state.rounds = data.ROUNDS.map((round) => ({
      priorities: ["privacy", "capacity"],
      question: round.questions[0].id,
      workflow: round.workflows[0].id,
      safeguard: round.safeguards[0].id,
      committed: true,
    }));
    state.screen = "transfer";
    window.sessionStorage.setItem(key, JSON.stringify(state));
  }, STORAGE_KEY);
  await page.reload();
  await page
    .getByRole("button", {
      name: "Tanca el brief i completa l’activitat",
      exact: true,
    })
    .click();
  await expect(page.locator(".form-error")).toBeFocused();
  await expect(page.locator(".form-error")).toContainText(
    "Completa els cinc apartats",
  );
});

test("emits only validated, privacy-preserving iframe events", async ({
  page,
}) => {
  await page.goto("/tests/iframe-harness.html");
  const widget = page.frameLocator("#widgetFrame");
  const log = page.locator("#messageLog");

  await expect(
    widget.getByRole("heading", {
      name: "Una eina no guanya: encaixa o no encaixa",
    }),
  ).toBeVisible();
  await expect(log).toContainText('"type": "progress"');
  await expect(log).toContainText('"type": "resize"');

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "enti-widget-complete",
          widget: "b7-el-brief",
          version: "2.0.0",
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
  const entries = await page.evaluate(() => window.__B7_TEST_EVENTS__);
  const completion = entries.find((entry) => entry.type === "complete");
  expect(Object.keys(completion.outcome).sort()).toEqual([
    "completed",
    "restored",
  ]);
  expect(completion.outcome.completed).toBe(true);
  expect(await page.locator("#widgetFrame").getAttribute("height")).toMatch(
    /^\d+$/,
  );
});
