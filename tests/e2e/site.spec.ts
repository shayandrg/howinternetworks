import { expect, test } from "@playwright/test";
import { topics } from "../../src/content";

test.describe("site pages", () => {
  test("home loads with hero player, search opens dns, and theme persists", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "What happens when you press Enter",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Topic navigation" }),
    ).toBeVisible();
    await expect(page.locator("svg[role='img']").first()).toBeVisible();

    // Theme toggle switches and survives reload
    const before = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    await page.getByRole("button", { name: /Switch to .* theme/ }).click();
    const after = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(after).not.toBe(before);
    await page.reload({ waitUntil: "load" });
    const reloaded = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(reloaded).toBe(after);

    // Search finds dns and opens it
    await page
      .getByRole("button", { name: "Search topics and glossary" })
      .click();
    await page.getByPlaceholder("Search protocols or terms").fill("dns");
    await page.getByRole("option", { name: /DNS/ }).first().click();
    await expect(page).toHaveURL(/\/learn\/dns(\/|\?|$)/);

    expect(errors).toEqual([]);
  });

  test("home has no horizontal overflow at 375x812", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "load" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test("topics, glossary, and about load with no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    for (const url of ["/topics/", "/glossary/", "/about/"]) {
      await page.goto(url, { waitUntil: "load" });
      await expect(page.locator("h1")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("embed route renders stage without site header", async ({ page }) => {
    const slug = topics.some((t) => t.meta.slug === "http")
      ? "http"
      : topics[0].meta.slug;
    await page.goto(`/embed/${slug}/`, { waitUntil: "load" });
    await expect(page.locator("svg[role='img']")).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open the full topic" }),
    ).toBeVisible();
  });
});
