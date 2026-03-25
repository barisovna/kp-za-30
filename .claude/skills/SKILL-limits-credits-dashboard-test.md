---
name: limits-credits-dashboard-test
description: Полная проверка тарифной системы kp-za-30: все лимиты по планам, счётчики (хедер + дашборд + страница результата), блокировка PRO-шаблонов, истечение подписок, защита от обхода через DevTools. Используй когда нужно убедиться что монетизация работает правильно перед запуском на реальных пользователей.
---

# Limits, Credits & Dashboard Test — КП за 30 секунд

## Что тестируем и зачем

Из аудита проекта известно:
- Кредиты хранятся в `localStorage` → пользователь может изменить вручную
- `monthly`/`yearly` планы не истекали (баг зафиксирован в журнале, исправлен)
- Счётчик в хедере может не синхронизироваться с реальным состоянием
- PRO-шаблоны блокируются на фронте, но не проверяются на сервере
- Dashboard не всегда показывает актуальный план

**Этот скилл закрывает все эти точки.**

---

## Запрос к Claude Code — запускать как единое задание

```
Прочитай lib/credits.ts и app/page.tsx (секция хедера и счётчика).
Используй skill: limits-credits-dashboard-test

Выполни полную проверку тарифной системы по блокам ниже.
По каждому блоку: открой код → найди проблему → исправь → напиши тест.
```

---

## Блок A: Аудит lib/credits.ts (читать код, не угадывать)

```
Запрос к Claude Code:

Открой lib/credits.ts полностью.
Используй skill: limits-credits-dashboard-test

Ответь на каждый вопрос:

1. СТРУКТУРА ПЛАНОВ — выпиши таблицу:
   | Plan ID | Название | Цена | КП | Срок | Шаблоны |
   Проверь что совпадает с UI в PaywallModal.

2. getCredits() — что возвращает для каждого из 5 состояний:
   a) Нет записи в localStorage (новый пользователь)
   b) plan = 'free', creditsLeft = 3
   c) plan = 'free', creditsLeft = 0  
   d) plan = 'start', creditsLeft = 5, expiresAt = завтра
   e) plan = 'start', creditsLeft = 5, expiresAt = ВЧЕРА (истёк)

3. ПРОВЕРЬ КРИТИЧНЫЙ БАГ ИСТЕЧЕНИЯ:
   В applyPayment() — сохраняется ли monthly/yearly как 'unlimited'?
   Если да — план никогда не истечёт. Покажи код строки.
   Должно быть: { type: 'monthly', expiresAt: timestamp, creditsLeft: ... }
   НЕ: { type: 'unlimited', expiresAt: null }

4. canUseTemplate(templateId) — какие шаблоны доступны на каждом плане?
   free: ?
   start: ?
   active: ?
   monthly/yearly: ?

5. decrementCredit() — уменьшает только localStorage или тоже вызывает API?
   Если только localStorage → монетизация не защищена.
```

---

## Блок B: 12 сценариев тестирования лимитов

### Сценарий 1: Новый пользователь — 3 бесплатных КП

```
Что должно быть:
□ Счётчик в хедере: "3 из 3" или "Осталось: 3"
□ Форма активна, кнопка "Создать КП" не заблокирована
□ Шаблоны Classic и Minimal — доступны
□ Шаблоны VIP и Modern — показывают замок PRO

Playwright тест:
```
```typescript
// tests/e2e/limits/free-plan.spec.ts

test('новый пользователь видит 3 бесплатных КП', async ({ page }) => {
  // Чистый localStorage — новый пользователь
  await page.goto('/');
  
  // Счётчик в хедере показывает 3
  const counter = page.getByTestId('header-credits');
  await expect(counter).toContainText('3');
  
  // Кнопка создания активна
  const createBtn = page.getByTestId('create-kp-btn');
  await expect(createBtn).toBeEnabled();
  
  // Classic шаблон доступен (нет замка)
  await page.goto('/result');
  await expect(page.getByTestId('template-classic-lock')).not.toBeVisible();
  
  // VIP шаблон заблокирован (есть замок)
  await expect(page.getByTestId('template-vip-lock')).toBeVisible();
});
```

### Сценарий 2: Бесплатный лимит исчерпан (0 КП)

