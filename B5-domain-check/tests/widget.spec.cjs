const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const STORAGE_KEY = "enti-b5-domain-check-v2";

async function expectStageFocus(surface) {
  await expect(surface.locator("#stage-title")).toBeFocused();
}

async function tabTo(page, locator, maximumTabs = 20) {
  expect(await locator.count()).toBe(1);
  for (let index = 0; index <= maximumTabs; index += 1) {
    const focused = await locator.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) return;
    await page.keyboard.press("Tab");
  }
  await expect(locator).toBeFocused();
}

async function chooseRatingWithKeyboard(page, domainId, value) {
  const first = page.getByTestId(`rating-${domainId}-1`);
  await tabTo(page, first);
  await page.keyboard.press("Space");
  for (let index = 1; index < value; index += 1) {
    await page.keyboard.press("ArrowRight");
  }
  const selected = page.getByTestId(`rating-${domainId}-${value}`);
  await expect(selected).toBeFocused();
  await expect(selected).toBeChecked();
}

async function chooseFamiliarity(surface) {
  await surface.getByTestId("rating-videojocs-5").check({ force: true });
  await surface.getByTestId("rating-musica-1").check({ force: true });
  await surface.getByTestId("rating-astronomia-3").check({ force: true });
  await surface.getByTestId("rating-comptabilitat-2").check({ force: true });
  await surface.getByTestId("save-familiarity").click();
}

async function answerJudgment(
  surface,
  answer = "clean",
  confidence = "medium",
) {
  await surface.getByTestId(`answer-${answer}`).check();
  await surface.getByTestId(`confidence-${confidence}`).check();
}

async function completeFlow(surface, options = {}) {
  const { pauseAfterFirstCore = false } = options;
  await surface.getByTestId("start").click();
  await chooseFamiliarity(surface);
  await answerJudgment(surface, "1", "medium");
  await surface.getByTestId("submit-practice").click();
  await surface.getByTestId("begin-core").click();

  for (let index = 0; index < 10; index += 1) {
    await answerJudgment(
      surface,
      index % 3 === 0 ? "0" : "clean",
      index % 2 === 0 ? "high" : "low",
    );
    await surface.getByTestId("submit-core").click();
    if (pauseAfterFirstCore && index === 0) return;
    await surface
      .getByTestId(index === 9 ? "finish-core" : "next-core")
      .click();
  }

  await surface.getByTestId("begin-transfer").click();
  await surface.getByTestId("transfer-contradicts").check();
  await surface.getByTestId("submit-transfer").click();
  await surface.getByTestId("next-transfer").click();
  await surface.getByTestId("transfer-insufficient").check();
  await surface.getByTestId("submit-transfer").click();
  await surface.getByTestId("finish-transfer").click();

  await surface.getByTestId("reflection-accept").check();
  await surface.getByTestId("submit-reflection").click();
  await surface.getByTestId("retry-reflection").click();
  await surface.getByTestId("reflection-verify").check();
  await surface.getByTestId("submit-reflection").click();
  await surface.getByTestId("show-results").click();
}

async function expectNoAxeViolations(page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual(
    [],
  );
}

test("completes the guided flow without leaking answers or making external requests", async ({
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
    page.getByRole("heading", { name: "El teu resum de verificació" }),
  ).toBeVisible();
  await expect(
    page.getByText("Activitat completada", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".outcome-grid .metric-card")).toHaveCount(5);
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
    responseCount: 10,
    transferCount: 2,
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

test("keeps evidence hidden until commitment and exposes a safe source link afterward", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("start").click();
  await chooseFamiliarity(page);

  await expect(page.locator(".source-card")).toHaveCount(0);
  await answerJudgment(page, "1");
  await page.getByTestId("submit-practice").click();
  await expect(page.locator(".source-card")).toBeVisible();
  await page.getByTestId("begin-core").click();

  await expect(page.locator(".source-card")).toHaveCount(0);
  await expect(page.locator(".source-link")).toHaveCount(0);
  await answerJudgment(page);
  await page.getByTestId("submit-core").click();
  const sourceLink = page.locator(".source-link");
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(sourceLink).toHaveAttribute("href", /^https:\/\//);
});

test("validates required choices, manages focus, resumes, and rejects incoherent state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("start").click();
  await expectStageFocus(page);
  await expectNoAxeViolations(page);
  await page.getByTestId("save-familiarity").click();
  await expect(page.locator("#form-error")).toBeVisible();
  await expect(page.getByTestId("rating-videojocs-1")).toBeFocused();

  await chooseFamiliarity(page);
  await expectStageFocus(page);
  await expectNoAxeViolations(page);
  await answerJudgment(page, "1");
  await page.getByTestId("submit-practice").click();
  await expectNoAxeViolations(page);
  await page.getByTestId("begin-core").click();
  await answerJudgment(page);
  await page.getByTestId("submit-core").click();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: /Decisió revisada|Revisa què ha passat/,
    }),
  ).toBeVisible();
  await page.getByTestId("next-core").click();
  await expect(
    page.getByRole("heading", { name: "Decisió 2 de 10" }),
  ).toBeVisible();

  await page.evaluate((key) => {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        version: 2,
        stage: "results",
        highDomainId: "videojocs",
        lowDomainId: "musica",
        ratings: { videojocs: 5, musica: 1, astronomia: 3, comptabilitat: 2 },
        milestones: { reflection: true },
      }),
    );
  }, STORAGE_KEY);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Quan «sembla correcte» no és prou" }),
  ).toBeVisible();
});

