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

test.describe("Генерация КП", () => {
  test("главная страница загружается", async ({ page }) => {
    await page.goto("/");
    // Ищем h1 с заголовком (strict: false — не требуем единственного совпадения)
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /создать кп/i })).toBeVisible();
  });

  test("форма имеет все 6 обязательных полей", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder(/ООО «Ромашка» или Иван/i)).toBeVisible();
    await expect(page.getByPlaceholder(/ООО «Лидер» или Алексей/i)).toBeVisible();
    await expect(page.getByPlaceholder(/разработка сайта/i)).toBeVisible();
    await expect(page.getByPlaceholder(/50 000/i)).toBeVisible();
    await expect(page.getByPlaceholder(/14 дней/i)).toBeVisible();
    await expect(page.getByPlaceholder(/опыт 5 лет/i)).toBeVisible();
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

    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill(VALID_FORM.companyName);
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill(VALID_FORM.clientName);
    await page.getByPlaceholder(/разработка сайта/i).fill(VALID_FORM.service);
    await page.getByPlaceholder(/50 000/i).fill(VALID_FORM.price);
    await page.getByPlaceholder(/14 дней/i).fill(VALID_FORM.deadline);
    await page.getByPlaceholder(/опыт 5 лет/i).fill(VALID_FORM.advantages);

    await page.getByRole("button", { name: /создать кп/i }).click();

    await page.waitForURL("**/result**", { timeout: 10000 });
    await expect(page).toHaveURL(/\/result/);
  });

  test("на /result отображается заголовок КП", async ({ page }) => {
    await mockGenerateSuccess(page);
    await page.goto("/");

    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill(VALID_FORM.companyName);
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill(VALID_FORM.clientName);
    await page.getByPlaceholder(/разработка сайта/i).fill(VALID_FORM.service);
    await page.getByPlaceholder(/50 000/i).fill(VALID_FORM.price);
    await page.getByPlaceholder(/14 дней/i).fill(VALID_FORM.deadline);
    await page.getByPlaceholder(/опыт 5 лет/i).fill(VALID_FORM.advantages);

    await page.getByRole("button", { name: /создать кп/i }).click();
    await page.waitForURL("**/result**", { timeout: 10000 });

    // Заголовок появляется и в h1 и в h2 шаблона — берём первый
    await expect(
      page.getByText(/IT-аутсорсинг для ООО/i).first()
    ).toBeVisible();
  });

  test("показывает loading state во время генерации", async ({ page }) => {
    // Замедляем ответ API чтобы увидеть загрузку
    await page.route("**/api/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ kp: { title: "Тест", greeting: "", about: "", offer: "", benefits: [], price: "", deadline: "", cta: "", signature: "" } }),
      });
    });

    await page.goto("/");
    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill("Тест");
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill("Клиент");
    await page.getByPlaceholder(/разработка сайта/i).fill("Услуга");
    await page.getByPlaceholder(/50 000/i).fill("1000");
    await page.getByPlaceholder(/14 дней/i).fill("1 день");
    await page.getByPlaceholder(/опыт 5 лет/i).fill("Преимущества");

    await page.getByRole("button", { name: /создать кп/i }).click();
    await expect(page.getByText(/генерирую кп/i)).toBeVisible();
  });

  test("КП добавляется в историю после генерации", async ({ page }) => {
    await mockGenerateSuccess(page);
    await page.goto("/");

    await page.getByPlaceholder(/ООО «Ромашка» или Иван/i).fill(VALID_FORM.companyName);
    await page.getByPlaceholder(/ООО «Лидер» или Алексей/i).fill(VALID_FORM.clientName);
    await page.getByPlaceholder(/разработка сайта/i).fill(VALID_FORM.service);
    await page.getByPlaceholder(/50 000/i).fill(VALID_FORM.price);
    await page.getByPlaceholder(/14 дней/i).fill(VALID_FORM.deadline);
    await page.getByPlaceholder(/опыт 5 лет/i).fill(VALID_FORM.advantages);

    await page.getByRole("button", { name: /создать кп/i }).click();
    await page.waitForURL("**/result**", { timeout: 10000 });

    // Возвращаемся на главную
    await page.goto("/");

    // История должна показать сохранённый КП
    await expect(page.getByText("📂 Ваши последние КП")).toBeVisible();
    await expect(page.getByText(/IT-аутсорсинг для ООО/i)).toBeVisible();
  });
});
