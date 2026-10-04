import "dotenv/config";
import { test, expect } from "@playwright/test";
import pg from "pg";
import { getFirstDateOfThisMonth } from "../app/utils/date.utils";

test.use({ storageState: "storageState.json" });

test("create budget setup", async ({ page }) => {
  // Clear any existing budget for this month to make the test repeatable locally
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const userId = "1FgeDbZjUlTUveythpmCyd9q3Zn1";
    const timezone = "Asia/Calcutta";
    const startOfMonth = getFirstDateOfThisMonth(timezone);
    const startOfMonthStr = `${startOfMonth.getUTCFullYear()}-${String(
      startOfMonth.getUTCMonth() + 1
    ).padStart(2, "0")}-01 00:00:00`;

    await client.query(
      `DELETE FROM "CategoryAmount" WHERE "userId" = $1 AND "date" = $2`,
      [userId, startOfMonthStr]
    );
    await client.query(
      `DELETE FROM "MonthlyTarget" WHERE "userId" = $1 AND "date" = $2`,
      [userId, startOfMonthStr]
    );
  } finally {
    await client.end();
  }

  // Go to Dashboard
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForTimeout(500);

  // Navigate to Settings
  await page.getByRole("link", { name: "Settings" }).click();
  await page.waitForTimeout(500);

  // Click on "Edit Budget" (this will redirect to createBudget since no budget exists)
  await page.getByRole("link", { name: "Edit Budget" }).click();
  await page.waitForURL("**/settings/createBudget");

  // Click on "Start from scratch"
  await page.getByRole("button", { name: "Start from scratch" }).click();

  // Fill category 1
  await page.locator('input[name="category1"]').fill("Bills & Subscriptions");
  await page.getByRole("option", { name: "Bills & Subscriptions", exact: true }).first().click();
  await page.locator('input[name="budget1"]').fill("3000");

  // Add category 2
  await page.getByRole("button", { name: "Add new" }).click();
  await page.locator('input[name="category2"]').fill("EMI");
  await page.getByRole("option", { name: "EMI", exact: true }).first().click();
  await page.locator('input[name="budget2"]').fill("3000");

  // Add category 3
  await page.getByRole("button", { name: "Add new" }).click();
  await page.locator('input[name="category3"]').fill("Grocery");
  await page.getByRole("option", { name: "Grocery", exact: true }).first().click();
  await page.locator('input[name="budget3"]').fill("3000");

  // Add category 4
  await page.getByRole("button", { name: "Add new" }).click();
  await page.locator('input[name="category4"]').fill("Others");
  await page.getByRole("option", { name: "Others", exact: true }).first().click();
  await page.locator('input[name="budget4"]').fill("0");

  // Save the budget
  await page.getByRole("button", { name: "Save" }).click();

  // Wait for it to be saved and redirect back to Settings List
  await expect(page.getByText("Budget saved")).toBeVisible();
  await page.waitForURL("**/settings/list");

  // Click Dashboard to return to the dashboard
  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL("**/dashboard");

  // Expect dashboard to show "9K" total budget
  await expect(page.getByText("9K").first()).toBeVisible();
});
