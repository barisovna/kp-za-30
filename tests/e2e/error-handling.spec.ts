import { test, expect } from "@playwright/test";
import { mockGenerateError } from "./helpers/mockApi";

test.describe("Обработка ошибок", () => {
  test("при ошибке API — показывает сообщение об ошибке", async ({ page }) => {
    await mockGenerateError(page, "Ошибка DeepSeek API");
    await page.goto("/");

    await page.getByTestId("form-companyName").fill("Тест");
    await page.getByTestId("form-clientName").fill("Клиент");
    await page.getByTestId("form-service").fill("Услуга");
    await page.getByTestId("form-price").fill("1000");
    await page.getByTestId("form-deadline").fill("1 день");
    await page.getByTestId("form-advantages").fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.locator(".bg-red-50")).toBeVisible();
  });

  test("после ошибки форма остаётся заполненной", async ({ page }) => {
    await mockGenerateError(page);
    await page.goto("/");

    await page.getByTestId("form-companyName").fill("Моя компания");
    await page.getByTestId("form-clientName").fill("Клиент");
    await page.getByTestId("form-service").fill("Услуга");
    await page.getByTestId("form-price").fill("1000");
    await page.getByTestId("form-deadline").fill("1 день");
    await page.getByTestId("form-advantages").fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();

    await expect(
      page.getByTestId("form-companyName")
    ).toHaveValue("Моя компания");
  });

  test("HTML5-валидация — пустые поля блокируют отправку", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /создать кп/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("кнопка отправки заблокирована во время загрузки", async ({ page }) => {
    await page.route("**/api/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/");
    await page.getByTestId("form-companyName").fill("Тест");
    await page.getByTestId("form-clientName").fill("Клиент");
    await page.getByTestId("form-service").fill("Услуга");
    await page.getByTestId("form-price").fill("1000");
    await page.getByTestId("form-deadline").fill("1 день");
    await page.getByTestId("form-advantages").fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();

    await expect(
      page.getByRole("button", { name: /генерирую кп/i })
    ).toBeDisabled();
  });

  test("логотип больше 2МБ — показывает ошибку", async ({ page }) => {
    await page.goto("/");

    const bigFile = Buffer.alloc(3 * 1024 * 1024, 0);
    await page.locator('input[type="file"]').setInputFiles({
      name: "big-logo.png",
      mimeType: "image/png",
      buffer: bigFile,
    });

    await expect(
      page.getByText(/не должен превышать 2 МБ/i)
    ).toBeVisible();
  });
});
