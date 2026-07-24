const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const STORAGE_KEY = "enti-b5-domain-check-v3";

async function expectStageFocus(surface) {
  await expect(surface.locator("#stage-title")).toBeFocused();
}

async function tabTo(page, locator, maximumTabs = 20) {
  expect(await locator.count()).toBe(1);
  for (let index = 0; index <= maximumTabs; index += 1) {
    if (
      await locator.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  await expect(locator).toBeFocused();
}

async function chooseDomains(surface) {
  await surface.getByTestId("high-domain").selectOption("videojocs");
  await surface.getByTestId("low-domain").selectOption("musica");
  await surface.getByTestId("save-familiarity").click();
}

async function completeFlow(surface, options = {}) {
  const { pauseAfterFirstCore = false } = options;
  await surface.getByTestId("start").click();
  await chooseDomains(surface);
  await surface.getByTestId("answer-1").check();
  await surface.getByTestId("submit-practice").click();
  await surface.getByTestId("begin-core").click();

  for (let index = 0; index < 6; index += 1) {
    await surface
      .getByTestId(index % 2 === 0 ? "answer-0" : "answer-clean")
      .check();
    await surface.getByTestId("submit-core").click();
    if (pauseAfterFirstCore && index === 0) return;
    await surface
      .getByTestId(index === 5 ? "finish-core" : "next-core")
      .click();
  }

  await surface.getByTestId("transfer-contradicts").check();
  await surface.getByTestId("submit-transfer").click();
  await surface.getByTestId("show-results").click();
}

async function expectNoAxeViolations(page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual(
    [],
  );
}

test("completes the short flow without leaking answers or making external requests", async ({
  page,
}) => {
  const runtimeErrors = [];
  const requests = [];
  const blockedExternalRequests = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") {
      await route.continue();
      return;
    }
    blockedExternalRequests.push(url.href);
    await route.abort();
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await page.evaluate(() => {
    window.__b5CompletionEvents = [];
    document.addEventListener("enti-widget-complete", (event) => {
      window.__b5CompletionEvents.push(event.detail);
    });
  });
  await expect(
    page.getByRole("heading", { name: "El corrector" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await completeFlow(page);

  await expect(
    page.getByRole("heading", { name: "Queda't amb això" }),
  ).toBeVisible();
  await expect(page.locator(".simple-comparison > p")).toHaveCount(2);
  await expect(page.locator(".simple-comparison")).toContainText("de 3");
  await expect(page.locator(".takeaway")).toContainText("Idea clau");
  await expect(page.locator(".outcome-grid, .confidence-grid")).toHaveCount(0);
  await expectNoAxeViolations(page);

  const persisted = await page.evaluate((key) => {
    const state = JSON.parse(window.sessionStorage.getItem(key));
    return {
      completed: state.completed,
      responseCount: state.responses.length,
      transferCount: state.transferResponses.length,
      localStorageLength: window.localStorage.length,
    };
  }, STORAGE_KEY);
  expect(persisted).toEqual({
    completed: true,
    responseCount: 6,
    transferCount: 1,
    localStorageLength: 0,
  });
  const completionEvents = await page.evaluate(
    () => window.__b5CompletionEvents,
  );
  expect(completionEvents).toHaveLength(1);
  expect(completionEvents[0].outcome).not.toHaveProperty("responses");
  expect(requests.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  expect(blockedExternalRequests).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test("selects a sentence inside the output and keeps feedback in place", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("start").click();
  await chooseDomains(page);

  const output = page.locator(".synthetic-output");
  await expect(output.locator(".claim-line")).toHaveCount(3);
  await expect(output.locator(".source-link")).toHaveCount(0);
  await output.locator(".claim-line").nth(1).click();
  await expect(page.getByTestId("answer-1")).toBeChecked();
  await expect(output.locator(".claim-line:has(input:checked)")).toHaveCount(1);

  await page.getByTestId("submit-practice").click();
  await expect(page.locator(".reviewed-output .claim-review-line")).toHaveCount(
    3,
  );
  await expect(page.locator(".correction-strip")).toHaveCount(1);
  await expect(page.locator(".claim-review-list, .source-card")).toHaveCount(0);
  await page.getByTestId("begin-core").click();

  await expect(page.locator(".source-link")).toHaveCount(0);
  await page.getByTestId("answer-clean").check();
  await page.getByTestId("submit-core").click();
  const sourceLink = page.locator(".source-link");
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(sourceLink).toHaveAttribute("href", /^https:\/\//);
});

test("validates choices, manages focus, resumes, and rejects incoherent state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("start").click();
  await expectStageFocus(page);
  await page.getByTestId("save-familiarity").click();
  await expect(page.locator("#form-error")).toBeVisible();
  await expect(page.getByTestId("high-domain")).toBeFocused();

  await page.getByTestId("high-domain").selectOption("videojocs");
  await page.getByTestId("low-domain").selectOption("videojocs");
  await page.getByTestId("save-familiarity").click();
  await expect(page.locator("#form-error")).toContainText(
    "Tria dos àmbits diferents",
  );
  await expect(page.getByTestId("low-domain")).toBeFocused();

  await page.getByTestId("low-domain").selectOption("musica");
  await page.getByTestId("save-familiarity").click();
  await expectStageFocus(page);
  await page.getByTestId("answer-1").check();
  await page.getByTestId("submit-practice").click();
  await page.getByTestId("begin-core").click();
  await page.getByTestId("answer-clean").check();
  await page.getByTestId("submit-core").click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Ben vist|Revisa-ho/ }),
  ).toBeVisible();
  await page.getByTestId("next-core").click();
  await expect(
    page.getByRole("heading", { name: "Resposta 2 de 6" }),
  ).toBeVisible();

  await page.evaluate((key) => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        version: 3,
        stage: "results",
        highDomainId: "videojocs",
        lowDomainId: "musica",
        milestones: { started: true, transfer: true },
      }),
    );
  }, STORAGE_KEY);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Quan «sembla correcte» no és prou" }),
  ).toBeVisible();
});

