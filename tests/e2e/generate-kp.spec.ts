import { test, expect } from "@playwright/test";
import { mockGenerateSuccess } from "./helpers/mockApi";

const VALID_FORM = {
  companyName: 'ООО "ТехСервис"',
  clientName: 'ООО "Ромашка"',
  service: "IT-аутсорсинг",
  price: "25 000 ₽/мес",
  deadline: "С первого дня",
  advantages: "Выезд за 2 часа, опыт 6 лет, экономия 50%",
};

/** Заполняет основную форму через data-testid */
async function fillForm(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never, data: typeof VALID_FORM) {
  await page.getByTestId("form-companyName").fill(data.companyName);
  await page.getByTestId("form-clientName").fill(data.clientName);
  await page.getByTestId("form-service").fill(data.service);
  await page.getByTestId("form-price").fill(data.price);
  await page.getByTestId("form-deadline").fill(data.deadline);
  await page.getByTestId("form-advantages").fill(data.advantages);
}

test.describe("Генерация КП", () => {
  test("главная страница загружается", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /создать кп/i })).toBeVisible();
  });

  test("форма имеет все 6 обязательных полей", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("form-companyName")).toBeVisible();
    await expect(page.getByTestId("form-clientName")).toBeVisible();
    await expect(page.getByTestId("form-service")).toBeVisible();
    await expect(page.getByTestId("form-price")).toBeVisible();
    await expect(page.getByTestId("form-deadline")).toBeVisible();
    await expect(page.getByTestId("form-advantages")).toBeVisible();
  });

  test("тон КП — 3 радиокнопки видны", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Официальный")).toBeVisible();
    await expect(page.getByText("Дружелюбный")).toBeVisible();
    await expect(page.getByText("Агрессивный")).toBeVisible();
  });

  test("успешная генерация → переход на /result", async ({ page }) => {
    await mockGenerateSuccess(page);
    await page.goto("/");
    await fillForm(page, VALID_FORM);
    await page.getByRole("button", { name: /создать кп/i }).click();
    await page.waitForURL("**/result**", { timeout: 10000 });
    await expect(page).toHaveURL(/\/result/);
  });

  test("на /result отображается заголовок КП", async ({ page }) => {
    await mockGenerateSuccess(page);
    await page.goto("/");
    await fillForm(page, VALID_FORM);
    await page.getByRole("button", { name: /создать кп/i }).click();
    await page.waitForURL("**/result**", { timeout: 10000 });
    await expect(
      page.getByText(/IT-аутсорсинг для ООО/i).first()
    ).toBeVisible();
  });

  test("показывает loading state во время генерации", async ({ page }) => {
    await page.route("**/api/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ kp: { title: "Тест", greeting: "", about: "", offer: "", benefits: [], price: "", deadline: "", cta: "", signature: "" } }),
      });
    });

    await page.goto("/");
    await page.getByTestId("form-companyName").fill("Тест");
    await page.getByTestId("form-clientName").fill("Клиент");
    await page.getByTestId("form-service").fill("Услуга");
    await page.getByTestId("form-price").fill("1000");
    await page.getByTestId("form-deadline").fill("1 день");
    await page.getByTestId("form-advantages").fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();
    await expect(page.getByText(/генерирую кп/i)).toBeVisible();
  });

  test("КП добавляется в историю после генерации", async ({ page }) => {
    await mockGenerateSuccess(page);
    await page.goto("/");
    await fillForm(page, VALID_FORM);
    await page.getByRole("button", { name: /создать кп/i }).click();
    await page.waitForURL("**/result**", { timeout: 10000 });

    await page.goto("/");
    await expect(page.getByText("📂 Ваши последние КП")).toBeVisible();
    await expect(page.getByText(/IT-аутсорсинг для ООО/i)).toBeVisible();
  });
});
