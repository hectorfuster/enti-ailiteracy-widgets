const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const STORAGE_KEY = "enti-b2-tokenizer-v2";
const COMPLETE_STATE = {
  version: 2,
  currentScenarioId: "depuracio",
  predictions: {
    resum: "ca",
    correu: "en",
    depuracio: "es",
  },
  revealedIds: ["resum", "correu", "depuracio"],
  reflectionCorrect: true,
  completed: true,
};
const STALE_21_STATE = {
  version: 2,
  currentScenarioId: "dialeg",
  predictions: {
    presentacio: "ca",
    interficie: "en",
    dialeg: "es",
  },
  revealedIds: ["presentacio", "interficie", "dialeg"],
  reflectionCorrect: true,
  completed: true,
};

async function installState(page, state = COMPLETE_STATE) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: STORAGE_KEY,
      value: JSON.stringify(state),
    },
  );
}

async function waitForTokenizer(page) {
  await expect(page.locator("#loadStatus")).toContainText("preparat", {
    timeout: 15_000,
  });
}

async function revealScenario(page, scenarioButtonName, prediction) {
  if (scenarioButtonName) {
    await page
      .getByRole("button", { name: scenarioButtonName, exact: true })
      .click();
  }
  await page.getByRole("radio", { name: prediction, exact: true }).check();
  const reveal = page.getByRole("button", {
    name: "Revela el recompte",
    exact: true,
  });
  await expect(reveal).toBeEnabled();
  await reveal.click();
  await expect(page.locator("#resultPanel")).toBeVisible();
}

test("completes the guided learning flow and can start over", async ({
  page,
}) => {
  await page.goto("/");
  await waitForTokenizer(page);

  await expect(
    page.getByRole("heading", { name: "Com es tokenitzen les llengües" }),
  ).toBeVisible();
  await expect(page.locator("#labSection")).toBeHidden();

  await revealScenario(page, null, "Català");
  await expect(
    page.locator('.language-result[data-lang="ca"] .token-total strong'),
  ).toHaveText("8");
  await expect(
    page.locator('.language-result[data-lang="en"] .token-total strong'),
  ).toHaveText("10");
  await expect(
    page.locator('.language-result[data-lang="es"] .token-total strong'),
  ).toHaveText("7");

  const barRatios = await page.locator(".bar-row").evaluateAll((rows) =>
    rows.map((row) => {
      const track = getComputedStyle(row.querySelector(".bar-track"));
      const fill = getComputedStyle(row.querySelector(".bar-fill"));
      return Number.parseFloat(fill.width) / Number.parseFloat(track.width);
    }),
  );
  expect(barRatios[0]).toBeCloseTo(0.8, 1);
  expect(barRatios[1]).toBeCloseTo(1, 1);
  expect(barRatios[2]).toBeCloseTo(0.7, 1);

  await page
    .locator('button[data-origin="guided"][data-language="ca"]')
    .first()
    .click();
  await expect(page.locator("#tokenInspector")).toBeVisible();
  await expect(page.locator("#inspectorIds")).toHaveText(/^\d+(?:, \d+)*$/);

  await revealScenario(page, "Exemple 2 Correu", "Anglès");
  await revealScenario(page, "Exemple 3 Depuració", "Castellà");

  await expect(page.locator("#corpusSection")).toBeVisible();
  await expect(page.locator("#reflectionSection")).toBeVisible();
  await expect(page.locator("#labSection")).toBeHidden();
  await expect(page.locator("#corpusTable tfoot")).toContainText(
    "Mitjana global",
  );
  await expect(page.locator("#corpusTable tfoot")).toContainText("23,7");
  await expect(page.locator("#corpusTable tfoot")).toContainText("16,1");
  await expect(page.locator("#corpusTable tfoot")).toContainText("19,4");

  await page
    .getByRole("radio", {
      name: "El recompte depèn del text concret i de la codificació; una petició real també pot afegir tokens que aquí no es veuen.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Comprova la resposta", exact: true })
    .click();

  await expect(page.locator("#completionStatus")).toContainText(
    "Activitat completada",
  );
  await expect(page.locator("#labSection")).toBeVisible();
  await expect(page.locator("#progressText")).toHaveText("4 de 4 passos");

  await page
    .getByRole("button", { name: "Comença de nou", exact: true })
    .click();
  await expect(page.locator("#progressText")).toHaveText("0 de 4 passos");
  await expect(page.locator("#labSection")).toBeHidden();
  await expect(page.locator("#restartButton")).toBeDisabled();

  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(stored).not.toContain("freeText");
  expect(stored).not.toContain("freeInput");
});

