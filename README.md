# КП за 30 секунд

AI-генератор коммерческих предложений для фрилансеров, ИП и малых агентств России.

**Сайт:** [kp-za-30.vercel.app](https://kp-za-30.vercel.app)
**Репозиторий:** [github.com/barisovna/kp-za-30](https://github.com/barisovna/kp-za-30)

---

## Что это

Заполни 6 полей — получи профессиональное коммерческое предложение за 30 секунд. Без шаблонов, без копипаста. Генерация через DeepSeek AI, 4 шаблона оформления, скачивание через печать браузера.

**Для кого:** фрилансеры, ИП, небольшие агентства, которые тратят 2–4 часа на каждое КП вручную.

---

## Стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| AI | DeepSeek API (`deepseek-chat`) |
| База данных | Vercel KV (Upstash Redis) |
| Email | Resend |
| Деплой | Vercel (автодеплой из GitHub) |
| Тесты | Playwright (E2E) |

---

## Запуск локально

```bash
# 1. Клонировать репозиторий
git clone https://github.com/barisovna/kp-za-30.git
cd kp-za-30

# 2. Установить зависимости
npm install

# 3. Создать .env.local (скопировать из Vercel или заполнить вручную)
cp .env.example .env.local   # заполнить ключи

# 4. Запустить
npm run dev
# Открыть: http://localhost:3000
```

### Необходимые переменные окружения

```env
DEEPSEEK_API_KEY=       # platform.deepseek.com
RESEND_API_KEY=         # resend.com
KV_REST_API_URL=        # Vercel KV / Upstash
KV_REST_API_TOKEN=      # Vercel KV / Upstash
CRON_SECRET=            # любая случайная строка
```

---

## Команды

```bash
npm run dev          # локальная разработка
npm run build        # production сборка
npm run lint         # ESLint проверка
npm run test:e2e     # Playwright E2E тесты
```

---

## Структура проекта

```
app/
├── page.tsx                    ← главная: лендинг + форма генерации
├── result/page.tsx             ← результат: превью + шаблоны + скачать
├── dashboard/page.tsx          ← личный кабинет: история КП
├── partner/page.tsx            ← партнёрская программа
├── unsubscribe/page.tsx        ← отписка от email-уведомлений
└── api/
    ├── generate/route.ts       ← POST: форма → DeepSeek → КП
    ├── demo/route.ts           ← POST: демо-генерация (2 поля)
    ├── payment/mock/route.ts   ← POST: тестовая оплата
    ├── referral/route.ts       ← партнёрская программа
    └── notifications/
        ├── subscribe/route.ts  ← POST/DELETE: подписка на email
        └── cron/route.ts       ← Vercel Cron: ежедневные уведомления
lib/
├── deepseek.ts                 ← промт и вызов DeepSeek API
├── parseKpResponse.ts          ← парсинг XML-ответа
├── credits.ts                  ← тарифы, кредиты, проверки доступа
├── referral.ts                 ← реферальная программа
└── notifications.ts            ← утилиты email-уведомлений
tests/e2e/                      ← Playwright тесты (32 теста, 100% pass)
```

---

## Тарифы (текущие)

| Пакет | Цена | КП | Срок |
|---|---|---|---|
| Старт | 199 ₽ | 10 | 60 дней |
| Активный | 490 ₽ | 30 | 90 дней |
| Безлимит | 790 ₽/мес | ∞ | 30 дней |
| Бесплатно | — | 3 | без срока |

Бесплатные КП: шаблоны Классика и Минимализм. ВИП и Современный — только платно.

---

## Деплой

Автодеплой через Vercel при пуше в `main`. Все переменные окружения настроены в Vercel Dashboard.

Cron-задача (email-уведомления): `0 7 * * *` — запускается через Vercel Cron.

---

## Статус

Проект на стадии soft launch. Монетизация через клиентский `localStorage` (серверная авторизация в разработке).
