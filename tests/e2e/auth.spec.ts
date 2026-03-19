import { test, expect } from "@playwright/test";

test.describe("Авторизация (magic link)", () => {
  test("форма логина — отображается на /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByText("Без пароля")).toBeVisible();
  });

  test("форма логина — отправка email показывает 'Проверь почту'", async ({ page }) => {
    // Мокаем POST /api/auth/login — успех
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/login");
    await page.getByTestId("login-email").fill("test@example.com");
    await page.getByTestId("login-submit").click();

    await expect(page.getByText("Проверь почту")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
  });

  test("форма логина — невалидный email не проходит", async ({ page }) => {
    await page.goto("/login");
    // Пробуем отправить пустую форму
    await page.getByTestId("login-submit").click();
    // HTML5 validation не пустит — кнопка type=submit с required email
    // email input должен быть в фокусе (браузер заблокировал)
    const emailInput = page.getByTestId("login-email");
    await expect(emailInput).toBeVisible();
    // Страница не переключилась на "Проверь почту"
    await expect(page.getByText("Проверь почту")).not.toBeVisible();
  });

  test("залогиненный пользователь — кнопка 'Войти' не видна на главной", async ({ page }) => {
    // Мокаем /api/auth/me — возвращаем пользователя
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            email: "test@example.com",
            userId: "user:test@example.com",
            credits: null,
          },
        }),
      });
    });

    await page.goto("/");
    // Кнопка "Войти" не должна быть видна — пользователь уже залогинен
    await expect(page.getByRole("link", { name: "Войти" })).not.toBeVisible();
  });

  test("залогиненный пользователь — видит историю в dashboard", async ({ page }) => {
    // Мокаем /api/auth/me
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            email: "test@example.com",
            userId: "user:test@example.com",
            credits: { plan: "active", totalLeft: 28, vipLeft: -1, modernLeft: -1, expiresAt: Date.now() + 86400000 },
          },
        }),
      });
    });

    // Мокаем /api/user/history
    await page.route("**/api/user/history", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "kp-test-1",
              title: "КП для ООО Рога и Копыта",
              createdAt: "2026-03-20T08:00:00.000Z",
              status: "draft",
              kp: { title: "КП для ООО Рога и Копыта", greeting: "", about: "", offer: "", benefits: [], price: "50 000 ₽", deadline: "14 дней", cta: "", signature: "" },
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByText("КП для ООО Рога и Копыта")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
  });
});
