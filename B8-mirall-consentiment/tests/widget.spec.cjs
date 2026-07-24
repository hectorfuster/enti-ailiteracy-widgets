const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const Content = require("../content.js");

async function expectNoAxeViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

async function submitCurrentForm(
  root,
  formName,
  { expectHeading = true } = {},
) {
  await root
    .locator(`form[data-form="${formName}"] button[type="submit"]`)
    .click();
  if (expectHeading) {
    await expect(root.locator("[data-screen-heading]")).toBeFocused();
  }
}

async function answerRole(root, role, choiceIndex) {
  for (let index = 0; index < 5; index += 1) {
    await root.locator(`input[name="${role}-answer"]`).nth(choiceIndex).check();
    await submitCurrentForm(root, `submit-${role}`);
  }
}

async function reachMirror(root, { studio = 0, creator = 0 } = {}) {
  await root.getByRole("button", { name: /Comença amb el barret/ }).click();
  await expect(root.locator("[data-screen-heading]")).toBeFocused();
  await answerRole(root, "studio", studio);
  await root.locator('input[name="prediction"]').first().check();
  await submitCurrentForm(root, "submit-prediction");
  await answerRole(root, "creator", creator);
  await expect(root.getByText("Principi 1 de 5")).toBeVisible();
}

async function reviewMirrors(root, { differences = false } = {}) {
  for (let index = 0; index < 5; index += 1) {
    if (differences) {
      await root.locator('input[name="reflection-reason"]').first().check();
    }
    await root.locator('input[name="reflection-disposition"]').first().check();
    await submitCurrentForm(root, "submit-reflection");
  }
}

async function finishAfterMirrors(
  root,
  {
    note = "Demanaré proves abans de convertir una incertesa en una aprovació.",
  } = {},
) {
  await root.locator('input[name="transfer-choice"]').first().check();
  await submitCurrentForm(root, "submit-transfer");
  await root.getByRole("button", { name: "Formula el teu principi" }).click();
  await expect(root.locator("[data-screen-heading]")).toBeFocused();
  await root.locator('input[name="commitment-standard"]').first().check();
  await root.locator('input[name="commitment-evidence"]').first().check();
  await root.locator('textarea[name="commitment-note"]').fill(note);
  await submitCurrentForm(root, "submit-commitment");
  await expect(
    root.getByRole("heading", { name: "Un principi per portar a la taula" }),
  ).toBeVisible();
}

async function completeMatchedFlow(root) {
  await reachMirror(root);
  await reviewMirrors(root);
  await finishAfterMirrors(root);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
});

test("completes the guided reciprocal flow without a score", async ({
  page,
}) => {
  const requests = [];
  const consoleErrors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.reload();
  await expect(page.getByText("6–8 minuts")).toBeVisible();
  await expect(page.getByText("Sense nota")).toBeVisible();
  await expect(page.locator("#progressShell")).toBeVisible();
  await expect(page.locator("#progressValue")).toHaveText("0 %");
  await page.context().setOffline(true);
  await completeMatchedFlow(page);

  await expect(page.getByText("5", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/principis compartits/i)).toBeVisible();
  await expect(page.locator("[data-score]")).toHaveCount(0);
  await expect(page.locator("#progressValue")).toHaveText("100 %");

  const stored = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("enti-b8-consent-mirror-v2")),
  );
  expect(stored.completed).toBe(true);
  expect(stored.completionSignalled).toBe(true);
  expect(stored.commitment.note).toContain("Demanaré proves");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(value) {
          window.__b8CopiedSummary = value;
        },
      },
    });
    window.print = () => {
      window.__b8PrintRequested = true;
    };
  });
  await page.getByRole("button", { name: "Copia el resum" }).click();
  const copiedSummary = await page.evaluate(() => window.__b8CopiedSummary);
  expect(copiedSummary).toContain("El meu estàndard mínim");
  expect(copiedSummary).toContain(
    "Cinc preguntes abans d’utilitzar un sistema",
  );
  expect(copiedSummary).not.toContain("Com a estudi");
  await expect(page.locator("#activityStatus")).toHaveText(
    "Resum copiat al porta-retalls.",
  );
  await page.getByRole("button", { name: "Imprimeix" }).click();
  expect(await page.evaluate(() => window.__b8PrintRequested)).toBe(true);

  expect(consoleErrors).toEqual([]);
  expect(
    requests.every((url) => new URL(url).origin === "http://127.0.0.1:43178"),
  ).toBe(true);
});

