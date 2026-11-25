import { expect, test } from "@playwright/test";

test.describe("site basics", () => {
  test("home loads, search opens dns, and theme toggle persists", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "load" });
    await expect(
      page.getByText("What happens when you press Enter"),
    ).toBeVisible();

    // Theme toggle persists across reload
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

    // Search finds DNS and navigates to it
    await page.getByRole("button", { name: "Search topics and glossary" }).click();
    await page.getByPlaceholder("Search protocols or terms").fill("dns");
    await page.getByRole("option", { name: /DNS/ }).first().click();
    await expect(page).toHaveURL(/\/learn\/dns\/?$/);

    expect(errors).toEqual([]);
  });
});
