import { test, expect } from "@playwright/test";

test("AI BYOK Lifecycle", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Enable AI features (BYOK)" }).first().click();

  await expect(page.getByRole("heading", { name: "AI BYOK" })).toBeVisible();

  await page.getByLabel("Base URL").fill("https://api.openai.com/v1");
  await page.getByLabel("API Key").fill("sk-test-1234567890");
  await page.getByLabel("Model").fill("gpt-3.5-turbo");

  await page
    .getByRole("button", { name: /Save Configuration|Update Configuration/ })
    .click();

  await expect(page.getByText("AI configuration saved successfully!")).toBeVisible();

  await page.waitForURL("**/settings/list");

  await page.getByRole("link", { name: "Enable AI features (BYOK)" }).first().click();

  await expect(page.getByLabel("Base URL")).toHaveValue("https://api.openai.com/v1");
  await expect(page.getByLabel("Model")).toHaveValue("gpt-3.5-turbo");

  await expect(page.getByLabel("API Key")).toBeEmpty();

  await page.getByLabel("Base URL").fill("https://openrouter.ai/api/v1");
  await page.getByLabel("API Key").fill("sk-or-test-new-key");
  await page.getByLabel("Model").fill("llama-3-70b");

  await page.getByRole("button", { name: "Update Configuration" }).click();

  await expect(page.getByText("AI configuration saved successfully!")).toBeVisible();
  await page.waitForURL("**/settings/list");

  await page.getByRole("link", { name: "Enable AI features (BYOK)" }).first().click();
  await expect(page.getByLabel("Base URL")).toHaveValue("https://openrouter.ai/api/v1");
  await expect(page.getByLabel("Model")).toHaveValue("llama-3-70b");
});
