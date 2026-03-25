---
name: playwright-kp-testing
description: Автотесты Playwright для КП-генератора. Используй для тестирования формы генерации, лимитов, PDF-скачивания, авторизации и флоу оплаты. Включает моки DeepSeek API и Vercel KV для изолированного тестирования.
---

# Playwright — Автотесты КП-генератора

## Установка и настройка

```bash
# В корне проекта
npm install -D @playwright/test
npx playwright install chromium  # Достаточно для MVP

# Создай файл конфига
# playwright.config.ts
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,           // КП-тесты sequential (лимиты KV)
  timeout: 30000,                 // DeepSeek может быть медленным
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Мок DeepSeek API (обязателен для тестов)

```typescript
// tests/e2e/helpers/mockDeepSeek.ts
import { Page } from '@playwright/test';

export const MOCK_KP_RESPONSE = `<kp>
  <headline>Сократите расходы на бухгалтерию на 40% с первого месяца</headline>
  <intro>ООО "Тест", вы тратите время на документы вместо развития бизнеса. Мы это изменим.</intro>
  <problem>Каждый час вашего бухгалтера стоит денег. Ошибки в отчётности — штрафы.</problem>
  <solution>Берём на себя всю бухгалтерию. Вы получаете отчёты, мы решаем проблемы.</solution>
  <advantages>
    <item>Экономия 35 000₽/мес по сравнению со штатным бухгалтером</item>
    <item>Ответственность застрахована на 1 000 000₽</item>
    <item>Отчёты готовы за 24 часа, не за 3 дня</item>
  </advantages>
  <price>От 15 000₽/мес. Первый месяц бесплатно.</price>
  <cta>Позвоните нам сегодня — расчёт стоимости за 15 минут.</cta>
</kp>`;

export async function mockDeepSeekSuccess(page: Page) {
  await page.route('**/api/generate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text: MOCK_KP_RESPONSE,
        kpId: 'test-kp-123',
        remaining: 2,
      }),
    });
  });
}

export async function mockDeepSeekLimitReached(page: Page) {
  await page.route('**/api/generate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'limit_reached' }),
    });
  });
}

export async function mockDeepSeekError(page: Page) {
  await page.route('**/api/generate', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'deepseek_error' }),
    });
  });
}
```

---

## Тест 1: Основной флоу генерации КП

```typescript
// tests/e2e/generate-kp.spec.ts
import { test, expect } from '@playwright/test';
import { mockDeepSeekSuccess } from './helpers/mockDeepSeek';

const VALID_FORM_DATA = {
  company: 'ООО "ТехСервис"',
  service: 'Аутсорсинг IT-поддержки',
  client: 'Сеть кофеен "Бодрость"',
  pain: 'Постоянные сбои кассового оборудования, теряют выручку',
  advantages: 'Выезд за 2 часа\nОпыт в ритейле 6 лет\nСтоимость ниже штатного IT на 50%',
  price: 'от 25 000₽/мес, договор с первого дня',
};

test('заполнить форму и получить КП', async ({ page }) => {
  await mockDeepSeekSuccess(page);
  await page.goto('/');

  // Проверяем наличие формы
  await expect(page.getByText('Коммерческое предложение за 30 секунд')).toBeVisible();

  // Заполняем форму
  await page.getByLabel(/название вашей компании/i).fill(VALID_FORM_DATA.company);
  await page.getByLabel(/услуга или продукт/i).fill(VALID_FORM_DATA.service);
  await page.getByLabel(/кому отправляете/i).fill(VALID_FORM_DATA.client);
  await page.getByLabel(/главная боль/i).fill(VALID_FORM_DATA.pain);
  await page.getByLabel(/преимущества/i).fill(VALID_FORM_DATA.advantages);
  await page.getByLabel(/стоимость и сроки/i).fill(VALID_FORM_DATA.price);

  // Отправляем
  await page.getByRole('button', { name: /создать кп/i }).click();

  // Проверяем loading state
  await expect(page.getByText(/генерирую кп/i)).toBeVisible();

  // Переход на /result
  await page.waitForURL('**/result**');
  
  // Контент отображается
  await expect(page.getByText('Сократите расходы')).toBeVisible();
  await expect(page.getByRole('button', { name: /скачать pdf/i })).toBeVisible();
});

test('счётчик уменьшается после генерации', async ({ page }) => {
  await mockDeepSeekSuccess(page);
  await page.goto('/');
  
  // Изначально 3 (или то что в моке)
  await expect(page.getByText(/осталось.*3.*из 3/i)).toBeVisible();
  
  // После генерации — 2
  // ... (продолжение теста после navigate на result и обратно)
});
```

---

## Тест 2: Лимиты и апсейл

```typescript
// tests/e2e/limits.spec.ts
import { test, expect } from '@playwright/test';
import { mockDeepSeekLimitReached } from './helpers/mockDeepSeek';