```
Что должно быть:
□ Счётчик: "0 из 3" или "Лимит исчерпан"
□ При нажатии "Создать КП" → открывается PaywallModal
□ PaywallModal: показывает все 3 тарифа
□ НЕ показывает сообщение об ошибке DeepSeek
□ Кнопка формы меняет текст: "Создать КП" → "Купить доступ"

Playwright тест:
```
```typescript
test('исчерпан бесплатный лимит → PaywallModal', async ({ page }) => {
  await page.addInitScript(() => {
    const credits = { plan: 'free', creditsLeft: 0, allTemplates: false };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/');
  
  // Счётчик показывает 0
  await expect(page.getByTestId('header-credits')).toContainText('0');
  
  // Нажать кнопку создания
  await page.getByTestId('create-kp-btn').click();
  
  // PaywallModal открылся (не страница ошибки)
  await expect(page.getByTestId('paywall-modal')).toBeVisible();
  
  // Есть все 3 тарифа
  await expect(page.getByTestId('pay-start')).toBeVisible();   // 199₽
  await expect(page.getByTestId('pay-active')).toBeVisible();  // 490₽
  await expect(page.getByTestId('pay-unlimited')).toBeVisible(); // 790₽
});
```

### Сценарий 3: После оплаты Старт (199₽, 10 КП)

```
Что должно быть:
□ Счётчик: "10 КП" или "Старт: 10 КП"
□ VIP шаблон: доступен (3 VIP-КП включены)
□ Modern шаблон: доступен (3 Modern-КП включены)
□ После 3 VIP-КП: VIP блокируется, но Classic/Minimal остаются
□ Кнопка в хедере: название плана "Старт" или иконка активного плана

Playwright тест:
```
```typescript
test('план Старт: 10 КП и PRO шаблоны до лимита', async ({ page }) => {
  await page.addInitScript(() => {
    const credits = {
      plan: 'start',
      creditsLeft: 10,
      expiresAt: Date.now() + 86400000 * 60, // 60 дней
      allTemplates: false,
      premiumCredits: { vip: 3, modern: 3 }
    };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/result');
  
  // VIP доступен
  await expect(page.getByTestId('template-vip-lock')).not.toBeVisible();
  
  // Modern доступен
  await expect(page.getByTestId('template-modern-lock')).not.toBeVisible();
  
  // Счётчик: 10
  await page.goto('/');
  await expect(page.getByTestId('header-credits')).toContainText('10');
});

test('план Старт: VIP блокируется после 3 использований', async ({ page }) => {
  await page.addInitScript(() => {
    const credits = {
      plan: 'start',
      creditsLeft: 7,
      expiresAt: Date.now() + 86400000 * 60,
      premiumCredits: { vip: 0, modern: 3 } // VIP исчерпан
    };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/result');
  
  // VIP заблокирован (лимит исчерпан)
  await expect(page.getByTestId('template-vip-lock')).toBeVisible();
  
  // Modern всё ещё доступен
  await expect(page.getByTestId('template-modern-lock')).not.toBeVisible();
});
```

### Сценарий 4: Активный план (490₽, 30 КП, все шаблоны)

```
Что должно быть:
□ Счётчик: "30 КП"
□ Все 4 шаблона доступны БЕЗ замков
□ Нет бейджа PRO на шаблонах
□ Нет PaywallModal при нажатии на VIP/Modern

Playwright тест:
```
```typescript
test('план Активный: все шаблоны без ограничений', async ({ page }) => {
  await page.addInitScript(() => {
    const credits = {
      plan: 'active',
      creditsLeft: 30,
      expiresAt: Date.now() + 86400000 * 90,
      allTemplates: true
    };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/result');
  
  // Ни один шаблон не заблокирован
  await expect(page.getByTestId('template-classic-lock')).not.toBeVisible();
  await expect(page.getByTestId('template-minimal-lock')).not.toBeVisible();
  await expect(page.getByTestId('template-vip-lock')).not.toBeVisible();
  await expect(page.getByTestId('template-modern-lock')).not.toBeVisible();
  
  // Кликнуть VIP → не открывается PaywallModal
  await page.getByTestId('template-vip').click();
  await expect(page.getByTestId('paywall-modal')).not.toBeVisible();
});
```

