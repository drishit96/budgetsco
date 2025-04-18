import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:3000/auth/login");

  await page.getByLabel("E-mail Id").fill("#{TEST_LOGIN_USERNAME}#");
  await page.getByLabel("Password").fill("#{TEST_LOGIN_PASSWORD}#");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/dashboard");

  await context.storageState({ path: "storageState.json" });
  await context.close();
  await browser.close();
}

export default globalSetup;