test("reflows at 320 CSS pixels with operable, non-overlapping controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByTestId("start").click();
  await chooseFamiliarity(page);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    controls: [...document.querySelectorAll(".choice-card")].map((element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, height: box.height };
    }),
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.controls.every((control) => control.height >= 44)).toBe(true);
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

  await chooseRatingWithKeyboard(page, "videojocs", 5);
  await chooseRatingWithKeyboard(page, "musica", 1);
  await chooseRatingWithKeyboard(page, "astronomia", 3);
  await chooseRatingWithKeyboard(page, "comptabilitat", 2);
  await tabTo(page, page.getByTestId("save-familiarity"));
  await page.keyboard.press("Enter");
  await expectStageFocus(page);

  await tabTo(page, page.getByTestId("answer-clean"));
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("answer-1")).toBeChecked();
  await tabTo(page, page.getByTestId("confidence-low"));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("confidence-medium")).toBeChecked();
  await tabTo(page, page.getByTestId("submit-practice"));
  await page.keyboard.press("Enter");
  await expectStageFocus(page);
  await tabTo(page, page.getByTestId("begin-core"));
  await page.keyboard.press("Enter");

  for (let index = 0; index < 10; index += 1) {
    await expectStageFocus(page);
    await tabTo(page, page.getByTestId("answer-clean"));
    await page.keyboard.press("Space");
    await expect(page.getByTestId("answer-clean")).toBeChecked();
    await tabTo(page, page.getByTestId("confidence-low"));
    await page.keyboard.press("Space");
    await expect(page.getByTestId("confidence-low")).toBeChecked();
    await tabTo(page, page.getByTestId("submit-core"));
    await page.keyboard.press("Enter");
    await expectStageFocus(page);
    await tabTo(
      page,
      page.getByTestId(index === 9 ? "finish-core" : "next-core"),
    );
    await page.keyboard.press("Enter");
  }

  await expectStageFocus(page);
  await tabTo(page, page.getByTestId("begin-transfer"));
  await page.keyboard.press("Enter");

  await tabTo(page, page.getByTestId("transfer-supports"));
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("transfer-contradicts")).toBeChecked();
  await tabTo(page, page.getByTestId("submit-transfer"));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByTestId("next-transfer"));
  await page.keyboard.press("Enter");

  await tabTo(page, page.getByTestId("transfer-supports"));
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("transfer-insufficient")).toBeChecked();
  await tabTo(page, page.getByTestId("submit-transfer"));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByTestId("finish-transfer"));
  await page.keyboard.press("Enter");

  await tabTo(page, page.getByTestId("reflection-accept"));
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("reflection-verify")).toBeChecked();
  await tabTo(page, page.getByTestId("submit-reflection"));
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByTestId("show-results"));
  await page.keyboard.press("Enter");

  await expectStageFocus(page);
  await expect(
    page.getByRole("heading", { name: "El teu resum de verificació" }),
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
  await chooseFamiliarity(page);
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
  const [completion] = completions;
  expect(completion).toMatchObject({
    schemaVersion: 1,
    widget: "B5-domain-check",
    version: 2,
    outcome: {
      completed: true,
      coreItemsAnswered: 10,
      transferItemsAnswered: 2,
      reflectionCompleted: true,
    },
  });
  for (const privateField of [
    "answers",
    "responses",
    "ratings",
    "confidence",
    "scores",
  ]) {
    expect(completion).not.toHaveProperty(privateField);
    expect(completion.outcome).not.toHaveProperty(privateField);
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
    widget.getByRole("heading", { name: "El teu resum de verificació" }),
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
