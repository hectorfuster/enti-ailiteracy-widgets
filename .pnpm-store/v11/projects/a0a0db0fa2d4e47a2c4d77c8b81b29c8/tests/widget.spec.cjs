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
  await expect(
    root.getByRole("heading", {
      name: "Com canvien les decisions amb el rol?",
    }),
  ).toBeVisible();
}

async function continuePastMirror(root) {
  await root.getByRole("button", { name: "Continua amb un cas nou" }).click();
  await expect(root.locator("[data-screen-heading]")).toBeFocused();
}

async function finishAfterMirror(root) {
  await continuePastMirror(root);
  await root.locator('input[name="transfer-choice"]').first().check();
  await submitCurrentForm(root, "submit-transfer");
  await root.getByRole("button", { name: "Formula el teu principi" }).click();
  await expect(root.locator("[data-screen-heading]")).toBeFocused();
  await root.locator('input[name="commitment-standard"]').first().check();
  await submitCurrentForm(root, "submit-commitment");
  await expect(
    root.getByRole("heading", { name: "Un principi per portar a la taula" }),
  ).toBeVisible();
}

async function completeMatchedFlow(root) {
  await reachMirror(root);
  await finishAfterMirror(root);
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
  await expect(page.getByText("4–6 minuts")).toBeVisible();
  await expect(page.getByText("Sense nota")).toBeVisible();
  await expect(page.locator("#progressShell")).toBeVisible();
  await expect(page.locator("#progressValue")).toHaveText("0 %");
  await page.context().setOffline(true);
  await completeMatchedFlow(page);

  await expect(page.getByText("5", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("principis compartits", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-score]")).toHaveCount(0);
  await expect(page.locator("#progressValue")).toHaveText("100 %");

  const stored = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("enti-b8-consent-mirror-v3")),
  );
  expect(stored.completed).toBe(true);
  expect(stored.completionSignalled).toBe(true);
  expect(stored.mirrorReviewed).toBe(true);
  expect(stored.commitment).toEqual({
    standard: Content.COMMITMENT_STANDARDS[0].id,
  });

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

test("the five comparisons are consolidated into one optional-detail mirror", async ({
  page,
}) => {
  await reachMirror(page, { studio: 0, creator: 1 });
  await expect(page.locator(".mirror-item")).toHaveCount(5);
  await expect(
    page.getByText("Aplicacions diferents", { exact: true }),
  ).toHaveCount(5);
  await expect(page.locator("#app textarea")).toHaveCount(0);
  await expect(page.locator("#app input")).toHaveCount(0);

  const firstPrinciple = page.locator(".mirror-item").first();
  await firstPrinciple.locator("summary").click();
  await expect(firstPrinciple).toHaveAttribute("open", "");
  await expect(firstPrinciple.getByText("Com a estudi")).toBeVisible();
  await expect(firstPrinciple.getByText("Com a creador")).toBeVisible();
  await expect(firstPrinciple.locator(".source-list a")).toHaveCount(
    Content.DIMENSIONS[0].sourceIds.length,
  );

  await continuePastMirror(page);
  await page.locator('input[name="transfer-choice"]').first().check();
  await submitCurrentForm(page, "submit-transfer");
  await page.getByRole("button", { name: "Formula el teu principi" }).click();
  await expect(page.locator('input[name="commitment-standard"]')).toHaveCount(
    4,
  );
  await expect(page.locator('input[name="commitment-evidence"]')).toHaveCount(
    0,
  );
  await expect(page.locator("textarea")).toHaveCount(0);
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
      "enti-b8-consent-mirror-v3",
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
      page.evaluate(() => sessionStorage.getItem("enti-b8-consent-mirror-v3")),
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
  await finishAfterMirror(page);
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

  const firstMirrorItem = frame.locator(".mirror-item").first();
  const sourceLinks = firstMirrorItem.locator(".source-list a");
  await page.waitForTimeout(100);
  const resizeCountBefore = JSON.parse(
    await page.locator("#messageLog").textContent(),
  ).filter(({ type }) => type === "resize").length;
  await firstMirrorItem.locator("summary").click();
  await expect(firstMirrorItem).toHaveAttribute("open", "");
  await expect(sourceLinks).toHaveCount(Content.DIMENSIONS[0].sourceIds.length);
  const hrefs = await sourceLinks.evaluateAll((links) =>
    links.map((link) => link.href),
  );
  expect(hrefs.every((href) => href.startsWith("https://"))).toBe(true);
  await expect
    .poll(async () => {
      const messages = JSON.parse(
        await page.locator("#messageLog").textContent(),
      );
      return messages.filter(({ type }) => type === "resize").length;
    })
    .toBeGreaterThan(resizeCountBefore);

  await finishAfterMirror(frame);

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
          version: "2.1.0",
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