### Сценарий 5: Истёкший план (expiresAt в прошлом)

```
Что должно быть:
□ Счётчик: "0" или "Подписка истекла"
□ Показывается NotificationBanner: "Ваш план истёк"
□ При создании КП → PaywallModal (не DeepSeek ошибка)
□ VIP/Modern заблокированы снова
□ КРИТИЧНО: getCredits() должен вернуть plan='free', а не 'start'/'monthly'

Playwright тест:
```
```typescript
test('истёкший план → переход на free', async ({ page }) => {
  await page.addInitScript(() => {
    const credits = {
      plan: 'start',
      creditsLeft: 5,
      expiresAt: Date.now() - 86400000, // ВЧЕРА — истёк
      allTemplates: false
    };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/');
  
  // Баннер об истечении (если реализован)
  // await expect(page.getByTestId('expiry-banner')).toBeVisible();
  
  // Счётчик показывает 0 или free (не 5)
  const counter = page.getByTestId('header-credits');
  await expect(counter).not.toContainText('5'); // Должен сброситься
  
  // VIP заблокирован
  await page.goto('/result');
  await expect(page.getByTestId('template-vip-lock')).toBeVisible();
});

test('истёкший monthly план → возврат к free, не unlimited', async ({ page }) => {
  await page.addInitScript(() => {
    // КРИТИЧНЫЙ БАГ: если monthly сохранился как 'unlimited' — не истечёт
    const credits = {
      plan: 'monthly', // или 'unlimited' если баг не исправлен
      creditsLeft: 999,
      expiresAt: Date.now() - 1000, // 1 секунда назад
    };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/');
  
  // После истечения: должен быть free, не unlimited
  const counter = page.getByTestId('header-credits');
  // НЕ должно быть "∞" или "безлимит"
  await expect(counter).not.toContainText('∞');
  await expect(counter).not.toContainText('999');
});
```

### Сценарий 6: Переключение шаблонов не сжигает 2 кредита

```
Что должно быть:
□ Выбрал VIP → сжёг 1 premium кредит
□ Переключил на Classic → кредит НЕ возвращается, но второй НЕ сгорает
□ Переключил обратно на VIP → тот же 1 кредит (sessionStorage флаг)

Playwright тест:
```
```typescript
test('переключение шаблонов не тратит лишние premium кредиты', async ({ page }) => {
  await page.addInitScript(() => {
    const credits = { plan: 'start', creditsLeft: 10, 
                      expiresAt: Date.now() + 86400000 * 60,
                      premiumCredits: { vip: 3, modern: 3 } };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
  });
  
  await page.goto('/result');
  
  // Выбрать VIP
  await page.getByTestId('template-vip').click();
  
  // Переключить на Classic
  await page.getByTestId('template-classic').click();
  
  // Вернуться на VIP
  await page.getByTestId('template-vip').click();
  
  // Premium кредитов VIP должно быть 2, не 1
  const creditsRaw = await page.evaluate(
    () => localStorage.getItem('kp_credits')
  );
  const credits = JSON.parse(creditsRaw!);
  expect(credits.premiumCredits?.vip).toBe(2); // потрачен только 1, не 2
});
```

---

## Блок C: Отображение в хедере и дашборде

### C1: Хедер — счётчик при каждом плане

```
Запрос к Claude Code:

Открой app/page.tsx, найди секцию хедера и счётчика.
Используй skill: limits-credits-dashboard-test

Проверь:
1. Какой компонент/переменная отвечает за счётчик в хедере?
2. Обновляется ли счётчик СРАЗУ после оплаты (без перезагрузки страницы)?
3. Обновляется ли счётчик после генерации каждого КП?
4. Что показывает счётчик для каждого плана:
   - free: "3 из 3" / "Осталось: 3" / просто "3"?
   - start: "10 КП" / "Старт: 10"?
   - active: "30 КП"?
   - monthly: "∞" / "Безлимит"?
   - expired: "0" / "Истёк" / пусто?

Исправить: счётчик должен обновляться без перезагрузки после оплаты.
```