test("handles special syntax, complex Unicode, HTML-like text, and a large paste", async ({
  page,
}) => {
  await installState(page);
  await page.goto("/");
  await waitForTokenizer(page);

  await page.locator("#labDetails > summary").click();
  await page
    .getByRole("button", { name: "Token especial literal", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "El teu text", exact: true }),
  ).toHaveValue("<|endoftext|> és text literal, no una ordre.");
  await expect(page.locator("#freeMetrics .metric").first()).toContainText(
    "15",
  );

  await page
    .getByRole("button", { name: "Emoji i scripts", exact: true })
    .click();
  const chips = page.locator("#freeTokenStream .token-chip");
  await expect(
    page.locator("#freeTokenStream .multi-badge").first(),
  ).toBeVisible();
  expect(await chips.count()).toBeGreaterThan(0);
  expect(
    await chips.evaluateAll(
      (items) => items.filter((item) => !item.textContent.trim()).length,
    ),
  ).toBe(0);
  expect(
    await page.locator("#freeTokenStream .multi-badge").count(),
  ).toBeGreaterThan(0);

  const input = page.getByRole("textbox", { name: "El teu text", exact: true });
  await input.fill('<script id="injected">alert(1)</script>');
  await expect(page.locator("#freeMetrics .metric").first()).not.toHaveText("");
  await expect(page.locator("#injected")).toHaveCount(0);

  await input.fill("a ".repeat(50_000));
  await expect(page.locator("#freeTruncation")).toBeVisible({
    timeout: 15_000,
  });
  expect(
    await page.locator("#freeTokenStream .token-chip").count(),
  ).toBeLessThanOrEqual(320);
  await expect(page.locator("#liveRegion")).toContainText("50001 tokens", {
    timeout: 15_000,
  });
});

test("resets obsolete 2.1 progress without carrying a locked reflection forward", async ({
  page,
}) => {
  await installState(page, STALE_21_STATE);
  await page.goto("/");
  await waitForTokenizer(page);

  await expect(page.locator("#progressText")).toHaveText("0 de 4 passos");
  await expect(page.locator("#reflectionSection")).toBeHidden();
  await expect(page.locator("#labSection")).toBeHidden();

  const sanitizedState = JSON.parse(
    await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY),
  );
  expect(sanitizedState.revealedIds).toEqual([]);
  expect(sanitizedState.reflectionCorrect).toBe(false);
  expect(sanitizedState.completed).toBe(false);

  await revealScenario(page, null, "Català");
  await revealScenario(page, "Exemple 2 Correu", "Anglès");
  await revealScenario(page, "Exemple 3 Depuració", "Castellà");

  await expect(
    page.getByRole("button", { name: "Comprova la resposta", exact: true }),
  ).toBeEnabled();
  await expect(
    page.locator('#reflectionForm input[name="reflection"]:checked'),
  ).toHaveCount(0);
});

test("recovers an incomplete state that incorrectly retained a correct reflection", async ({
  page,
}) => {
  await installState(page, { ...COMPLETE_STATE, completed: false });
  await page.goto("/");
  await waitForTokenizer(page);

  await expect(page.locator("#progressText")).toHaveText("3 de 4 passos");
  await expect(page.locator("#reflectionSection")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comprova la resposta", exact: true }),
  ).toBeEnabled();
  await expect(
    page.locator('#reflectionForm input[name="reflection"]:checked'),
  ).toHaveCount(0);
  await expect(page.locator("#labSection")).toBeHidden();
});

test("falls back cleanly when the worker script cannot load", async ({
  page,
}) => {
  await page.route(/tokenizer-worker\.js(?:\?.*)?$/, (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#loadStatus")).toContainText("mode compatible", {
    timeout: 15_000,
  });

  await page.getByRole("radio", { name: "Català", exact: true }).check();
  await page
    .getByRole("button", { name: "Revela el recompte", exact: true })
    .click();
  await expect(
    page.locator('.language-result[data-lang="ca"] .token-total strong'),
  ).toHaveText("8");
});

