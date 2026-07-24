const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const data = require("../scenario-data.js");

const STORAGE_KEY = "enti-b6-auditoria-v3";
const correctAnswers = Object.fromEntries(
  data.SCENARIOS.map((scenario) => [scenario.id, scenario.correctChoice]),
);
const correctRepairs = Object.fromEntries(
  data.REPAIR_CASES.map((repair) => [
    repair.id,
    repair.options.find((option) => option.correct).id,
  ]),
);
const correctIncidentIds = data.INCIDENT_OPTIONS.filter(
  (option) => option.correct,
).map((option) => option.id);
const correctTransferId = data.TRANSFER.options.find(
  (option) => option.correct,
).id;

const completedState = {
  storageVersion: data.STORAGE_VERSION,
  phase: "complete",
  currentScenarioIndex: data.SCENARIOS.length - 1,
  answers: correctAnswers,
  submittedAnswers: correctAnswers,
  repairs: correctRepairs,
  repairChecked: false,
  incidentSelections: correctIncidentIds,
  transferChoice: correctTransferId,
  responseChecked: true,
  incidentCorrect: true,
  transferCorrect: true,
  completed: true,
};

function restoredStateFor(phase) {
  const state = JSON.parse(JSON.stringify(completedState));
  state.phase = phase;
  state.completed = phase === "complete";
  state.responseChecked = false;
  state.incidentCorrect = false;
  state.transferCorrect = false;

  if (phase === "triage") {
    state.currentScenarioIndex = 0;
    state.submittedAnswers = null;
  }
  if (["triage", "dossier", "repair"].includes(phase)) {
    state.repairs = {};
  }
  if (["triage", "dossier", "repair", "response"].includes(phase)) {
    state.incidentSelections = [];
    state.transferChoice = null;
  }
  return state;
}

async function installState(page, state) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(state) },
  );
}

async function answerScenario(page, scenario, choiceId) {
  await page.locator(`#triage-${scenario.id}-${choiceId}`).check();
  await page.locator("#confirmScenarioButton").click();
  await expect(page.locator("#scenarioFeedback")).toBeVisible();
  await page.locator("#confirmScenarioButton").click();
}

async function completeTriage(page, answers = correctAnswers) {
  await page.locator("#startButton").click();
  for (const scenario of data.SCENARIOS) {
    await answerScenario(page, scenario, answers[scenario.id]);
  }
  await expect(page.locator("#dossierPanel")).toBeVisible();
}

async function completeRepair(page) {
  await page.locator("#startRepairButton").click();
  for (const [repairId, optionId] of Object.entries(correctRepairs))
    await page.locator(`#${repairId}-${optionId}`).check();
  await page.locator("#checkRepairButton").click();
  await expect(page.locator("#responsePanel")).toBeVisible();
}

async function completeResponse(page) {
  for (const optionId of correctIncidentIds)
    await page.locator(`#incident-${optionId}`).check();
  await page.locator(`#transfer-${correctTransferId}`).check();
  await page.locator("#checkResponseButton").click();
  await expect(page.locator("#completionPanel")).toBeVisible();
}

async function selectWithKeyboard(page, selector) {
  const control = page.locator(selector);
  await control.press("Space");
  await expect(control).toBeChecked();
}

async function activateWithKeyboard(page, selector) {
  const control = page.locator(selector);
  await control.focus();
  await page.keyboard.press("Enter");
}

test("completes the five-stage learning flow and restarts cleanly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "L'auditoria de la fuga" }),
  ).toBeVisible();
  await expect(page.locator("#progressText")).toHaveText("0 de 5 passos");

  await completeTriage(page);
  await expect(page.locator("#progressText")).toHaveText("2 de 5 passos");
  await expect(page.locator(".inference-card.is-active")).toHaveCount(0);
  await expect(page.locator("#directExposureList")).toContainText(
    "Cap dada directa",
  );

  await completeRepair(page);
  await completeResponse(page);
  await expect(page.locator("#progressText")).toHaveText("5 de 5 passos");
  await expect(page.locator("#completionTitle")).toContainText(
    "La decisió segura",
  );

  const stored = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(stored).not.toContain("Bru Terrades");
  expect(stored).not.toContain("nr_demo_7K4-XP9");
  expect(stored).not.toContain("prompt");

  await page.locator("#restartButton").click();
  await expect(page.locator("#orientationPanel")).toBeVisible();
  await expect(page.locator("#progressText")).toHaveText("0 de 5 passos");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY),
  ).toBeNull();
});

test("shows item-level feedback and invalidates a submitted dossier before revision", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#startButton").click();
  const first = data.SCENARIOS[0];
  await page.locator(`#triage-${first.id}-send`).check();
  await expect(page.locator("#scenarioFeedback")).toBeHidden();
  await page.locator("#confirmScenarioButton").click();
  await expect(page.locator("#scenarioFeedback")).toContainText(
    "la ruta exposa el nom intern",
  );
  await expect(page.locator("#scenarioVerdict")).toHaveText(
    "Revisa aquesta ruta",
  );

  await page.locator(`#triage-${first.id}-minimize`).check();
  await expect(page.locator("#scenarioFeedback")).toBeHidden();
  await expect(page.locator("#confirmScenarioButton")).toHaveText(
    "Confirma la decisió",
  );

  await page.locator("#confirmScenarioButton").click();
  await expect(page.locator("#scenarioVerdict")).toHaveText(
    "Alineada amb l'escenari",
  );
});