```typescript
// Playwright тест: счётчик обновляется после mock оплаты
test('счётчик в хедере обновляется после активации плана', async ({ page }) => {
  // Начать с нулевым балансом
  await page.addInitScript(() => {
    localStorage.setItem('kp_credits', JSON.stringify({
      plan: 'free', creditsLeft: 0
    }));
  });
  
  await page.goto('/');
  
  const counter = page.getByTestId('header-credits');
  await expect(counter).toContainText('0');
  
  // Активировать mock план через localStorage (симуляция успешной оплаты)
  await page.evaluate(() => {
    const credits = {
      plan: 'start', creditsLeft: 10,
      expiresAt: Date.now() + 86400000 * 60,
      allTemplates: false, premiumCredits: { vip: 3, modern: 3 }
    };
    localStorage.setItem('kp_credits', JSON.stringify(credits));
    // Если есть event listener на storage — триггерим
    window.dispatchEvent(new Event('storage'));
  });
  
  // Счётчик должен обновиться без перезагрузки
  await expect(counter).toContainText('10');
});
```

### C2: Дашборд — план, кредиты, история

```
Запрос к Claude Code:

Открой app/dashboard/page.tsx полностью.
Используй skill: limits-credits-dashboard-test

Проверь и исправь:
1. Показывается ли текущий план (Free / Старт / Активный / Безлимит)?
2. Показывается ли сколько КП осталось?
3. Показывается ли дата истечения подписки?
4. Если план истёк — показывается ли это явно?
5. Есть ли кнопка "Продлить" / "Улучшить план" для free/expired?
6. История КП: показывает ли каждое КП шаблон (Классика/ВИП)?
7. Статистика вверху: показывает ли реальные числа из localStorage?

Чего НЕ должно быть:
❌ Пустой блок тарифа
❌ "undefined" в названии плана
❌ Дата "Invalid Date"
❌ Счётчик не совпадает с хедером главной страницы
```

```typescript
// tests/e2e/limits/dashboard-display.spec.ts

test('дашборд показывает текущий план корректно', async ({ page }) => {
  await page.addInitScript(() => {
    // Установить план
    localStorage.setItem('kp_credits', JSON.stringify({
      plan: 'start',
      creditsLeft: 7,
      expiresAt: Date.now() + 86400000 * 45, // 45 дней
      allTemplates: false,
      premiumCredits: { vip: 1, modern: 3 }
    }));
    
    // Установить историю
    const history = [
      { id: '1', client: 'ООО Тест', date: new Date().toISOString(), 
        template: 'classic', status: 'draft' },
      { id: '2', client: 'ИП Иванов', date: new Date().toISOString(), 
        template: 'vip', status: 'sent' }
    ];
    localStorage.setItem('kp_history', JSON.stringify(history));
  });
  
  await page.goto('/dashboard');
  
  // Название плана отображается
  await expect(page.getByText(/старт|start/i)).toBeVisible();
  
  // Кредиты отображаются (7)
  await expect(page.getByText('7')).toBeVisible();
  
  // Дата не сломана
  await expect(page.getByText(/invalid date/i)).not.toBeVisible();
  
  // История: 2 записи
  const rows = page.getByTestId('kp-history-row');
  await expect(rows).toHaveCount(2);
  
  // Второе КП — ВИП шаблон
  await expect(rows.nth(1)).toContainText(/вип|vip/i);
});

test('дашборд: истёкший план показывает кнопку продления', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kp_credits', JSON.stringify({
      plan: 'start',
      creditsLeft: 3,
      expiresAt: Date.now() - 86400000 * 2 // Истёк 2 дня назад
    }));
  });
  
  await page.goto('/dashboard');
  
  // Статус "истёк" отображается
  await expect(
    page.getByText(/истёк|expired|закончился/i)
  ).toBeVisible();
  
  // Кнопка продления присутствует
  await expect(
    page.getByRole('button', { name: /продлить|купить|обновить/i })
  ).toBeVisible();
});

test('дашборд: free план с 0 КП показывает апсейл', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kp_credits', JSON.stringify({
      plan: 'free', creditsLeft: 0
    }));
  });
  
  await page.goto('/dashboard');
  
  // Апсейл блок виден
  await expect(
    page.getByText(/3 бесплатных кп использованы|купите пакет|купить доступ/i)
  ).toBeVisible();
});
```

---

## Блок D: Защита от обхода через DevTools

