import { Page } from "@playwright/test";
import { MOCK_API_RESPONSE, MOCK_PARSED_KP } from "./mockKpData";

/** Мокаем /api/generate — возвращаем успешный КП */
export async function mockGenerateSuccess(page: Page) {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_API_RESPONSE),
    });
  });
}

/** Мокаем /api/generate — возвращаем 500 ошибку */
export async function mockGenerateError(page: Page, message = "Ошибка DeepSeek API") {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: message }),
    });
  });
}

/** Кладём готовый КП в sessionStorage — симулируем уже сгенерированный результат */
export async function seedResultPage(page: Page, withLogo = false) {
  await page.goto("/");
  await page.evaluate(
    ({ kp, logo }) => {
      sessionStorage.setItem("kp_result", JSON.stringify(kp));
      if (logo) sessionStorage.setItem("kp_logo", logo);
      else sessionStorage.removeItem("kp_logo");
    },
    {
      kp: MOCK_PARSED_KP,
      logo: withLogo
        ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        : null,
    }
  );
  await page.goto("/result");
}
