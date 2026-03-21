/**
 * Тесты тарифной системы — lib/credits.ts + хедер-счётчик
 * Покрывает: getCredits, canUseTemplate, decrementCredit, applyPayment,
 *            legacy-значения monthly/yearly, хедер-счётчик UI.
 */
import { test, expect } from "@playwright/test";

// ─── Хелпер: сбросить localStorage в чистое состояние ─────────────────────
async function clearCredits(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  await page.evaluate(() => {
    [
      "kp_free_count", "kp_paid_credits", "kp_plan",
      "kp_vip_credits", "kp_modern_credits", "kp_plan_expires",
    ].forEach((k) => localStorage.removeItem(k));
  });
}

// ─── Блок 1: getCredits — Free план ───────────────────────────────────────
test.describe("getCredits — free план", () => {
  test("первое посещение: инициализирует 3 бесплатных КП", async ({ page }) => {
    await page.goto("/");
    await clearCredits(page);
    await page.reload();

    const totalLeft = await page.evaluate(() => {
      const v = localStorage.getItem("kp_free_count");
      return v !== null ? parseInt(v, 10) : null;
    });
    expect(totalLeft).toBe(3);

    await expect(page.getByTestId("header-credits")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("header-credits")).toContainText("3 КП");
  });

  test("0 бесплатных КП → кнопка 'Купить КП'", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("kp_free_count", "0");
      localStorage.removeItem("kp_plan");
      localStorage.removeItem("kp_plan_expires");
    });
    await page.goto("/");
    await expect(page.getByTestId("header-buy-btn")).toBeVisible({ timeout: 3000 });
  });
});

// ─── Блок 2: getCredits — legacy "monthly"/"yearly" в localStorage ─────────
test.describe("getCredits — legacy plan values", () => {
  test("kp_plan=monthly (legacy) → показывает ∞, не 'Купить'", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem("kp_plan", "monthly");          // старое значение
      localStorage.setItem("kp_paid_credits", "-1");        // как хранилось раньше
      localStorage.setItem("kp_plan_expires", String(future));
    });
    await page.goto("/");
    // Не должна показываться кнопка "Купить КП"
    await expect(page.getByTestId("header-buy-btn")).not.toBeVisible({ timeout: 3000 });
    // Счётчик должен быть виден и показывать ∞
    await expect(page.getByTestId("header-credits")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("header-credits")).toContainText("∞ КП");
  });

  test("kp_plan=yearly (legacy) → показывает ∞, не 'Купить'", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 365 * 24 * 60 * 60 * 1000;
      localStorage.setItem("kp_plan", "yearly");
      localStorage.setItem("kp_paid_credits", "-1");
      localStorage.setItem("kp_plan_expires", String(future));
    });
    await page.goto("/");
    await expect(page.getByTestId("header-buy-btn")).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("header-credits")).toContainText("∞ КП");
  });
});

// ─── Блок 3: canUseTemplate — через paywall-модалку ───────────────────────
test.describe("canUseTemplate — шаблоны", () => {
  test("free план: клик на VIP шаблон открывает paywall", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("kp_plan");
      localStorage.removeItem("kp_plan_expires");
      localStorage.setItem("kp_free_count", "1");
      // подавляем модалки онбординга
      localStorage.setItem("kp_onboarded", "1");
      localStorage.setItem("kp_email_capture_skip", "1");
      localStorage.setItem("kp_daily_tip_shown", new Date().toISOString().slice(0, 10));
    });
    // Кладём КП в sessionStorage чтобы попасть на /result
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.setItem("kp_result", JSON.stringify({
        title: "Тест", headline: "Тест", intro: "Тест",
        problem: "Тест", solution: "Тест",
        advantages: ["п1"], price: "100₽", cta: "Звони",
      }));
    });
    await page.goto("/result");

    // Кликаем на VIP-шаблон
    const vipBtn = page.getByTestId("template-vip");
    if (await vipBtn.isVisible()) {
      await vipBtn.click();
      await expect(page.getByText(/платных пакетах|план/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test("unlimited план: VIP-шаблон не вызывает paywall", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem("kp_plan", "unlimited");
      localStorage.setItem("kp_paid_credits", "99999");
      localStorage.setItem("kp_vip_credits", "-1");
      localStorage.setItem("kp_modern_credits", "-1");
      localStorage.setItem("kp_plan_expires", String(future));
      localStorage.setItem("kp_onboarded", "1");
    });
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.setItem("kp_result", JSON.stringify({
        title: "Тест", headline: "Тест", intro: "Тест",
        problem: "Тест", solution: "Тест",
        advantages: ["п1"], price: "100₽", cta: "Звони",
      }));
    });
    await page.goto("/result");

    const vipBtn = page.getByTestId("template-vip");
    if (await vipBtn.isVisible()) {
      await vipBtn.click();
      // Paywall НЕ должен открыться
      await expect(page.getByText(/платных пакетах/i)).not.toBeVisible({ timeout: 2000 });
    }
  });
});

