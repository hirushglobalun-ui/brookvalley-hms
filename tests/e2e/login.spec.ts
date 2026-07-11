import { test, expect } from "@playwright/test";

test.describe("Login flow E2E template", () => {
  test("should load the login page successfully", async ({ page }) => {
    await page.goto("/login");
    
    // Check if critical elements exist
    await expect(page.locator("h2")).toContainText("Sign in to your account");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