test("preserves original answers during a conscious revision", async ({
  page,
}) => {
  await reachMirror(page, { studio: 0, creator: 1 });
  await expect(page.getByText("Aplicacions diferents")).toBeVisible();

  await page.evaluate(() => {
    window.__b8ProgressStages = [];
    document.addEventListener("enti-widget-progress", (event) => {
      window.__b8ProgressStages.push(event.detail.outcome.stageId);
    });
  });
  await page.getByRole("button", { name: "Revisa les dues decisions" }).click();
  await expect(page.locator("[data-screen-heading]")).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.__b8ProgressStages.at(-1)))
    .toBe("revision");
  await page.locator('input[name="revision-studio"]').nth(2).check();
  await page.locator('input[name="revision-creator"]').nth(2).check();
  await submitCurrentForm(page, "submit-revision");

  await expect(page.getByText("Mateix principi de partida")).toBeVisible();
  await expect(
    page.getByText("Primera resposta:", { exact: true }),
  ).toHaveCount(2);
  await page.locator('input[name="reflection-disposition"]').nth(1).check();
  await submitCurrentForm(page, "submit-reflection");

  for (let index = 1; index < 5; index += 1) {
    await page.locator('input[name="reflection-reason"]').nth(7).check();
    await page.locator('input[name="reflection-disposition"]').first().check();
    await submitCurrentForm(page, "submit-reflection");
  }
  await finishAfterMirrors(page);
  await expect(
    page.getByText("diferències examinades", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("decisions per revisar", { exact: true }),
  ).toBeVisible();
});

test("required feedback is visible, announced, and focused", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Comença amb el barret/ }).click();
  await submitCurrentForm(page, "submit-studio", { expectHeading: false });
  const error = page.locator(".form-error");
  await expect(error).toBeVisible();
  await expect(error).toHaveText("Tria una opció abans de continuar.");
  await expect(error).toBeFocused();
});

test("restores coherent tab-local state and discards corrupt state", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Comença amb el barret/ }).click();
  await page.locator('input[name="studio-answer"]').nth(2).check();
  await page.reload();
  await expect(page.getByText(/Hem recuperat el progrés/)).toBeVisible();
  await expect(
    page.locator('input[name="studio-answer"]').nth(2),
  ).toBeChecked();

  await page.evaluate(() => {
    sessionStorage.setItem(
      "enti-b8-consent-mirror-v2",
      JSON.stringify({ stateVersion: 999, screen: "complete" }),
    );
  });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "El mateix principi, des de dos costats",
    }),
  ).toBeVisible();
});

test("reset removes the tab-local attempt and returns to one initial state", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Comença amb el barret/ }).click();
  await page.locator('input[name="studio-answer"]').nth(1).check();
  await submitCurrentForm(page, "submit-studio");
  await expect(page.locator("#progressValue")).not.toHaveText("0 %");

  await page.getByRole("button", { name: "Reinicia" }).click();
  await expect(page.locator("#restartDialog")).toBeVisible();
  await page.getByRole("button", { name: "Esborra i reinicia" }).click();

  await expect(
    page.getByRole("heading", {
      name: "El mateix principi, des de dos costats",
    }),
  ).toBeFocused();
  await expect(page.locator("#progressValue")).toHaveText("0 %");
  await expect(page.getByRole("button", { name: "Reinicia" })).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => sessionStorage.getItem("enti-b8-consent-mirror-v2")),
    )
    .toBeNull();
});

