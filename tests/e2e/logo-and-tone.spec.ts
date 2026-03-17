import { test, expect } from "@playwright/test";
import { mockGenerateSuccess, seedResultPage } from "./helpers/mockApi";
import * as path from "path";
import * as fs from "fs";

test.describe("Логотип и тон КП", () => {
  test("выбор тона — Дружелюбный становится активным", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Дружелюбный").click();

    const friendlyLabel = page.locator("label", { hasText: "Дружелюбный" });
    await expect(friendlyLabel).toHaveClass(/border-\[#1e3a5f\]/);
  });

  test("выбор тона — Агрессивный становится активным", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Агрессивный").click();

    const aggressiveLabel = page.locator("label", { hasText: "Агрессивный" });
    await expect(aggressiveLabel).toHaveClass(/border-\[#1e3a5f\]/);
  });

  test("по умолчанию выбран Официальный", async ({ page }) => {
    await page.goto("/");

    const officialLabel = page.locator("label", { hasText: "Официальный" });
    await expect(officialLabel).toHaveClass(/border-\[#1e3a5f\]/);
  });

  test("загрузка логотипа — показывает превью", async ({ page }) => {
    await page.goto("/");

    // Создаём минимальный PNG (1x1 пиксель)
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: minimalPng,
    });

    await expect(page.getByText("Логотип загружен")).toBeVisible();
    await expect(page.getByAltText("Логотип")).toBeVisible();
  });

  test("удаление логотипа — кнопка ✕", async ({ page }) => {
    await page.goto("/");

    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: minimalPng,
    });

    await expect(page.getByText("Логотип загружен")).toBeVisible();

    // Нажимаем ✕
    await page.getByRole("button", { name: "✕" }).click();

    await expect(page.getByText("Загрузить логотип")).toBeVisible();
  });

  test("логотип отображается в шаблоне КП", async ({ page }) => {
    await seedResultPage(page, true); // withLogo = true

    // Все шаблоны должны показывать логотип
    const logos = page.getByAltText("Логотип");
    await expect(logos.first()).toBeVisible();
  });

  test("тон передаётся в запрос API", async ({ page }) => {
    let capturedBody: Record<string, unknown> = {};

    await page.route("**/api/generate", async (route) => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ kp: { title: "Тест", greeting: "", about: "", offer: "", benefits: [], price: "", deadline: "", cta: "", signature: "" } }),
      });
    });

    await page.goto("/");
    await page.getByText("Агрессивный").click();

    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill("Тест");
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill("Клиент");
    await page.getByPlaceholder(/разработка сайта/i).fill("Услуга");
    await page.getByPlaceholder(/50 000/i).fill("1000");
    await page.getByPlaceholder(/14 дней/i).fill("1 день");
    await page.getByPlaceholder(/опыт 5 лет/i).fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();
    await page.waitForURL("**/result**", { timeout: 10000 });

    expect(capturedBody.tone).toBe("aggressive");
  });
});
