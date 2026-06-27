import { test, expect } from "@playwright/test";

test.describe("Admin Panel", () => {
  test("should load the admin login page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveTitle(/LocalVoice/i);
    // Since it's protected, it might redirect or show a login form
    // We just verify it loads without crashing for now.
  });
});
