import { test, expect } from "@playwright/test";
import { add } from "date-fns/add";
import { formatDate_DD_MMMM_YYYY } from "~/utils/date.utils";

test("can edit budget", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForTimeout(500);
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
  await page.goto("http://localhost:3000/settings/list");
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
  await page.goto("http://localhost:3000/settings/list");

  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("9K").first()).toBeVisible();
});

test("can change currency", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("link", { name: "Change currency" }).click();
  await page.locator('input[name="currencyToShow"]').fill("USD");
  await page
    .getByRole("option", { name: "US Dollar (USD)", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Currency updated")).toBeVisible();

  await page.goto("http://localhost:3000/dashboard");
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

  await page.goto("http://localhost:3000/dashboard");
  await expect(page.getByText("$").first()).not.toBeVisible();
  await expect(page.getByText("₹").first()).toBeVisible();
});

test.describe.serial("Personal Access Tokens", () => {
  test("can create personal access token", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Personal Access Tokens" }).click();
    await expect(
      page.getByRole("heading", { name: "Personal Access Tokens" })
    ).toBeVisible();
    await page.getByRole("link", { name: "Create Token" }).click();
    await expect(page.getByRole("heading", { name: "New Access Token" })).toBeVisible();
    await page.getByRole("textbox", { name: "Token Name*" }).fill("Test Token");

    await page
      .getByRole("group", { name: "Transactions", exact: true })
      .getByLabel("Write")
      .check();
    await page
      .getByRole("group", { name: "Recurring Transactions" })
      .getByLabel("Delete")
      .check();
    await page.getByRole("group", { name: "Budget" }).getByLabel("Write").check();
    await page
      .getByRole("group", { name: "Custom Categories" })
      .getByLabel("Delete")
      .check();

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: "Token Created" })).toBeVisible();
    await expect(
      page.getByText(
        "Your new access token has been created successfully. Please make sure to copy it now, as you won't be able to see it again."
      )
    ).toBeVisible();

    const tokenCode = await page.locator("code").first().textContent();
    expect(tokenCode).toContain("budgetsco_pat_");
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page.getByText("Test Token")).toBeVisible();
    const dateToVerify = formatDate_DD_MMMM_YYYY(add(new Date(), { months: 1 }));
    await expect(page.getByText(`Expires on: ${dateToVerify}`)).toBeVisible();

    // Open the edit page for the created token
    await page.getByRole("button", { name: /Test Token/ }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Token" })).toBeVisible();

    await expect(
      page.getByRole("group", { name: "Transactions", exact: true }).getByLabel("Write")
    ).toBeChecked();
    await expect(
      page.getByRole("group", { name: "Recurring Transactions" }).getByLabel("Delete")
    ).toBeChecked();
    await expect(
      page.getByRole("group", { name: "Budget" }).getByLabel("Write")
    ).toBeChecked();
    await expect(
      page.getByRole("group", { name: "Custom Categories" }).getByLabel("Delete")
    ).toBeChecked();
  });

  test("can update personal access token", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Personal Access Tokens" }).click();
    await expect(
      page.getByRole("heading", { name: "Personal Access Tokens" })
    ).toBeVisible();

    await page.getByRole("button", { name: /Test Token/ }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Token" })).toBeVisible();

    await page.getByRole("textbox", { name: "Token Name*" }).fill("Test Token Updated");

    const transactionsGroup = page.getByRole("group", {
      name: "Transactions",
      exact: true,
    });
    const budgetGroup = page.getByRole("group", { name: "Budget" });
    const recurringGroup = page.getByRole("group", { name: "Recurring Transactions" });
    const customCategoriesGroup = page.getByRole("group", { name: "Custom Categories" });

    await transactionsGroup.getByLabel("Delete").check();
    await budgetGroup.getByLabel("Write").uncheck();
    await recurringGroup.getByLabel("Write").check();
    await customCategoriesGroup.getByLabel("Delete").uncheck();

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Test Token Updated")).toBeVisible();
    const dateToVerify = formatDate_DD_MMMM_YYYY(add(new Date(), { months: 1 }));
    await expect(page.getByText(`Expires on: ${dateToVerify}`)).toBeVisible();

    await page.getByRole("button", { name: /Test Token Updated/ }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Token" })).toBeVisible();

    await expect(transactionsGroup.getByLabel("Delete")).toBeChecked();
    await expect(budgetGroup.getByLabel("Write")).not.toBeChecked();
    await expect(recurringGroup.getByLabel("Write")).toBeChecked();
    await expect(customCategoriesGroup.getByLabel("Delete")).not.toBeChecked();
  });

  test("can delete personal access token", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("link", { name: "Personal Access Tokens" }).click();
    await expect(
      page.getByRole("heading", { name: "Personal Access Tokens" })
    ).toBeVisible();

    await page.getByRole("button", { name: /Test Token Updated/ }).click();
    await page.getByRole("button", { name: "Delete" }).click({ clickCount: 2 });

    await expect(page.getByRole("heading", { name: "Delete token?" })).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Token deleted successfully")).toBeVisible();
    await expect(page.getByText("Test Token Updated")).not.toBeVisible();
  });
});
