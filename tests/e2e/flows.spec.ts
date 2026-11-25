import { expect, test } from "@playwright/test";
import { topics } from "../../src/content";

test.describe("topic pages", () => {
  for (const topic of topics) {
    test(`plays through ${topic.meta.slug} in both views and modes`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(`/learn/${topic.meta.slug}/`, { waitUntil: "load" });
      await expect(
        page.getByRole("heading", { level: 1, name: topic.meta.title }),
      ).toBeVisible();

      // Step through to the last step using ArrowRight
      for (let i = 1; i < topic.steps.length; i++) {
        await page.keyboard.press("ArrowRight");
      }
      const lastStep = topic.steps[topic.steps.length - 1];
      await expect(
        page.getByRole("heading", { level: 2, name: lastStep.title }),
      ).toBeVisible();

      // Toggle play/pause with Space
      await page.keyboard.press("Space");

      // Switch to Sequence view and back
      await page.getByRole("tab", { name: "Sequence" }).click();
      await expect(
        page.getByRole("img", { name: "Sequence diagram" }),
      ).toBeVisible();
      await page.getByRole("tab", { name: "Network" }).click();

      // Switch to Technical mode
      await page.getByRole("button", { name: "Technical" }).click();
      await expect(page.getByText("Technical detail")).toBeVisible();

      // Click first capture row if a capture table is rendered
      const rows = page.locator('tbody tr[tabindex="0"]');
      if ((await rows.count()) > 0) {
        await rows.first().click();
        await expect(
          page.locator('section[aria-label="Packet inspector"] dl').first(),
        ).toBeVisible();
      }

      expect(errors).toEqual([]);
    });

    test(`opens ${topic.meta.slug} at ?step=2 directly`, async ({ page }) => {
      await page.goto(`/learn/${topic.meta.slug}/?step=2`, {
        waitUntil: "load",
      });
      const step2 = topic.steps[1];
      await expect(
        page.getByRole("heading", { level: 2, name: step2.title }),
      ).toBeVisible();
    });

    test(`has no horizontal overflow on ${topic.meta.slug} at 375x812`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/learn/${topic.meta.slug}/`, { waitUntil: "load" });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    });
  }
});