test("reflows at 320 CSS pixels with large, non-overlapping sentence controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByTestId("start").click();
  await chooseDomains(page);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    htmlMinWidth: getComputedStyle(document.documentElement).minWidth,
    controls: [...document.querySelectorAll(".claim-line, .clean-option")].map(
      (element) => {
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      },
    ),
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.htmlMinWidth).not.toBe("320px");
  expect(layout.controls).toHaveLength(4);
  expect(layout.controls.every((control) => control.height >= 50)).toBe(true);
  for (let index = 1; index < layout.controls.length; index += 1) {
    expect(layout.controls[index].top).toBeGreaterThanOrEqual(
      layout.controls[index - 1].bottom,
    );
  }
});

test("completes the entire activity using only native keyboard interaction", async ({
  page,
}) => {
  await page.goto("/");
  await tabTo(page, page.getByTestId("start"));
  await page.keyboard.press("Enter");
  await expectStageFocus(page);

  await tabTo(page, page.getByTestId("high-domain"));
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("high-domain")).toHaveValue("videojocs");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("low-domain")).toHaveValue("musica");
  await tabTo(page, page.getByTestId("save-familiarity"));
  await page.keyboard.press("Enter");
  await expectStageFocus(page);

  await tabTo(page, page.getByTestId("answer-0"));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("answer-1")).toBeChecked();
  await tabTo(page, page.getByTestId("submit-practice"));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByTestId("begin-core"));
  await page.keyboard.press("Enter");

  for (let index = 0; index < 6; index += 1) {
    await expectStageFocus(page);
    await tabTo(page, page.getByTestId("answer-0"));
    await page.keyboard.press("Space");
    await expect(page.getByTestId("answer-0")).toBeChecked();
    await tabTo(page, page.getByTestId("submit-core"));
    await page.keyboard.press("Enter");
    await expectStageFocus(page);
    await tabTo(
      page,
      page.getByTestId(index === 5 ? "finish-core" : "next-core"),
    );
    await page.keyboard.press("Enter");
  }

  await expectStageFocus(page);
  await tabTo(page, page.getByTestId("transfer-supports"));
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("transfer-contradicts")).toBeChecked();
  await tabTo(page, page.getByTestId("submit-transfer"));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByTestId("show-results"));
  await page.keyboard.press("Enter");

  await expectStageFocus(page);
  await expect(
    page.getByRole("heading", { name: "Queda't amb això" }),
  ).toBeVisible();
});

