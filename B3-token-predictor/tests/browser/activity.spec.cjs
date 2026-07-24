const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

async function chooseFirstPrediction(page) {
  const options = page.locator("[data-prediction-token-id]");
  await expect(options).toHaveCount(3);
  await options.first().click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("guided flow preserves truthful one-token sampling and completes", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__completionEvents = [];
    document.addEventListener("enti-widget-complete", (event) => {
      window.__completionEvents.push(event.detail);
    });
  });

  const originalPrompt = await page.locator("#promptText").textContent();
  await chooseFirstPrediction(page);
  await expect(page.locator("#distributionPanel")).toBeVisible();
  await page.getByRole("button", { name: "Mostreja 1 token" }).click();
  await expect(page.locator("#sampleResult")).toBeVisible();
  await expect(page.locator("#promptText")).toHaveText(originalPrompt);

  await page.getByRole("button", { name: "Mostreja'n 10" }).click();
  await expect(page.locator("#sampleCountText")).toContainText("11 mostres");
  await expect(page.locator("#promptText")).toHaveText(originalPrompt);

  await page.getByRole("button", { name: "0,5" }).click();
  await page.getByRole("button", { name: "Mostreja 1 token" }).click();
  await page.getByRole("button", { name: "1,5" }).click();
  await page.getByRole("button", { name: "Mostreja 1 token" }).click();

  await page.locator("#scenarioSelect").selectOption("creative-ca");
  await chooseFirstPrediction(page);
  await page.locator("#scenarioSelect").selectOption("truth-en");
  await chooseFirstPrediction(page);

  await expect(page.locator("#reflectionFieldset")).toBeEnabled();
  await page
    .getByLabel(
      "La selecció es concentra, però no hem afegit coneixement ni verificació.",
    )
    .check();
  await page.getByRole("button", { name: "Comprova la resposta" }).click();
  await expect(page.locator("#reflectionFeedback")).toContainText("Correcte");

  await expect(
    page.getByRole("button", { name: "Finalitza l'activitat" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Finalitza l'activitat" }).click();
  await expect(page.locator("#completionStatus")).toContainText(
    "Finalització desada",
  );

  const events = await page.evaluate(() => window.__completionEvents);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: "enti-widget-complete",
    widget: "b3-token-predictor",
    version: "3.0.0",
    outcome: {
      completed: true,
      reflectionCorrect: true,
    },
  });

  await page.addInitScript(() => {
    window.__completionEventsAfterReload = [];
    document.addEventListener("enti-widget-complete", (event) => {
      window.__completionEventsAfterReload.push(event.detail);
    });
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Activitat completada" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => window.__completionEventsAfterReload),
  ).toEqual([]);
});

test("temperature zero is deterministic without producing a fake sentence", async ({
  page,
}) => {
  await chooseFirstPrediction(page);
  const prompt = await page.locator("#promptText").textContent();
  await page.getByRole("button", { name: "0" }).click();
  await page.getByRole("button", { name: "Mostreja 1 token" }).click();
  await expect(page.locator("#sampleToken")).toHaveText("␠font");
  await page.getByRole("button", { name: "Mostreja 1 token" }).click();
  await expect(page.locator("#sampleToken")).toHaveText("␠font");
  await expect(page.locator("#promptText")).toHaveText(prompt);
  await expect(page.locator("#sampleCountText")).toContainText("2 mostres");
});

test("runtime makes no third-party requests", async ({ page }) => {
  const externalResources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => new URL(url).origin !== location.origin),
  );
  expect(externalResources).toEqual([]);
});

test("initial and revealed states have no serious axe violations", async ({
  page,
}) => {
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);

  await chooseFirstPrediction(page);
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    ),
  ).toEqual([]);
});

test("reflows at 320 CSS pixels without page-level horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await chooseFirstPrediction(page);
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    visibleActions: Array.from(
      document.querySelectorAll(".sampling-actions button"),
    ).every((button) => button.getBoundingClientRect().width > 0),
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.visibleActions).toBe(true);
});

test("primary controls work from the keyboard and announce one concise result", async ({
  page,
}) => {
  const prediction = page.locator("[data-prediction-token-id]").first();
  await prediction.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#distributionPanel")).toBeVisible();
  await expect(page.locator("#temperatureSlider")).toBeFocused();

  const sample = page.getByRole("button", { name: "Mostreja 1 token" });
  await sample.focus();
  await page.keyboard.press("Space");
  await expect(sample).toBeFocused();
  await expect(page.locator("#activityStatus")).toContainText(
    "És una mostra independent del mateix context.",
  );
});

test("reduced-motion preference collapses interface transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transitionSeconds = await page
    .locator("#progressFill")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
  expect(transitionSeconds).toBeLessThanOrEqual(0.001);
});

test("learning evidence remains visible as a compact sticky progress dock", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  const dock = await page.locator(".progress-card").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      top: box.top,
      height: box.height,
      visibleTitle:
        element.querySelector("#progressTitle")?.textContent.trim() ?? "",
    };
  });
  expect(dock.position).toBe("sticky");
  expect(dock.top).toBeGreaterThanOrEqual(0);
  expect(dock.top).toBeLessThanOrEqual(12);
  expect(dock.height).toBeLessThan(180);
  expect(dock.visibleTitle).toBe("Cinc evidències d'aprenentatge");
});
