import { test, expect } from "@playwright/test";
import { add } from "date-fns";
import { formatDate_DD_MMMM_YYYY, formatDate_YYYY_MM_DD } from "~/utils/date.utils";

test.describe.serial("recurringTransactionsGroup", () => {
  test("can create recurring transaction", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForTimeout(500);
    // Count existing recurring transactions
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Manage recurring transactions" }).click();
    await page.waitForTimeout(500);

    const initialCount = await page.locator("[data-test-id=more-Business-100]").count();

    // Navigate to create transaction page
    await page.goto("http://localhost:3000/dashboard");
    await page.getByRole("link", { name: "Create transaction" }).click();

    // Fill transaction details
    await page.locator('input[name="amount"]').fill("100");
    await page.getByLabel("Type").selectOption("Expense");
    await page.getByPlaceholder("category").fill("Business");
    await page.getByRole("option", { name: "Business", exact: true }).first().click();
    await page.getByPlaceholder("payment").fill("Credit Card");
    await page.getByRole("option", { name: "Credit Card", exact: true }).first().click();
    await page.getByPlaceholder("Description").fill("Server cost");

    // Set as recurring
    await page.getByText("Make this recurring").click();
    await page.locator('select[name="occurrence"]').selectOption("day(s)");
    await page.locator('input[name="interval"]').fill("2");

    // Save transaction
    await page.getByRole("button", { name: "Save" }).click();

    // Verify transaction was created
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Transaction saved")).toBeVisible();

    //Delete the source transaction
    await page
      .locator("[data-test-id=section-recent-transactions]")
      .locator("[data-test-id=more-Business-100]")
      .first()
      .click();
    await page.locator("[data-test-id=btn-delete]").dblclick();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForTimeout(1000);

    // Verify recurring transaction exists in manage page
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Manage recurring transactions" }).click();

    // There should be one more recurring transaction now
    await expect(page.locator("[data-test-id=more-Business-100]")).toHaveCount(
      initialCount + 1
    );

    // Verify the recurring transaction details
    await expect(page.locator("[data-test-id=more-Business-100]").last()).toHaveText(
      /Server cost/
    );
    await expect(page.locator("[data-test-id=more-Business-100]").last()).toHaveText(
      /Every 2 day\(s\)/
    );
  });

  test("can mark recurring transaction as done", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("http://localhost:3000/dashboard");

    // Check if there are any upcoming recurring transactions
    expect(page.locator("[data-test-id=section-upcoming-transactions]")).toBeVisible();

    // Count existing transactions
    const initialCount = await page
      .locator("[data-test-id=section-recent-transactions]")
      .locator("[data-test-id=more-Business-100]")
      .count();

    // Mark the first transaction as done
    if (!(await page.locator('[data-test-id="btn-recurring-done"]').isVisible())) {
      await page
        .locator("[data-test-id=section-upcoming-transactions]")
        .locator("[data-test-id=more-Business-100]")
        .first()
        .click();
    }

    await page.locator('[data-test-id="btn-recurring-done"]').click();

    await expect(
      page
        .locator("[data-test-id=section-recent-transactions]")
        .locator("[data-test-id=more-Business-100]")
    ).toHaveCount(initialCount + 1);

    await expect(
      page
        .locator("[data-test-id=section-upcoming-transactions]")
        .locator("[data-test-id=more-Business-100]")
    ).not.toBeVisible();

    //Delete the newly created transaction
    await page
      .locator("[data-test-id=section-recent-transactions]")
      .locator("[data-test-id=more-Business-100]")
      .first()
      .click();
    await page.locator("[data-test-id=btn-delete]").dblclick();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await page.waitForTimeout(1000);
  });

  test("can edit recurring transaction", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForURL("**/settings/list");
    await page.getByRole("link", { name: "Manage recurring transactions" }).click();
    await page.waitForTimeout(500);

    // Click on the first recurring transaction
    await page.locator("[data-test-id=more-Business-100]").first().click();
    await page.getByText("Edit").click();

    await page.locator('input[name="amount"]').fill("150");
    await page.getByPlaceholder("Description (optional)").fill("Infrastructure cost");
    await page.locator('select[name="occurrence"]').selectOption("month(s)");
    await page.locator('input[name="interval"]').fill("2");

    const currentDate = new Date();
    await page.locator('input[type="date"]').fill(formatDate_YYYY_MM_DD(currentDate));
    await page.getByRole("button", { name: "Save" }).click();

    // Verify the updated recurring transaction details
    await expect(page.locator("[data-test-id=more-Business-150]").first()).toHaveText(
      /Infrastructure cost/
    );
    await expect(page.locator("[data-test-id=more-Business-150]").first()).toHaveText(
      /Every 2 month\(s\)/
    );
  });

  test("can skip recurring transaction", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("http://localhost:3000/dashboard");

    // Check if there are any overdue recurring transactions
    expect(page.locator("[data-test-id=section-overdue-transactions]")).toBeVisible();

    // Count existing transactions
    const initialCount = await page
      .locator("[data-test-id=section-recent-transactions]")
      .locator("[data-test-id=more-Business-150]")
      .count();

    // Skip the first transaction

    if (!(await page.locator('[data-test-id="btn-recurring-skip"]').isVisible())) {
      await page
        .locator("[data-test-id=section-overdue-transactions]")
        .locator("[data-test-id=more-Business-150]")
        .last()
        .click();
    }

    await page.locator('[data-test-id="btn-recurring-skip"]').click();
    await page.waitForTimeout(2000);

    //Verify that no transaction is created
    await expect(
      page
        .locator("[data-test-id=section-recent-transactions]")
        .locator("[data-test-id=more-Business-150]")
    ).toHaveCount(initialCount);

    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Manage recurring transactions" }).click();
    await page.waitForTimeout(500);

    const nextDate = add(new Date(), { months: 2 });
    await expect(page.locator("[data-test-id=more-Business-150]").last()).toContainText(
      formatDate_DD_MMMM_YYYY(nextDate)
    );
  });

  test("can delete recurring transaction", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Manage recurring transactions" }).click();
    await page.waitForTimeout(500);

    // Count initial recurring transactions
    const initialCount = await page.locator("[data-test-id=more-Business-150]").count();

    // Click on the first recurring transaction
    await page.locator("[data-test-id=more-Business-150]").first().click();

    // Click delete button
    await page.locator('[data-test-id="btn-recurring-delete"]').click({ clickCount: 2 });

    // Confirm deletion in the modal
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    // Wait for deletion to complete (wait for notification or retry count check)
    await page.waitForTimeout(2000);

    // Count remaining transactions
    await expect(page.locator("[data-test-id=more-Business-150]")).toHaveCount(
      initialCount - 1
    );
  });
});
