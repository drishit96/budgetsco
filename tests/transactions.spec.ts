import { test, expect } from "@playwright/test";

test.describe.serial("transactionCrudGroup", () => {
  test("can create transaction", async ({ page }) => {
    await page.goto("/dashboard");
    const existingTransactionCount = await page
      .locator("[data-test-id=more-Business-30]")
      .count();
    await page.getByRole("link", { name: "Create transaction" }).click();
    await page.getByRole("spinbutton").fill("30");
    await page.getByLabel("Type").selectOption("Expense");
    await page.getByPlaceholder("category").fill("Business");
    await page.getByRole("option", { name: "Business", exact: true }).first().click();
    await page.getByPlaceholder("payment").fill("UPI");
    await page.getByRole("option", { name: "UPI", exact: true }).first().click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("[data-test-id=more-Business-30]").first()).toBeVisible();
    const newTransactionCount = await page
      .locator("[data-test-id=more-Business-30]")
      .count();
    expect(newTransactionCount).toBe(existingTransactionCount + 1);
  });

  test("can edit transaction", async ({ page }) => {
    await page.goto("/dashboard");
    const existingTransactionCount = await page
      .locator("[data-test-id=more-Business-30]")
      .count();
    await page.locator("[data-test-id=more-Business-30]").first().click();
    await page.locator("[data-test-id=btn-edit]").click();
    await page.getByRole("spinbutton").fill("50");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("[data-test-id=more-Business-50]").first()).toBeVisible();
    const newTransactionCount = await page
      .locator("[data-test-id=more-Business-30]")
      .count();
    expect(newTransactionCount).toBe(existingTransactionCount - 1);
  });

  test("can delete transaction", async ({ page }) => {
    await page.goto("/dashboard");
    const existingTransactionCount = await page
      .locator("[data-test-id=more-Business-50]")
      .count();
    await page.locator("[data-test-id=more-Business-50]").first().click();
    await page.locator("[data-test-id=btn-delete]").click();
    await page.locator("[data-test-id=btn-delete]").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText("Deleting...")).not.toBeVisible();
    const newTransactionCount = await page
      .locator("[data-test-id=more-Business-50]")
      .count();
    expect(newTransactionCount).toBe(existingTransactionCount - 1);
  });
});