test("opens scenario-only deep links and copies no learner or Moodle state", async ({
  page,
}) => {
  await installState(page);
  await page.addInitScript(() => {
    window.__copiedScenarioUrl = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(value) {
          window.__copiedScenarioUrl = value;
        },
      },
    });
  });

  await page.goto(
    "/?scenario=pla-estudi&parentOrigin=https%3A%2F%2Fmoodle.example.edu",
  );
  await waitForTokenizer(page);
  await expect(page.locator("#scenarioName")).toHaveText(
    "Preparar una setmana d’estudi",
  );
  await expect(page.locator('[data-scenario-id="pla-estudi"]')).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page
    .getByRole("button", {
      name: "Copia l’enllaç d’aquest exemple",
      exact: true,
    })
    .click();
  await expect(page.locator("#liveRegion")).toContainText(
    "Només inclou l’identificador de l’exemple",
  );

  const copied = await page.evaluate(() => window.__copiedScenarioUrl);
  const copiedUrl = new URL(copied);
  expect([...copiedUrl.searchParams.entries()]).toEqual([
    ["scenario", "pla-estudi"],
  ]);
  expect(copied).not.toContain("parentOrigin");
  expect(copied).not.toContain("Una%20mica");
  expect(copied).not.toContain("completed");

  await page.goto("/?scenario=no-existeix");
  await expect(page.locator("#scenarioName")).toHaveText(
    "Diagnosticar un error de codi",
  );
});

test("compares encodings and estimates learner-defined context and API cost without retaining text", async ({
  page,
}) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await installState(page);
  await page.goto("/");
  await waitForTokenizer(page);

  await page.locator("#labDetails > summary").click();
  await expect(page.locator("#freeMetrics .metric").first()).toContainText(
    "18",
  );
  await page.locator("#applicationDetails > summary").click();
  await page
    .getByRole("button", { name: "Compara amb cl100k_base", exact: true })
    .click();

  const encodingMetrics = page.locator("#encodingComparison .encoding-metrics");
  await expect(encodingMetrics).toContainText("18");
  await expect(encodingMetrics).toContainText("21", { timeout: 15_000 });
  await expect(page.locator("#encodingComparison")).toContainText(
    "el recompte no és una propietat fixa",
  );

  await page
    .getByRole("spinbutton", {
      name: "Límit de context del model, en tokens",
    })
    .fill("100");
  await expect(page.locator("#contextResult")).toContainText("18,0 %");
  await page
    .getByRole("spinbutton", { name: "Nombre de peticions" })
    .fill("1000");
  await page
    .getByRole("spinbutton", {
      name: "Tokens de sortida previstos per resposta",
    })
    .fill("100");
  await page
    .getByRole("spinbutton", {
      name: "Preu d’entrada per 1 milió de tokens",
    })
    .fill("2");
  await page
    .getByRole("spinbutton", {
      name: "Preu de sortida per 1 milió de tokens",
    })
    .fill("8");
  await expect(page.locator("#inputUsageResult")).toContainText("18.000");
  await expect(page.locator("#outputUsageResult")).toContainText("100.000");
  const estimatedCost = Number(
    await page.locator("#estimatedCostResult").getAttribute("data-value"),
  );
  expect(estimatedCost).toBeCloseTo(0.836, 6);
  await expect(page.locator("#estimatedCostResult")).toContainText("en total");

  await page
    .locator('#freeTokenStream .token-chip[data-group-start="1"]')
    .click();
  await expect(page.locator("#freeInspectorBytes")).toHaveText(/[0-9A-F]{2}/);

  const privateState = await page.evaluate(
    (key) => ({
      stored: window.localStorage.getItem(key),
      search: window.location.search,
    }),
    STORAGE_KEY,
  );
  expect(privateState.stored).not.toContain("Una mica");
  expect(privateState.search).not.toContain("Una%20mica");

  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual(
    [],
  );
  expect(runtimeErrors).toEqual([]);
});

test("keeps 10,000-character lab updates responsive without long main-thread tasks", async ({
  page,
}) => {
  await installState(page);
  await page.addInitScript(() => {
    window.__entiLongTasks = [];
    if ("PerformanceObserver" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__entiLongTasks.push(entry.duration);
        }
      });
      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch {
        // Duration samples below still cover browsers without long-task entries.
      }
    }
  });
  await page.goto("/");
  await waitForTokenizer(page);
  await page.locator("#labDetails > summary").click();
  await expect(page.locator("#freeMetrics .metric").first()).toContainText(
    "18",
  );

  const durations = await page.evaluate(async () => {
    window.__entiLongTasks.length = 0;
    const input = document.querySelector("#freeText");
    const metrics = document.querySelector("#freeMetrics");
    const base = "El jugador desa la partida i continua explorant. "
      .repeat(250)
      .slice(0, 9998);
    const samples = [];

    for (let index = 0; index < 7; index += 1) {
      const text = `${index} ${base}`;
      const started = performance.now();
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () =>
            reject(new Error("El recompte de rendiment ha superat 2 segons.")),
          2000,
        );
        const check = () => {
          if (
            !metrics.classList.contains("is-updating") &&
            metrics.textContent.trim()
          ) {
            window.clearTimeout(timeout);
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
      samples.push(performance.now() - started);
    }
    return samples;
  });

  const sorted = [...durations].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  expect(p95).toBeLessThan(150);
  const longTasks = await page.evaluate(() => window.__entiLongTasks);
  expect(longTasks.filter((duration) => duration > 200)).toEqual([]);
});

