import { test, expect } from "@playwright/test";
import { mockGenerateError } from "./helpers/mockApi";

test.describe("Обработка ошибок", () => {
  test("при ошибке API — показывает сообщение об ошибке", async ({ page }) => {
    await mockGenerateError(page, "Ошибка DeepSeek API");
    await page.goto("/");

    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill("Тест");
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill("Клиент");
    await page.getByPlaceholder(/разработка сайта/i).fill("Услуга");
    await page.getByPlaceholder(/50 000/i).fill("1000");
    await page.getByPlaceholder(/14 дней/i).fill("1 день");
    await page.getByPlaceholder(/опыт 5 лет/i).fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();

    // Остаёмся на главной, показывается ошибка
    await expect(page).toHaveURL("/");
    await expect(page.locator(".bg-red-50")).toBeVisible();
  });

  test("после ошибки форма остаётся заполненной", async ({ page }) => {
    await mockGenerateError(page);
    await page.goto("/");

    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill("Моя компания");
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill("Клиент");
    await page.getByPlaceholder(/разработка сайта/i).fill("Услуга");
    await page.getByPlaceholder(/50 000/i).fill("1000");
    await page.getByPlaceholder(/14 дней/i).fill("1 день");
    await page.getByPlaceholder(/опыт 5 лет/i).fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();

    // Данные в форме сохраняются
    await expect(
      page.getByPlaceholder(/ООО «Ромашка» или Иван/i)
    ).toHaveValue("Моя компания");
  });

  test("HTML5-валидация — пустые поля блокируют отправку", async ({ page }) => {
    await page.goto("/");

    // Кликаем без заполнения формы
    await page.getByRole("button", { name: /создать кп/i }).click();

    // Остаёмся на главной (browser validation)
    await expect(page).toHaveURL("/");
  });

  test("кнопка отправки заблокирована во время загрузки", async ({ page }) => {
    await page.route("**/api/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/");
    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill("Тест");
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill("Клиент");
    await page.getByPlaceholder(/разработка сайта/i).fill("Услуга");
    await page.getByPlaceholder(/50 000/i).fill("1000");
    await page.getByPlaceholder(/14 дней/i).fill("1 день");
    await page.getByPlaceholder(/опыт 5 лет/i).fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();

    // Кнопка становится disabled
    await expect(
      page.getByRole("button", { name: /генерирую кп/i })
    ).toBeDisabled();
  });

  test("логотип больше 2МБ — показывает ошибку", async ({ page }) => {
    await page.goto("/");

    // Создаём файл больше 2МБ
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