test("the complete activity works when session storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value() {
          throw new DOMException("Storage disabled", "SecurityError");
        },
      });
    }
  });
  await page.reload();
  await completeMatchedFlow(page);
  await expect(page.locator("#progressValue")).toHaveText("100 %");
});

test("native radio groups work with the keyboard", async ({ page }) => {
  await page.getByRole("button", { name: /Comença amb el barret/ }).click();
  const radios = page.locator('input[name="studio-answer"]');
  await radios.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeChecked();
  await expect(radios.nth(1)).toBeFocused();
});

test("key screens have no automated WCAG A/AA violations", async ({ page }) => {
  await expectNoAxeViolations(page);
  await reachMirror(page);
  await expectNoAxeViolations(page);
  await reviewMirrors(page);
  await finishAfterMirrors(page);
  await expectNoAxeViolations(page);
});

test("reflows at 320 CSS pixels and honors reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /Comença amb el barret/ }).click();
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    transition: getComputedStyle(document.querySelector(".button"))
      .transitionDuration,
    animation: getComputedStyle(document.querySelector(".button"))
      .animationName,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.transition).toBe("0s");
  expect(metrics.animation).toBe("none");
});

test("forced colors retain selection, focus, and reflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ forcedColors: "active" });
  await page.getByRole("button", { name: /Comença amb el barret/ }).click();
  const radio = page.locator('input[name="studio-answer"]').first();
  await radio.check();
  await radio.focus();
  const metrics = await page.evaluate(() => {
    const input = document.querySelector('input[name="studio-answer"]:checked');
    const label = document.querySelector(`label[for="${input.id}"]`);
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      outlineStyle: getComputedStyle(label).outlineStyle,
      outlineWidth: getComputedStyle(label).outlineWidth,
    };
  });
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.outlineStyle).toBe("solid");
  expect(Number.parseFloat(metrics.outlineWidth)).toBeGreaterThanOrEqual(3);
  await expectNoAxeViolations(page);
});

test("learner-authored text is rendered as text, never executable markup", async ({
  page,
}) => {
  const hostile =
    '<img src=x onerror="window.__b8Injected=true"> Principi segur';
  await reachMirror(page);
  await reviewMirrors(page);
  await finishAfterMirrors(page, { note: hostile });
  await expect(page.locator(".summary-text")).toHaveText(hostile);
  await expect(page.locator(".summary-text img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__b8Injected)).toBeUndefined();
});

test("the no-script fallback gives an equivalent reflection route", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Cal JavaScript per fer l’activitat interactiva",
    }),
  ).toBeVisible();
  await expect(page.getByText(/versió equivalent/)).toBeVisible();
  await context.close();
});