test("displays redundant evidence paths and their interruption", async ({
  page,
}) => {
  const answers = { ...correctAnswers };
  answers["stack-trace"] = "send";
  answers["cover-letter"] = "send";
  answers["store-copy"] = "send";

  await page.goto("/");
  await completeTriage(page, answers);

  const owner = page
    .locator(".inference-card")
    .filter({ hasText: "Identitat de l'autor i del projecte" });
  await expect(owner).toHaveClass(/is-active/);
  await expect(owner.locator(".evidence-path")).toHaveCount(2);
  await expect(owner).toContainText("Via de la traça d'error");
  await expect(owner).toContainText("Via del text de botiga");
  const stackMessage = owner.locator(
    '.evidence-message[data-scenario-id="stack-trace"]',
  );
  await expect(stackMessage).toHaveAttribute("open", "");
  await expect(stackMessage.locator("blockquote")).toHaveText(
    data.SCENARIOS.find((scenario) => scenario.id === "stack-trace").prompt,
  );

  await page.locator("#reviseTriageButton").click();
  await expect(page.locator("#dossierPanel")).toBeHidden();
  const restored = JSON.parse(
    await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY),
  );
  expect(restored.submittedAnswers).toBeNull();
  expect(restored.repairs).toEqual({});
});

test("requires exact incident actions and explains a failed attempt", async ({
  page,
}) => {
  await page.goto("/");
  await completeTriage(page);
  await completeRepair(page);

  for (const optionId of [...correctIncidentIds, "ignore"])
    await page.locator(`#incident-${optionId}`).check();
  await page.locator(`#transfer-${correctTransferId}`).check();
  await page.locator("#checkResponseButton").click();

  await expect(page.locator("#responsePanel")).toBeVisible();
  await expect(page.locator("#responseSummary")).toContainText(
    "acció inadequada",
  );
  await expect(
    page
      .locator("#incident-ignore")
      .locator("xpath=..")
      .locator(".response-feedback"),
  ).toContainText("falsa dicotomia");

  await page.locator("#incident-ignore").uncheck();
  await expect(page.locator("#responseSummary")).toBeHidden();
  await page.locator("#checkResponseButton").click();
  await expect(page.locator("#completionPanel")).toBeVisible();
});

test("copies only the static ATURA card", async ({ page }) => {
  await installState(page, completedState);
  await page.addInitScript(() => {
    window.__copiedAtura = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(value) {
          window.__copiedAtura = value;
        },
      },
    });
  });
  await page.goto("/");
  await page.locator("#copyAturaButton").click();
  const copied = await page.evaluate(() => window.__copiedAtura);
  expect(copied).toContain("ATURA abans d'enviar");
  expect(copied).toContain("Autorització");
  expect(copied).not.toContain("stack-trace");
  expect(copied).not.toContain("Bru Terrades");
});

test("loads only first-party runtime assets", async ({ page }) => {
  const foreignRequests = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin === "http://127.0.0.1:43176") {
      await route.continue();
    } else {
      foreignRequests.push(url);
      await route.abort();
    }
  });
  await page.goto("/");
  await expect(page.locator("#orientationPanel")).toBeVisible();
  expect(foreignRequests).toEqual([]);
});

test("supports a logical keyboard start with visible focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#startButton")).toBeFocused();
  const focusStyle = await page.locator("#startButton").evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);

  await page.keyboard.press("Enter");
  await expect(page.locator("#triageTitle")).toBeFocused();
});

test("can complete every stage without pointer input", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  for (const scenario of data.SCENARIOS) {
    await selectWithKeyboard(
      page,
      `#triage-${scenario.id}-${scenario.correctChoice}`,
    );
    await activateWithKeyboard(page, "#confirmScenarioButton");
    await expect(page.locator("#scenarioFeedback")).toBeVisible();
    await activateWithKeyboard(page, "#confirmScenarioButton");
  }
  await expect(page.locator("#dossierPanel")).toBeVisible();

  await activateWithKeyboard(page, "#startRepairButton");
  for (const [repairId, optionId] of Object.entries(correctRepairs)) {
    await selectWithKeyboard(page, `#${repairId}-${optionId}`);
  }
  await activateWithKeyboard(page, "#checkRepairButton");
  await expect(page.locator("#responsePanel")).toBeVisible();

  for (const optionId of correctIncidentIds) {
    await selectWithKeyboard(page, `#incident-${optionId}`);
  }
  await selectWithKeyboard(page, `#transfer-${correctTransferId}`);
  await activateWithKeyboard(page, "#checkResponseButton");
  await expect(page.locator("#completionPanel")).toBeVisible();
});