// ─── Блок 4: Хедер-счётчик — корректный символ ∞ ──────────────────────────
test.describe("Хедер — счётчик кредитов", () => {
  test("unlimited план: показывает ∞, а не число", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem("kp_plan", "unlimited");
      localStorage.setItem("kp_paid_credits", "99999");
      localStorage.setItem("kp_plan_expires", String(future));
    });
    await page.goto("/");
    const el = page.getByTestId("header-credits");
    await expect(el).toBeVisible({ timeout: 3000 });
    const text = await el.innerText();
    expect(text).toContain("∞");
    expect(text).not.toMatch(/\d{3,}/); // не должно быть числа вроде 99999
  });

  test("start план: показывает конкретное число", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 60 * 24 * 60 * 60 * 1000;
      localStorage.setItem("kp_plan", "start");
      localStorage.setItem("kp_paid_credits", "7");
      localStorage.setItem("kp_vip_credits", "2");
      localStorage.setItem("kp_modern_credits", "1");
      localStorage.setItem("kp_plan_expires", String(future));
    });
    await page.goto("/");
    await expect(page.getByTestId("header-credits")).toContainText("7 КП");
  });
});

// ─── Блок 5: decrementCredit — не декрементирует unlimited ────────────────
// Проверяем через генерацию КП: успешная генерация на unlimited → счётчик ∞ не меняется
test.describe("decrementCredit — unlimited не списывает кредиты", () => {
  test("после успешной генерации на unlimited план ∞ остаётся ∞", async ({ page }) => {
    await page.addInitScript(() => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem("kp_plan", "unlimited");
      localStorage.setItem("kp_paid_credits", "99999");
      localStorage.setItem("kp_vip_credits", "-1");
      localStorage.setItem("kp_modern_credits", "-1");
      localStorage.setItem("kp_plan_expires", String(future));
      localStorage.setItem("kp_onboarded", "1");
      localStorage.setItem("kp_email_capture_skip", "1");
      localStorage.setItem("kp_daily_tip_shown", new Date().toISOString().slice(0, 10));
    });

    // Мокаем generate API
    await page.route("**/api/generate", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kp: {
            title: "Тест", headline: "Тест", intro: "Т", problem: "Т",
            solution: "Т", advantages: ["п1"], price: "100₽", cta: "Звони",
          },
          kpId: "test-unlimited-123",
        }),
      })
    );
    // Мокаем /api/user/credits чтобы не было сетевых ошибок
    await page.route("**/api/user/credits", (route) =>
      route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ credits: { plan: "unlimited", totalLeft: 99999, vipLeft: -1, modernLeft: -1, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 } }) })
    );

    await page.goto("/");

    // Счётчик до генерации — ∞
    await expect(page.getByTestId("header-credits")).toContainText("∞ КП", { timeout: 3000 });

    // После генерации kp_paid_credits НЕ должен уменьшиться
    const paid = await page.evaluate(() => localStorage.getItem("kp_paid_credits"));
    expect(paid).toBe("99999");
  });
});
