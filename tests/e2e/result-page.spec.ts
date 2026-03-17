import { test, expect } from "@playwright/test";
import { seedResultPage } from "./helpers/mockApi";

test.describe("Страница результата /result", () => {
  test("без данных — редирект на главную", async ({ page }) => {
    await page.goto("/result");
    // Без sessionStorage должен вернуть на /
    await page.waitForURL("**/", { timeout: 5000 });
    await expect(page).toHaveURL("/");
  });

  test("с данными — показывает КП", async ({ page }) => {
    await seedResultPage(page);
    // Заголовок встречается в h1 и h2 шаблона — берём первый
    await expect(page.getByText(/IT-аутсорсинг для ООО/i).first()).toBeVisible();
    await expect(page.getByText("25 000 ₽/мес").first()).toBeVisible();
  });

  test("4 шаблона в селекторе", async ({ page }) => {
    await seedResultPage(page);
    await expect(page.getByText("Классика")).toBeVisible();
    await expect(page.getByText("Современный")).toBeVisible();
    await expect(page.getByText("Минимализм")).toBeVisible();
    await expect(page.getByText("ВИП")).toBeVisible();
  });

  test("переключение шаблонов — ВИП активен", async ({ page }) => {
    await seedResultPage(page);

    await page.getByText("ВИП").click();

    // После клика кнопка должна стать активной (border изменится)
    const vipBtn = page.locator("button", { hasText: "ВИП" });
    await expect(vipBtn).toHaveClass(/border-\[#1e3a5f\]/);
  });

  test("кнопка «Скачать PDF» видна", async ({ page }) => {
    await seedResultPage(page);
    await expect(page.getByRole("button", { name: /скачать pdf/i })).toBeVisible();
  });

  test("кнопка «Скопировать текст» видна", async ({ page }) => {
    await seedResultPage(page);
    await expect(page.getByRole("button", { name: /скопировать текст/i })).toBeVisible();
  });

  test("клик «Скопировать» меняет текст кнопки", async ({ page }) => {
    await seedResultPage(page);

    // Разрешаем доступ к буферу обмена
    await page.context().grantPermissions(["clipboard-write", "clipboard-read"]);

    await page.getByRole("button", { name: /скопировать текст/i }).click();
    await expect(page.getByText("✓ Скопировано!")).toBeVisible();
  });

  test("режим редактирования — кнопка «Редактировать»", async ({ page }) => {
    await seedResultPage(page);
    await expect(page.getByRole("button", { name: /редактировать/i })).toBeVisible();
  });

  test("входим в режим редактирования — появляются inputs", async ({ page }) => {
    await seedResultPage(page);

    await page.getByRole("button", { name: /редактировать/i }).click();

    // Должна появиться подсказка о режиме редактирования
    await expect(page.getByText(/режим редактирования/i)).toBeVisible();
    // Кнопка Сохранить
    await expect(page.getByRole("button", { name: /сохранить/i })).toBeVisible();
  });

  test("редактируем заголовок и сохраняем", async ({ page }) => {
    await seedResultPage(page);

    await page.getByRole("button", { name: /редактировать/i }).click();

    // Ждём появления режима редактирования
    await expect(page.getByText(/режим редактирования/i)).toBeVisible();

    // Первый input в kp-preview — это поле заголовка
    // CSS [value*=...] не работает с React controlled inputs, ищем по позиции
    const titleInput = page.locator("#kp-preview input").first();
    await titleInput.waitFor({ state: "visible" });
    await titleInput.clear();
    await titleInput.fill("Новый заголовок КП");

    await page.getByRole("button", { name: /сохранить/i }).click();

    // После сохранения новый заголовок виден (в h1 или h2)
    await expect(page.getByText("Новый заголовок КП").first()).toBeVisible();
  });

  test("кнопка «Создать новое КП» ведёт на главную", async ({ page }) => {
    await seedResultPage(page);

    await page.getByRole("button", { name: /создать новое кп/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("шаблон ВИП показывает карточки преимуществ", async ({ page }) => {
    await seedResultPage(page);

    await page.getByText("ВИП").click();

    await expect(page.getByText("Быстрый выезд")).toBeVisible();
    await expect(page.getByText("Экономия бюджета")).toBeVisible();
  });

  test("шаблон ВИП показывает таблицу цен", async ({ page }) => {
    await seedResultPage(page);

    await page.getByText("ВИП").click();

    await expect(page.getByText("Базовое обслуживание")).toBeVisible();
    await expect(page.getByText("Итого по проекту")).toBeVisible();
  });
});
