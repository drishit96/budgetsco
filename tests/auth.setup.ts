import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/auth/login");
  await page.getByLabel("E-mail Id").fill("#{TEST_LOGIN_USERNAME}#");
  await page.getByLabel("Password").fill("#{TEST_LOGIN_PASSWORD}#");
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/dashboard", { timeout: 60000 });
  await page.context().storageState({ path: "storageState.json" });
});