test("preserves reflow and selected state at 200% CSS zoom in forced colors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 740 });
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await page.getByTestId("start").click();
  await chooseDomains(page);
  await page.getByTestId("answer-clean").check();

  const metrics = await page.evaluate(() => {
    const selected = document
      .querySelector('[data-testid="answer-clean"]')
      .closest("label");
    const style = getComputedStyle(selected);
    const motionStyle = getComputedStyle(document.querySelector(".button"));
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      selectedOutline: style.outlineStyle,
      transitionDuration: motionStyle.transitionDuration,
      animationDuration: motionStyle.animationDuration,
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.selectedOutline).not.toBe("none");
  expect(Number.parseFloat(metrics.transitionDuration)).toBeLessThanOrEqual(
    0.00001,
  );
  expect(Number.parseFloat(metrics.animationDuration)).toBeLessThanOrEqual(
    0.00001,
  );
  await expect(page.getByTestId("answer-clean")).toBeChecked();
});

test("uses the versioned exact-origin iframe completion and resize contract", async ({
  page,
}) => {
  await page.goto("/tests/iframe-harness.html");
  const widget = page.frameLocator("#widget");
  await expect(
    widget.getByRole("heading", { name: "El corrector" }),
  ).toBeVisible();
  const widgetFrame = page
    .frames()
    .find((frame) => frame.url().includes("/index.html?parentOrigin="));
  expect(widgetFrame).toBeTruthy();

  await page.evaluate(() => {
    const iframe = document.getElementById("widget");
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "enti-widget-complete",
          schemaVersion: 1,
          widget: "B5-domain-check",
          outcome: { completed: true },
        },
        origin: "https://unapproved.example",
        source: iframe.contentWindow,
      }),
    );
  });
  expect(
    await page.evaluate(
      () =>
        window.widgetMessages.filter(
          (message) => message.type === "enti-widget-complete",
        ).length,
    ),
  ).toBe(0);
  await widgetFrame.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "enti-widget-complete-ack",
          widget: "B5-domain-check",
        },
        origin: "https://unapproved.example",
      }),
    );
  });
  await expect(widget.locator("#activity-status")).not.toHaveText(
    "El curs ha confirmat la finalització de l'activitat.",
  );

  await completeFlow(widget);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.widgetMessages.some(
          (message) => message?.type === "enti-widget-complete",
        ),
      ),
    )
    .toBe(true);
  const messages = await page.evaluate(() => window.widgetMessages);
  const completions = messages.filter(
    (message) => message.type === "enti-widget-complete",
  );
  expect(completions).toHaveLength(1);
  expect(completions[0]).toMatchObject({
    schemaVersion: 1,
    widget: "B5-domain-check",
    version: 3,
    outcome: {
      completed: true,
      coreItemsAnswered: 6,
      transferItemsAnswered: 1,
    },
  });
  for (const privateField of [
    "answers",
    "responses",
    "confidence",
    "ratings",
    "scores",
  ]) {
    expect(completions[0]).not.toHaveProperty(privateField);
    expect(completions[0].outcome).not.toHaveProperty(privateField);
  }
  expect(
    messages.some(
      (message) =>
        message.type === "enti-widget-resize" &&
        Number.isInteger(message.height) &&
        message.height > 0,
    ),
  ).toBe(true);
  await expect(widget.locator("#activity-status")).toHaveText(
    "El curs ha confirmat la finalització de l'activitat.",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const iframe = document.getElementById("widget");
        return (
          Math.floor(iframe.getBoundingClientRect().height) >=
          iframe.contentDocument.documentElement.scrollHeight
        );
      }),
    )
    .toBe(true);

  await widgetFrame.goto(widgetFrame.url());
  await expect(
    widget.getByRole("heading", { name: "Queda't amb això" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.widgetMessages.filter(
            (message) => message?.type === "enti-widget-complete",
          ).length,
      ),
    )
    .toBe(1);
});
