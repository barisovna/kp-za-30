import { Page } from "@playwright/test";
import { MOCK_API_RESPONSE, MOCK_PARSED_KP } from "./mockKpData";

/** Мокаем /api/generate — возвращаем успешный КП */
export async function mockGenerateSuccess(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("kp_email_capture_skip", "1");
    localStorage.setItem("kp_onboarded", "1");
    // подавляем DailyTip — ставим сегодняшнюю дату как уже показанную
    localStorage.setItem("kp_daily_tip_shown", new Date().toISOString().slice(0, 10));
  });
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

/** Кладём готовый КП в sessionStorage + paid план в localStorage
 *  чтобы VIP/Современный шаблоны были доступны без paywall */
export async function seedResultPage(page: Page, withLogo = false) {
  await page.goto("/");
  await page.evaluate(
    ({ kp, logo }) => {
      // sessionStorage — данные КП
      sessionStorage.setItem("kp_result", JSON.stringify(kp));
      if (logo) sessionStorage.setItem("kp_logo", logo);
      else sessionStorage.removeItem("kp_logo");

      // localStorage — paid план "active" (все шаблоны доступны)
      localStorage.setItem("kp_plan", "active");
      localStorage.setItem("kp_paid_credits", "30");
      localStorage.setItem("kp_vip_credits", "-1");
      localStorage.setItem("kp_modern_credits", "-1");
      // срок действия — 90 дней от сейчас
      localStorage.setItem("kp_plan_expires", String(Date.now() + 90 * 24 * 60 * 60 * 1000));
      localStorage.removeItem("kp_free_count");
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