test("an optional course-policy link is HTTPS-only, escaped, and never preloaded", async ({
  page,
}) => {
  const requests = [];
  const label = '<img src=x onerror="window.__policyInjected=true"> Política';
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(
    `/?coursePolicyUrl=${encodeURIComponent(
      "https://moodle.example.edu/local/course-ai-policy",
    )}&coursePolicyLabel=${encodeURIComponent(label)}`,
  );

  const link = page.locator(".policy-note a");
  await expect(link).toHaveText(label);
  await expect(link).toHaveAttribute(
    "href",
    "https://moodle.example.edu/local/course-ai-policy",
  );
  await expect(page.locator(".policy-note img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__policyInjected)).toBeUndefined();
  expect(
    requests.every((url) => new URL(url).origin === "http://127.0.0.1:43178"),
  ).toBe(true);

  await page.goto(
    `/?coursePolicyUrl=${encodeURIComponent("javascript:alert(1)")}`,
  );
  await expect(page.locator(".policy-note a")).toHaveCount(0);
  await expect(page.locator(".policy-note")).toContainText(
    "Consulta la política vigent",
  );
});

test("Moodle receives only validated progress, resize, and once-only completion", async ({
  page,
}) => {
  await page.goto("/tests/iframe-harness.html");
  await page.waitForFunction(
    () =>
      document.querySelector("iframe")?.contentDocument?.readyState ===
      "complete",
  );
  const frame = page
    .frames()
    .find((candidate) => candidate.url().includes("/index.html"));
  expect(frame).toBeTruthy();
  await reachMirror(frame);

  const sourceLinks = frame.locator("details.context-details a");
  await expect(sourceLinks).toHaveCount(Content.DIMENSIONS[0].sourceIds.length);
  const hrefs = await sourceLinks.evaluateAll((links) =>
    links.map((link) => link.href),
  );
  expect(hrefs.every((href) => href.startsWith("https://"))).toBe(true);

  await page.waitForTimeout(100);
  const resizeCountBefore = JSON.parse(
    await page.locator("#messageLog").textContent(),
  ).filter(({ type }) => type === "resize").length;
  await frame.locator("details.context-details summary").click();
  await expect(frame.locator("details.context-details")).toHaveAttribute(
    "open",
    "",
  );
  await expect
    .poll(async () => {
      const messages = JSON.parse(
        await page.locator("#messageLog").textContent(),
      );
      return messages.filter(({ type }) => type === "resize").length;
    })
    .toBeGreaterThan(resizeCountBefore);

  await reviewMirrors(frame);
  await finishAfterMirrors(frame);

  await expect
    .poll(async () => {
      const text = await page.locator("#messageLog").textContent();
      return JSON.parse(text || "[]").filter(({ type }) => type === "complete")
        .length;
    })
    .toBe(1);

  const entries = JSON.parse(await page.locator("#messageLog").textContent());
  expect(
    entries.every(({ type }) =>
      ["progress", "complete", "resize"].includes(type),
    ),
  ).toBe(true);
  expect(JSON.stringify(entries)).not.toMatch(
    /answers|reason|note|attemptId|Demanar[eé] proves/,
  );
  expect(
    entries
      .filter(({ type }) => type === "progress")
      .every(({ outcome }) => typeof outcome.stageId === "string"),
  ).toBe(true);

  const beforeHostile = entries.length;
  await page.evaluate(() => {
    const iframe = document.querySelector("iframe");
    window.dispatchEvent(
      new MessageEvent("message", {
        source: iframe.contentWindow,
        origin: window.location.origin,
        data: {
          type: "enti-widget-complete",
          widget: "b8-consent-mirror",
          version: "2.0.0",
          outcome: {
            completed: true,
            restored: false,
            answers: "private",
          },
        },
      }),
    );
  });
  await expect
    .poll(
      async () =>
        JSON.parse(await page.locator("#messageLog").textContent()).length,
    )
    .toBe(beforeHostile);

  await frame.evaluate(() => window.location.reload());
  await frame.waitForLoadState();
  await page.waitForTimeout(250);
  let afterReload = JSON.parse(await page.locator("#messageLog").textContent());
  expect(afterReload.filter(({ type }) => type === "complete")).toHaveLength(1);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const iframe = document.querySelector("iframe");
        return (
          iframe.contentDocument.documentElement.scrollHeight -
          iframe.clientHeight
        );
      }),
    )
    .toBeLessThanOrEqual(2);

  await frame.getByRole("button", { name: "Torna a començar" }).click();
  await frame.getByRole("button", { name: "Esborra i reinicia" }).click();
  await completeMatchedFlow(frame);
  await expect
    .poll(async () => {
      const messages = JSON.parse(
        await page.locator("#messageLog").textContent(),
      );
      return messages.filter(({ type }) => type === "complete").length;
    })
    .toBe(2);
  await frame.evaluate(() => window.location.reload());
  await frame.waitForLoadState();
  await page.waitForTimeout(250);
  afterReload = JSON.parse(await page.locator("#messageLog").textContent());
  expect(afterReload.filter(({ type }) => type === "complete")).toHaveLength(2);
});
