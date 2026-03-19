import { test, expect } from "@playwright/test";

test.describe("Оплата и активация плана", () => {
  // Хелпер: переводим mock-payment в успешное состояние
  async function mockPaymentSuccess(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
    // YooKassa не настроена → fallback на mock
    await page.route("**/api/payment/yookassa", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mock: true }),
      });
    });

    // Mock payment возвращает успех
    await page.route("**/api/payment/mock", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, plan: "start", message: "Активирован" }),
      });
    });
  }

  test("paywall показывается когда кредиты 0", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kp_free_count", "0");
      localStorage.setItem("kp_plan", "free");
    });

    await page.goto("/");
    // Должна быть кнопка "Купить КП →"
    await expect(page.getByTestId("header-buy-btn")).toBeVisible();
  });

  test("клик 'Купить КП →' открывает PaywallModal", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kp_free_count", "0");
      localStorage.setItem("kp_plan", "free");
    });

    await page.goto("/");
    await page.getByTestId("header-buy-btn").click();

    // PaywallModal содержит кнопку покупки "Пакет Старт"
    await expect(page.getByTestId("pay-start")).toBeVisible();
  });

  test("mock оплата пакета 'Старт' активирует план", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kp_free_count", "0");
      localStorage.setItem("kp_plan", "free");
    });

    await mockPaymentSuccess(page);

    await page.goto("/");
    await page.getByTestId("header-buy-btn").click();

    // Нажимаем "Купить за 199 ₽"
    await page.getByTestId("pay-start").click();

    // После успешной оплаты PaywallModal должен закрыться
    // и счётчик кредитов должен обновиться
    await expect(page.getByTestId("pay-start")).not.toBeVisible({ timeout: 5000 });
  });

  test("страница /payment/success показывает успех при валидном плане", async ({ page }) => {
    await page.goto("/payment/success?plan=active");
    await expect(page.getByText("Оплата прошла")).toBeVisible();
    await expect(page.getByText("Пакет «Активный»")).toBeVisible();
    await expect(page.getByText("Создать КП →")).toBeVisible();
  });

  test("страница /payment/success показывает ошибку при неверном плане", async ({ page }) => {
    await page.goto("/payment/success?plan=unknown");
    await expect(page.getByText("Что-то пошло не так")).toBeVisible();
  });
});
