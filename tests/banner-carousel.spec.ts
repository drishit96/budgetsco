import { test, expect } from "@playwright/test";

test.describe("Banner Carousel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test.describe("Dashboard Integration", () => {
    test("displays banner carousel on dashboard", async ({ page }) => {
      // Check if carousel container is present
      const carousel = page.locator('[role="region"][aria-label*="carousel"]');
      await expect(carousel).toBeVisible();
    });

    test("shows single banner without navigation controls", async ({ page }) => {
      const navigationRow = page.locator(".carousel-navigation-row");

      // If only one banner is present, navigation should not be visible
      const bannerCount = await page.locator(".carousel-slide").count();
      if (bannerCount <= 1) {
        await expect(navigationRow).not.toBeVisible();
      }
    });

    test("displays multiple banners with navigation controls", async ({ page }) => {
      const navigationRow = page.locator(".carousel-navigation-row");
      await expect(navigationRow).toBeVisible();

      const prevButton = page.locator('button[aria-label*="Previous banner"]');
      const nextButton = page.locator('button[aria-label*="Next banner"]');

      // At least one navigation button should be visible
      const prevVisible = await prevButton.isVisible();
      const nextVisible = await nextButton.isVisible();
      expect(prevVisible || nextVisible).toBe(true);
    });
  });

  test.describe.serial("Navigation Functionality", () => {
    test("navigates to next banner using next button", async ({ page }) => {
      const carousel = page.locator('[role="group"][aria-label*="Banner"]');
      const nextButton = page.locator('button[aria-label*="Next banner"]');
      const initialLabel = await carousel.getAttribute("aria-label");

      await nextButton.click();
      await page.waitForTimeout(350); // Wait for animation

      // Check that banner index has changed
      const newLabel = await carousel.getAttribute("aria-label");
      expect(newLabel).not.toBe(initialLabel);
    });

    test("navigates to previous banner using previous button", async ({ page }) => {
      const carousel = page.locator('[role="group"][aria-label*="Banner"]');
      const nextButton = page.locator('button[aria-label*="Next banner"]');
      await nextButton.click();
      await page.waitForTimeout(350);

      const prevButton = page.locator('button[aria-label*="Previous banner"]');
      const beforeLabel = await carousel.getAttribute("aria-label");

      await prevButton.click();
      await page.waitForTimeout(350);

      const afterLabel = await carousel.getAttribute("aria-label");
      expect(afterLabel).not.toBe(beforeLabel);
    });

    test("disables navigation at boundaries", async ({ page }) => {
      const bannerCount = await page.locator(".carousel-slide").count();
      const prevButton = page.locator('button[aria-label*="Previous banner"]');
      await expect(prevButton).not.toBeVisible();

      // Navigate to last banner
      const nextButton = page.locator('button[aria-label*="Next banner"]');
      let clickCount = 0;
      while ((await nextButton.isVisible()) && clickCount < bannerCount) {
        await nextButton.click();
        await page.waitForTimeout(350);
        clickCount++;
      }

      // At last banner, next button should not be visible
      await expect(nextButton).not.toBeVisible();
    });
  });

  test.describe("Indicator Interactions", () => {
    test("displays correct number of indicators", async ({ page }) => {
      const bannerCount = await page.locator(".carousel-slide").count();
      const indicators = page.locator(".carousel-dot");
      await expect(indicators).toHaveCount(bannerCount);
    });

    test("shows active indicator for current banner", async ({ page }) => {
      const bannerCount = await page.locator(".carousel-slide").count();

      if (bannerCount > 1) {
        const activeIndicator = page.locator(".carousel-dot").first();
        await expect(activeIndicator).toHaveClass(/bg-emerald-700/);
      }
    });

    test("navigates to specific banner when indicator is clicked", async ({ page }) => {
      const thirdIndicator = page.locator(".carousel-dot").nth(2);
      await thirdIndicator.click();
      await page.waitForTimeout(350);

      // Check that third banner is now visible
      const carousel = page.locator('[role="group"][aria-label*="Banner"]');
      const label = await carousel.getAttribute("aria-label");
      expect(label).toContain("3 of");
    });

    test("updates active indicator when navigating with buttons", async ({ page }) => {
      const firstIndicator = page.locator(".carousel-dot").first();
      const secondIndicator = page.locator(".carousel-dot").nth(1);

      // Initially first indicator should be active
      await expect(firstIndicator).toHaveClass(/bg-emerald-700/);

      const nextButton = page.locator('button[aria-label*="Next banner"]');
      await nextButton.click();
      await page.waitForTimeout(350);

      // Now second indicator should be active
      await expect(secondIndicator).toHaveClass(/bg-emerald-700/);
      await expect(firstIndicator).not.toHaveClass(/bg-emerald-700/);
    });
  });

  test.describe.serial("Banner Dismissal", () => {
    test("removes banner from carousel when dismissed", async ({ page }) => {
      const initialBannerCount = await page.locator(".carousel-slide").count();
      const permanentDismissButton = page
        .locator('button:has-text("Don\'t show again")')
        .first();
      await permanentDismissButton.click();
      await page.waitForTimeout(500);

      const newBannerCount = await page.locator(".carousel-slide").count();
      expect(newBannerCount).toBe(initialBannerCount - 1);
    });

    test("navigates to next banner after dismissing current banner", async ({ page }) => {
      const carousel = page.locator('[role="group"][aria-label*="Banner"]');
      const initialLabel = await carousel.getAttribute("aria-label");

      const permanentDismissButton = page
        .locator('button:has-text("Don\'t show again")')
        .first();
      await permanentDismissButton.click();
      await page.waitForTimeout(500);

      // Should navigate to next available banner
      const newLabel = await carousel.getAttribute("aria-label");
      expect(newLabel).not.toBe(initialLabel);
    });

    test("handles permanent dismissal correctly", async ({ page }) => {
      const permanentDismissButton = page
        .locator('button:has-text("Don\'t show again")')
        .first();

      if (await permanentDismissButton.isVisible()) {
        const initialBannerCount = await page.locator(".carousel-slide").count();

        await permanentDismissButton.click();
        await page.waitForTimeout(500);

        // Refresh page to test persistence
        await page.reload();
        await page.waitForTimeout(1000);

        const newBannerCount = await page.locator(".carousel-slide").count();
        expect(newBannerCount).toBeLessThan(initialBannerCount);
      }
    });

    test("hides carousel when all banners are dismissed", async ({ page }) => {
      const bannerCount = await page.locator(".carousel-slide").count();

      // Dismiss all banners if possible
      for (let i = 0; i < bannerCount; i++) {
        const permanentDismissButton = page
          .locator('button:has-text("Don\'t show again")')
          .first();

        if (await permanentDismissButton.isVisible()) {
          await permanentDismissButton.click();
          await page.waitForTimeout(500);
        } else {
          break; // No more dismissible banners
        }
      }

      // Check if carousel is hidden when no banners remain
      const remainingBanners = await page.locator(".carousel-slide").count();
      if (remainingBanners === 0) {
        const carousel = page.locator('[role="region"][aria-label*="carousel"]');
        await expect(carousel).not.toBeVisible();
      }
    });
  });
});