```
Запрос к Claude Code:

Проверь app/api/generate/route.ts.
Используй skill: limits-credits-dashboard-test

КРИТИЧНАЯ УЯЗВИМОСТЬ:
Если лимиты проверяются только в localStorage —
пользователь может открыть DevTools → Application → localStorage
и изменить kp_credits.creditsLeft = 999 → безлимитный доступ бесплатно.

Нужно:
1. При каждом вызове /api/generate:
   - Получить userId из cookie или session
   - Проверить план в Vercel KV (не localStorage)
   - Если KV недоступен → использовать временный счётчик в cookie (httpOnly)
   
2. Декрементировать счётчик на СЕРВЕРЕ:
   user:{userId}:credits_left -= 1 в Vercel KV
   
3. Если userId нет (анонимный пользователь):
   - Использовать fingerprint (IP + userAgent хэш) для tracking
   - Лимит 3 КП на fingerprint

Минимальная защита (для MVP):
- httpOnly cookie с счётчиком (сложнее подделать чем localStorage)
- При несоответствии cookie и localStorage → доверять cookie
```

```typescript
// Playwright тест: попытка обхода через DevTools
test('нельзя обойти лимит изменив localStorage', async ({ page }) => {
  await page.addInitScript(() => {
    // Злоумышленник: ставит 999 кредитов
    localStorage.setItem('kp_credits', JSON.stringify({
      plan: 'active', creditsLeft: 999, allTemplates: true,
      expiresAt: Date.now() + 86400000 * 365
    }));
  });
  
  // Мок: сервер возвращает реальный лимит (0 для free анонима)
  await page.route('**/api/generate', async route => {
    // Сервер должен проверять свой KV, не принимать localStorage
    await route.fulfill({
      status: 403,
      body: JSON.stringify({ error: 'limit_reached', source: 'server' })
    });
  });
  
  await page.goto('/');
  await page.getByTestId('field-company').fill('Тест');
  await page.getByTestId('field-service').fill('Услуга');
  await page.getByTestId('field-client').fill('Клиент');
  await page.getByTestId('field-pain').fill('Боль');
  await page.getByTestId('field-advantages').fill('Плюсы');
  await page.getByTestId('field-price').fill('1000₽');
  
  await page.getByTestId('create-kp-btn').click();
  
  // Должен показать PaywallModal, не сгенерировать КП
  await expect(page.getByTestId('paywall-modal')).toBeVisible();
  // НЕ должен перейти на /result
  await expect(page).not.toHaveURL(/result/);
});
```

---

## Блок E: Проверка data-testid для стабильных тестов

```
Запрос к Claude Code:

Добавь data-testid атрибуты в шаблонные карточки на /result/page.tsx.
Используй skill: limits-credits-dashboard-test

Нужные testid:
- template-classic        ← кнопка/карточка классика
- template-minimal        ← кнопка/карточка минимализм  
- template-vip            ← кнопка/карточка вип
- template-modern         ← кнопка/карточка современный
- template-classic-lock   ← замок на классике (если есть)
- template-minimal-lock   ← замок на минимализме (если есть)
- template-vip-lock       ← замок на вип
- template-modern-lock    ← замок на современном
- header-credits          ← счётчик КП в хедере
- header-buy-btn          ← кнопка "Купить" в хедере
- paywall-modal           ← модалка выбора тарифа
- pay-start               ← кнопка пакет Старт 199₽
- pay-active              ← кнопка пакет Активный 490₽
- pay-unlimited           ← кнопка Безлимит 790₽
- kp-history-row          ← строка в истории КП (дашборд)
- create-kp-btn           ← кнопка Создать КП (главная)
- plan-status             ← текущий план в дашборде
- plan-expires            ← дата истечения в дашборде
- plan-upgrade-btn        ← кнопка улучшить план

Эти testid нужны для стабильных тестов — Playwright не будет
ломаться если изменится текст кнопки.
```

---

## Блок F: Итоговый тест-сьют — запустить всё разом