const auditedStates = [
  "initial",
  "triage",
  "dossier",
  "repair",
  "response",
  "complete",
];

for (const stateName of auditedStates) {
  test(`has no axe violations in the ${stateName} state`, async ({ page }) => {
    if (stateName !== "initial") {
      await installState(page, restoredStateFor(stateName));
    }
    await page.goto("/");
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations,
      JSON.stringify(result.violations, null, 2),
    ).toEqual([]);
  });
}

test.describe("320 CSS pixel reflow (400% zoom equivalent)", () => {
  test.use({ viewport: { width: 320, height: 740 } });

  for (const stateName of auditedStates) {
    test(`does not overflow horizontally in the ${stateName} state`, async ({
      page,
    }) => {
      if (stateName !== "initial") {
        await installState(page, restoredStateFor(stateName));
      }
      await page.goto("/");
      const dimensions = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll("*")]
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              node: `${node.tagName.toLowerCase()}#${node.id}.${node.className}`,
              left: rect.left,
              right: rect.right,
              width: rect.width,
            };
          })
          .filter(
            ({ left, right, width }) =>
              width > 0 && (left < -0.5 || right > clientWidth + 0.5),
          )
          .slice(0, 12);
        const wideContainers = [...document.querySelectorAll("*")]
          .filter((node) => node.scrollWidth > node.clientWidth + 0.5)
          .map((node) => ({
            node: `${node.tagName.toLowerCase()}#${node.id}.${node.className}`,
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth,
          }))
          .slice(0, 12);
        return {
          bodyScrollWidth: document.body.scrollWidth,
          clientWidth,
          offenders,
          scrollWidth: document.documentElement.scrollWidth,
          wideContainers,
        };
      });
      expect(
        dimensions.scrollWidth,
        JSON.stringify(
          {
            bodyScrollWidth: dimensions.bodyScrollWidth,
            offenders: dimensions.offenders,
            wideContainers: dimensions.wideContainers,
          },
          null,
          2,
        ),
      ).toBeLessThanOrEqual(dimensions.clientWidth);
    });
  }
});

test("remains reflow-safe across common embed widths", async ({ page }) => {
  await installState(page, completedState);
  await page.goto("/");
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});

test("supports 200% text and WCAG text-spacing overrides", async ({ page }) => {
  await installState(page, completedState);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.addStyleTag({
    url: "/tests/user-overrides.css",
  });
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("keeps selected state visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await page.locator("#startButton").click();
  const first = data.SCENARIOS[0];
  const control = page.locator(`#triage-${first.id}-${first.correctChoice}`);
  await control.check();
  expect(
    await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
  ).toBe(true);
  const outline = await control
    .locator("xpath=following-sibling::label")
    .evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
      };
    });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(3);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("removes meaningful transition and animation timing", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    const stageAnimation = await page
      .locator("#orientationPanel")
      .evaluate((node) => getComputedStyle(node).animationDuration);
    const progressTransition = await page
      .locator(".progress-steps li")
      .first()
      .evaluate((node) => getComputedStyle(node, "::after").transitionDuration);
    expect(Number.parseFloat(stageAnimation)).toBeLessThanOrEqual(0.01);
    expect(Number.parseFloat(progressTransition)).toBeLessThanOrEqual(0.01);
  });
});

test("works as a readable fallback with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:43176/");
  await expect(
    page.getByRole("heading", { name: "El problema no és “IA sí o no”" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "ATURA continua sent útil sense JavaScript",
    }),
  ).toBeVisible();
  await context.close();
});

test("emits versioned aggregate progress, resize, completion, and reset events", async ({
  page,
}) => {
  await installState(page, completedState);
  await page.goto("/tests/iframe-harness.html");
  const events = page.locator("#events");
  await expect(events).toContainText("enti-widget-ready");
  await expect(events).toContainText("enti-widget-progress");
  await expect(events).toContainText("enti-widget-complete");
  await expect(events).toContainText('"restored": true');
  await expect(page.locator("#widget")).toHaveAttribute(
    "data-reported-height",
    /^\d+$/,
  );
  await expect(events).not.toContainText("Bru Terrades");
  await expect(events).not.toContainText("submittedAnswers");

  await page.locator("#reset").click();
  await expect(events).toContainText("enti-widget-reset");
  await expect(
    page.frameLocator("#widget").locator("#orientationPanel"),
  ).toBeVisible();
});

test("the Moodle wrapper ignores forged origins", async ({ page }) => {
  await page.goto("/tests/iframe-harness.html");
  await expect(page.locator("#events")).toContainText("enti-widget-ready");
  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          source: "enti-ai-literacy-widget",
          widget: "b6-auditoria-fuga",
          version: "3.0.0",
          type: "enti-widget-resize",
          outcome: { height: 9999 },
        },
        origin: "https://forged.invalid",
        source: window,
      }),
    );
  });
  await expect(page.locator("#widget")).not.toHaveAttribute(
    "data-reported-height",
    "9999",
  );
  await expect(page.locator("#events")).not.toContainText('"height": 9999');
});