test("supports the core flow in a logical keyboard order with visible focus", async ({
  page,
}) => {
  await page.goto("/");
  await waitForTokenizer(page);

  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.keyboard.press("Tab");
  const firstScenario = page.getByRole("button", {
    name: "Exemple 1 Resum",
    exact: true,
  });
  await expect(firstScenario).toBeFocused();
  const outline = await firstScenario.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).not.toBe("none");
  expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(3);

  for (let index = 0; index < 6; index += 1) await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Exemple 7 Comparació", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Tab");
  const catalan = page.getByRole("radio", { name: "Català", exact: true });
  await expect(catalan).toBeFocused();
  await page.keyboard.press("Space");
  await expect(catalan).toBeChecked();

  await page.keyboard.press("Tab");
  const reveal = page.getByRole("button", {
    name: "Revela el recompte",
    exact: true,
  });
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#resultPanel")).toBeVisible();
});

test("emits versioned progress and resize messages in an iframe", async ({
  page,
}) => {
  await page.goto("/tests/iframe-harness.html");
  const widget = page.frameLocator("#widget");
  await expect(widget.locator("#loadStatus")).toContainText("preparat", {
    timeout: 15_000,
  });

  await widget.getByRole("radio", { name: "Català", exact: true }).check();
  await widget
    .getByRole("button", { name: "Revela el recompte", exact: true })
    .click();

  const events = page.locator("#events");
  await expect(events).toContainText("enti-widget-progress");
  await expect(events).toContainText('"scenariosExplored": 1');
  await expect(page.locator("#widget")).toHaveAttribute(
    "data-reported-height",
    /^\d+$/,
  );
  await expect(events).not.toContainText("freeText");

  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "enti-widget-resize",
          widget: "b2-tokenizer",
          version: "2.2.0",
          outcome: { height: 9999 },
        },
        origin: "https://forged.invalid",
        source: window,
      }),
    );
  });
  await expect(events).not.toContainText('"height": 9999');
  await expect(page.locator("#widget")).not.toHaveAttribute(
    "data-reported-height",
    "9999",
  );
});

test("emits one restored completion payload", async ({ page }) => {
  await installState(page);
  await page.goto("/tests/iframe-harness.html");

  const events = page.locator("#events");
  await expect(events).toContainText("enti-widget-complete", {
    timeout: 15_000,
  });
  await expect(events).toContainText('"restored": true');
  await expect(events).toContainText('"reflectionCorrect": true');
});

for (const stateName of ["initial", "completed"]) {
  test(`has no axe violations in the ${stateName} state`, async ({ page }) => {
    if (stateName === "completed") await installState(page);
    await page.goto("/");
    await waitForTokenizer(page);

    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations,
      JSON.stringify(result.violations, null, 2),
    ).toEqual([]);
  });
}

test.describe("320 CSS pixel reflow", () => {
  test.use({ viewport: { width: 320, height: 740 } });

  test("keeps the completed activity and advanced comparison within the viewport", async ({
    page,
  }) => {
    await installState(page);
    await page.goto("/");
    await waitForTokenizer(page);
    await page.locator("#labDetails > summary").click();
    await page.locator("#applicationDetails > summary").click();
    await page
      .getByRole("button", { name: "Compara amb cl100k_base", exact: true })
      .click();
    await expect(
      page.locator("#encodingComparison .encoding-metrics"),
    ).toBeVisible({ timeout: 15_000 });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("removes loader animation and result transitions", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await waitForTokenizer(page);

    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    const loaderAnimation = await page
      .locator(".loader-dots i")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(loaderAnimation).toBe("none");

    await revealScenario(page, null, "Català");
    const barTransition = await page
      .locator(".bar-fill")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(barTransition).toBe("0s");
  });
});
