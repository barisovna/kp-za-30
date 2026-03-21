import { test, expect } from "@playwright/test";

test.describe("Истечение плана", () => {
  test("истёкший план active → показывает free-состояние", async ({ page }) => {
    await page.addInitScript(() => {
      const expired = Date.now() - 1000; // 1 секунду назад
      localStorage.setItem("kp_plan", "active");
      localStorage.setItem("kp_paid_credits", "5");
      localStorage.setItem("kp_plan_expires", String(expired));
      // Бесплатные КП уже потрачены
      localStorage.setItem("kp_free_count", "0");
    });

    await page.goto("/");

    // После истечения плана: totalLeft === 0 → показывает кнопку "Купить КП →"
    await expect(page.getByTestId("header-buy-btn")).toBeVisible({ timeout: 3000 });
  });

  test("действующий план — счётчик кредитов виден", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000; // +30 дней
      localStorage.setItem("kp_plan", "active");
      localStorage.setItem("kp_paid_credits", "25");
      localStorage.setItem("kp_vip_credits", "-1");
      localStorage.setItem("kp_modern_credits", "-1");
      localStorage.setItem("kp_plan_expires", String(future));
    });

    await page.goto("/");
    // Счётчик должен показывать оставшиеся КП
    await expect(page.getByTestId("header-credits")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("header-credits")).toContainText("25 КП");
  });

  test("истёкший план monthly → сбрасывается в free", async ({ page }) => {
    await page.addInitScript(() => {
      const expired = Date.now() - 60_000; // 1 минута назад
      // applyPayment("monthly") сохраняет "unlimited", а не "monthly"
      localStorage.setItem("kp_plan", "unlimited");
      localStorage.setItem("kp_paid_credits", "99999");
      localStorage.setItem("kp_plan_expires", String(expired));
      localStorage.setItem("kp_free_count", "0");
    });

    await page.goto("/");
    // Безлимит закончился → кнопка купить
    await expect(page.getByTestId("header-buy-btn")).toBeVisible({ timeout: 3000 });
  });

  test("активный unlimited план показывает ∞ в счётчике", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000; // +30 дней
      localStorage.setItem("kp_plan", "unlimited");
      localStorage.setItem("kp_paid_credits", "99999");
      localStorage.setItem("kp_vip_credits", "-1");
      localStorage.setItem("kp_modern_credits", "-1");
      localStorage.setItem("kp_plan_expires", String(future));
    });

    await page.goto("/");
    await expect(page.getByTestId("header-credits")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("header-credits")).toContainText("∞ КП");
  });

  test("страница /payment/success активирует план в localStorage", async ({ page }) => {
    await page.goto("/payment/success?plan=start");
    await expect(page.getByText("Оплата прошла")).toBeVisible();

    // localStorage должен обновиться после applyPayment
    const plan = await page.evaluate(() => localStorage.getItem("kp_plan"));
    expect(plan).toBe("start");
  });
});