```typescript
// tests/e2e/limits/index.spec.ts — главный файл, запускает все сценарии

import { test, expect } from '@playwright/test';

// Хелпер: установить план в localStorage
async function setCredits(page, plan, creditsLeft, expiresInDays = 60) {
  await page.addInitScript((args) => {
    const [plan, creditsLeft, expiresInDays] = args;
    localStorage.setItem('kp_credits', JSON.stringify({
      plan,
      creditsLeft,
      expiresAt: Date.now() + 86400000 * expiresInDays,
      allTemplates: plan === 'active' || plan === 'monthly' || plan === 'yearly',
      premiumCredits: plan === 'start' ? { vip: 3, modern: 3 } : undefined,
      kp_email_capture_skip: '1',
      kp_onboarded: '1',
    }));
    localStorage.setItem('kp_daily_tip_shown', new Date().toDateString());
  }, [plan, creditsLeft, expiresInDays]);
}

test.describe('Лимиты: бесплатный план', () => {
  test('3 КП доступны на старте', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('header-credits')).toContainText('3');
  });
  
  test('0 КП → PaywallModal при создании', async ({ page }) => {
    await setCredits(page, 'free', 0, 0);
    await page.goto('/');
    await page.getByTestId('create-kp-btn').click();
    await expect(page.getByTestId('paywall-modal')).toBeVisible();
  });
  
  test('PRO шаблоны заблокированы на free', async ({ page }) => {
    await setCredits(page, 'free', 2, 0);
    await page.goto('/result');
    await expect(page.getByTestId('template-vip-lock')).toBeVisible();
    await expect(page.getByTestId('template-modern-lock')).toBeVisible();
  });
});

test.describe('Лимиты: план Старт', () => {
  test('10 КП, VIP доступен', async ({ page }) => {
    await setCredits(page, 'start', 10, 60);
    await page.goto('/');
    await expect(page.getByTestId('header-credits')).toContainText('10');
    await page.goto('/result');
    await expect(page.getByTestId('template-vip-lock')).not.toBeVisible();
  });
  
  test('план не активен после истечения', async ({ page }) => {
    await setCredits(page, 'start', 5, -1); // истёк вчера
    await page.goto('/result');
    await expect(page.getByTestId('template-vip-lock')).toBeVisible();
  });
});

test.describe('Лимиты: план Активный', () => {
  test('30 КП, все шаблоны без замков', async ({ page }) => {
    await setCredits(page, 'active', 30, 90);
    await page.goto('/result');
    await expect(page.getByTestId('template-vip-lock')).not.toBeVisible();
    await expect(page.getByTestId('template-modern-lock')).not.toBeVisible();
    await expect(page.getByTestId('template-classic-lock')).not.toBeVisible();
  });
});

test.describe('Дашборд: отображение', () => {
  test('план и кредиты отображаются', async ({ page }) => {
    await setCredits(page, 'start', 7, 45);
    await page.goto('/dashboard');
    await expect(page.getByTestId('plan-status')).toBeVisible();
    await expect(page.getByText(/7/)).toBeVisible();
    await expect(page.getByText(/invalid date/i)).not.toBeVisible();
  });
  
  test('истёкший план показывает кнопку продления', async ({ page }) => {
    await setCredits(page, 'start', 3, -2);
    await page.goto('/dashboard');
    await expect(page.getByTestId('plan-upgrade-btn')).toBeVisible();
  });
});
```

---

## Команды запуска

```bash
# Все тесты лимитов
npx playwright test tests/e2e/limits/ --headed

# Только дашборд
npx playwright test tests/e2e/limits/dashboard-display.spec.ts --headed

# Проверка истечения планов
npx playwright test tests/e2e/limits/ --grep "истёкший"

# Полный прогон с отчётом
npx playwright test tests/e2e/limits/
npx playwright show-report

# После исправлений — проверить что ничего не сломалось
npx playwright test
npm run build && echo "✅ BUILD OK"

# Зафиксировать
git add .
git commit -m "test: limits and credits full coverage"
git push
```

---

## После тестов: что обновить в CLAUDE.md

```
После прогона этого скилла обновить в CLAUDE.md:

### Тарифная система — актуальный статус
- [ ] lib/credits.ts: monthly/yearly истекают корректно
- [ ] Хедер: счётчик обновляется без перезагрузки
- [ ] Dashboard: plan-status, plan-expires, upgrade-btn отображаются
- [ ] data-testid добавлены во все шаблонные карточки
- [ ] Playwright тесты лимитов: X/X passed
- [ ] Серверная защита от обхода localStorage: реализована / в планах
```
