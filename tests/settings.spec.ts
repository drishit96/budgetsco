import { test, expect } from "@playwright/test";

test("can edit budget", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/auth/login");

  await page.getByLabel("E-mail Id").fill("#{TEST_LOGIN_USERNAME}#");
  await page.getByLabel("Password").fill("#{TEST_LOGIN_PASSWORD}#");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60000 });

  await page.goto("http://127.0.0.1:3000/dashboard");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Edit Budget" }).click();

  await expect(page.locator('input[name="category1"]')).toBeVisible();
  const existingCategoryCount = await page.locator('input[name="category4"]').count();
  if (existingCategoryCount > 0) {
    await page.locator('input[name="budget4"]').fill("1001");
  } else {
    await page.getByRole("button", { name: "Add new" }).click();
    await page.locator('input[name="category4"]').fill("Others");
    await page.locator('input[name="budget4"]').fill("1000");
  }
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Budget saved")).toBeVisible();
  await page.goto("http://127.0.0.1:3000/settings/list");
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("10K").first()).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Edit Budget" }).click();
  await page.waitForURL("**/settings/editBudget");
  await expect(page.locator('input[name="category4"]')).toHaveValue("Others");
  await page.locator("#btn-deleteCategoryBudget4").click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Budget saved")).toBeVisible();
  await page.goto("http://127.0.0.1:3000/settings/list");

  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("9K").first()).toBeVisible();
});

test("can change currency", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/dashboard");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Change currency" }).click();
  await page.locator('input[name="currencyToShow"]').fill("USD");
  await page
    .getByRole("option", { name: "US Dollar (USD)", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Currency updated")).toBeVisible();

  await page.goto("http://127.0.0.1:3000/dashboard");
  await expect(page.getByText("$").first()).toBeVisible();
  await expect(page.getByText("₹").first()).not.toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();

  await page.getByRole("link", { name: "Change currency" }).click();
  await page.locator('input[name="currencyToShow"]').fill("INR");
  await page
    .getByRole("option", { name: "Indian Rupee (INR)", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Currency updated")).toBeVisible();

  await page.goto("http://127.0.0.1:3000/dashboard");
  await expect(page.getByText("$").first()).not.toBeVisible();
  await expect(page.getByText("₹").first()).toBeVisible();
});