test('показывает апсейл когда лимит исчерпан', async ({ page }) => {
  await mockDeepSeekLimitReached(page);
  await page.goto('/');

  // Заполняем минимальные данные
  await page.getByLabel(/название вашей компании/i).fill('Тест');
  await page.getByLabel(/услуга/i).fill('Тест');
  await page.getByRole('button', { name: /создать кп/i }).click();

  // Апсейл-баннер появляется
  await expect(page.getByText(/3 бесплатных кп использованы/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /490.*10 кп/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /990.*безлимит/i })).toBeVisible();
});

test('кнопки оплаты показывают заглушку', async ({ page }) => {
  await mockDeepSeekLimitReached(page);
  await page.goto('/result?limitReached=true');
  
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Оплата подключается');
    await dialog.accept();
  });
  
  await page.getByRole('button', { name: /490/i }).click();
});
```

---

## Тест 3: PDF-скачивание

```typescript
// tests/e2e/pdf-download.spec.ts
import { test, expect } from '@playwright/test';

test('переключение шаблонов отображается', async ({ page }) => {
  // Мокаем уже сгенерированное КП в localStorage/sessionStorage
  await page.goto('/result');
  
  const templates = page.getByTestId('template-selector');
  await expect(templates).toBeVisible();
  
  // Проверяем 3 шаблона
  await expect(page.getByText('Классика')).toBeVisible();
  await expect(page.getByText('Тёмный')).toBeVisible();
  await expect(page.getByText('Минимализм')).toBeVisible();
  
  // Переключение меняет активный шаблон
  await page.getByText('Тёмный').click();
  await expect(page.getByText('Тёмный').locator('..')).toHaveClass(/active|selected|ring/);
});

test('кнопка скачать PDF триггерит download', async ({ page }) => {
  await page.goto('/result');
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /скачать pdf/i }).click(),
  ]);
  
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
```

---

## Тест 4: Обработка ошибок

```typescript
// tests/e2e/error-handling.spec.ts
import { test, expect } from '@playwright/test';
import { mockDeepSeekError } from './helpers/mockDeepSeek';

test('показывает friendly error при сбое DeepSeek', async ({ page }) => {
  await mockDeepSeekError(page);
  await page.goto('/');
  
  await page.getByLabel(/название/i).fill('Тест');
  await page.getByLabel(/услуга/i).fill('Тест');
  await page.getByRole('button', { name: /создать кп/i }).click();
  
  // Friendly сообщение, не технический error
  await expect(
    page.getByText(/что-то пошло не так|попробуйте ещё раз/i)
  ).toBeVisible();
  
  // Кнопка retry присутствует
  await expect(page.getByRole('button', { name: /повторить/i })).toBeVisible();
  
  // Счётчик НЕ уменьшился (ошибка не должна списывать КП)
  await expect(page.getByText(/3 из 3/i)).toBeVisible();
});

test('валидация формы — пустые обязательные поля', async ({ page }) => {
  await page.goto('/');
  
  await page.getByRole('button', { name: /создать кп/i }).click();
  
  // Форма не отправилась — остаёмся на /
  await expect(page).toHaveURL('/');
  
  // Поля подсвечены ошибкой
  await expect(page.getByText(/заполните обязательные поля/i)).toBeVisible();
});
```

---

## Тест 5: Редактирование КП

```typescript
// tests/e2e/edit-kp.spec.ts
import { test, expect } from '@playwright/test';

test('можно отредактировать текст КП и скачать изменённую версию', async ({ page }) => {
  await page.goto('/result');
  
  await page.getByRole('button', { name: /редактировать/i }).click();
  
  const editor = page.getByRole('textbox', { name: /текст кп/i });
  await expect(editor).toBeVisible();
  
  // Очищаем и вводим новый текст
  await editor.clear();
  await editor.fill('Тестовый текст КП после редактирования');
  
  // Превью обновляется
  await expect(page.getByText('Тестовый текст КП после редактирования')).toBeVisible();
});
```

---

## Команды запуска

```bash
# Все тесты
npx playwright test

# Конкретный файл
npx playwright test tests/e2e/generate-kp.spec.ts

# С UI (удобно для отладки)
npx playwright test --ui

# В headed режиме (видно браузер)
npx playwright test --headed

# Только упавшие тесты
npx playwright test --last-failed

# Отчёт
npx playwright show-report
```

---

## Добавить в package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## Как использовать с Claude Code

```
# Запрос 1 — создать тест для конкретного флоу:
Напиши Playwright тест для флоу авторизации через magic link.
Используй skill: playwright-kp-testing.
Файл: tests/e2e/auth.spec.ts
Включи мок для NextAuth сессии и Resend email API.

# Запрос 2 — дебаггинг упавшего теста:
Тест tests/e2e/limits.spec.ts падает с ошибкой [вставить ошибку].
Используй skill: playwright-kp-testing.
Исправь тест, сохрани в тот же файл.

# Запрос 3 — покрыть новый функционал:
Добавил функцию сохранения КП в историю /dashboard.
Используй skill: playwright-kp-testing.
Напиши тест: генерация → переход в dashboard → КП в списке.
```
