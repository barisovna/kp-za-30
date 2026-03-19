# КП за 30 секунд — Project Context for Claude

> Этот файл читается автоматически при каждом открытии проекта.
> Обновляй его после каждой сессии: что сделано, что решили, что дальше.

---

## 🎯 Суть проекта

**Продукт:** Веб-приложение для генерации коммерческих предложений за 30 секунд.  
**Аудитория:** Фрилансеры, ИП, малые агентства в России.  
**Боль:** Люди тратят 2–4 часа на каждое КП вручную.  
**Решение:** 6 полей → DeepSeek генерирует → красивый PDF.  
**Монетизация:** 3 бесплатных КП → подписка 990₽/мес.  
**Цель:** Минимальный MVP за 7 дней, выйти на первые продажи.

---

## 🛠️ Технический стек

```
Frontend:   Next.js 14 (App Router), TypeScript, Tailwind CSS
AI:         DeepSeek API (deepseek-chat)
PDF:        @react-pdf/renderer
Auth:       NextAuth.js + Resend (magic link на email)
База:       Vercel KV (счётчики КП на пользователя)
Деплой:     Vercel (автодеплой из GitHub)
Домен:      reg.ru → Vercel DNS
Оплата:     ЮКасса (пока заглушка в MVP)
```

---

## 📁 Структура проекта

```
kp-za-30/
├── app/
│   ├── page.tsx              ← лендинг + форма генерации
│   ├── result/page.tsx       ← предпросмотр + скачивание PDF
│   ├── dashboard/page.tsx    ← личный кабинет
│   ├── login/page.tsx        ← авторизация
│   └── api/
│       ├── generate/route.ts ← POST: принять форму → DeepSeek → вернуть КП
│       ├── pdf/route.ts      ← GET: сгенерировать PDF
│       └── auth/[...nextauth]/route.ts
├── components/
│   ├── KpForm.tsx            ← форма 6 полей
│   ├── KpPreview.tsx         ← HTML-превью КП
│   ├── TemplateSelector.tsx  ← выбор из 3 шаблонов PDF
│   ├── UpsellBanner.tsx      ← баннер при исчерпании лимита
│   └── pdf/
│       ├── ClassicTemplate.tsx
│       ├── DarkTemplate.tsx
│       └── MinimalTemplate.tsx
├── lib/
│   ├── deepseek.ts           ← вызов DeepSeek API
│   ├── parseKpResponse.ts    ← парсинг XML из DeepSeek
│   ├── kv.ts                 ← работа с Vercel KV (счётчики)
│   └── auth.ts               ← NextAuth config
├── .claude/
│   └── skills/               ← скиллы для Claude Code
├── .env.local                ← API ключи (НЕ коммитить в git!)
├── CLAUDE.md                 ← этот файл
└── README.md
```

---

## 🔑 Переменные окружения

### Vercel Dashboard (Production) — ВСЕ НАСТРОЕНЫ ✅
| Переменная | Статус | Источник |
|-----------|--------|---------|
| `DEEPSEEK_API_KEY` | ✅ Добавлена | platform.deepseek.com |
| `NEXTAUTH_SECRET` | ✅ Добавлена | случайная строка |
| `RESEND_API_KEY` | ✅ Добавлена | resend.com |
| `KV_REST_API_URL` | ✅ Авто (Upstash) | Vercel Storage → KV |
| `KV_REST_API_TOKEN` | ✅ Авто (Upstash) | Vercel Storage → KV |
| `KV_REST_API_READ_ONLY_TOKEN` | ✅ Авто (Upstash) | Vercel Storage → KV |
| `KV_URL` | ✅ Авто (Upstash) | Vercel Storage → KV |
| `REDIS_URL` | ✅ Авто (Upstash) | Vercel Storage → KV |
| `TELEGRAM_BOT_TOKEN` | ✅ Добавлена | @BotFather |
| `CRON_SECRET` | ✅ Добавлена | случайная строка |

### Для локальной разработки (.env.local)
```env
DEEPSEEK_API_KEY=          # из Vercel env vars
NEXTAUTH_SECRET=           # из Vercel env vars
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=            # из Vercel env vars
KV_REST_API_URL=           # из Vercel env vars
KV_REST_API_TOKEN=         # из Vercel env vars
TELEGRAM_BOT_TOKEN=        # из Vercel env vars
CRON_SECRET=               # из Vercel env vars
```

### Telegram webhook (регистрируется 1 раз после деплоя)
```
https://kp-za-30.vercel.app/api/telegram?setup=1&token=ЗНАЧЕНИЕ_CRON_SECRET
```

---

## 🧠 Ключевые решения (почему так, а не иначе)

| Решение | Причина |
|---------|---------|
| DeepSeek вместо OpenAI | В 10 раз дешевле, качество достаточное для КП |
| XML-теги в ответе DeepSeek | Надёжный парсинг, не ломается при изменении форматирования |
| Vercel KV вместо PostgreSQL | Нет необходимости в полноценной БД для MVP |
| Magic link вместо пароля | Проще UX, нет проблем с "забыл пароль" |
| 3 бесплатных КП | Достаточно чтобы оценить продукт, мотивирует к оплате |

---

## 📋 Скиллы (правила для Claude)

При работе с UI всегда использовать:
```
skill: frontend-design-kp-saas
```
→ файл: `.claude/skills/SKILL-frontend-design-kp-saas.md`

При написании тестов:
```
skill: playwright-kp-testing
```
→ файл: `.claude/skills/SKILL-playwright-kp-testing.md`

При создании MCP-серверов для API:
```
skill: mcp-builder-kp-integrations
```
→ файл: `.claude/skills/SKILL-mcp-builder-kp-integrations.md`

---

## 📍 Текущий статус

**Дата последнего обновления:** 2026-03-19

### ✅ Сделано:
- [x] Создана структура проекта Next.js 14
- [x] DeepSeek промт с XML-выводом (`lib/deepseek.ts`)
- [x] Форма генерации (6 полей) — `app/page.tsx`
- [x] API route `/api/generate` — `app/api/generate/route.ts`
- [x] Парсинг XML-ответа — `lib/parseKpResponse.ts`
- [x] Страница /result с превью КП
- [x] **Тон КП** — радиокнопки Официальный/Дружелюбный/Агрессивный (меняет промт)
- [x] **Логотип компании** — upload в форме, base64 в sessionStorage, показывается в шапке КП
- [x] **Копировать текст** — кнопка на /result, копирует весь текст в буфер
- [x] **Редактирование КП** — режим правки на /result без повторного вызова DeepSeek
- [x] **История КП** — последние 5 в localStorage, отображаются на главной
- [x] **4 шаблона PDF** — Classic, Modern, Minimal, VIP (тёмно-синий с золотом)
- [x] **4 MCP-сервера** — DeepSeek, Vercel KV, ЮКасса (mock), Resend (email)
- [x] **Fix: парсер XML** — `extractTagFallback` принимает `<desc>` и `<description>`, timeline fallback на плоский текст
- [x] **Fix: tsconfig.json** — исключён `mcp-servers/` из TypeScript компиляции Next.js (фикс падения Vercel build)
- [x] **Деплой на Vercel** — репозиторий `github.com/barisovna/kp-za-30`, автодеплой настроен
- [x] **Playwright тесты** — 32 теста, **100% pass (32/32)**: форма, генерация, шаблоны, редактирование, ошибки, логотип, тон. `mockGenerateSuccess` устанавливает localStorage-флаги для подавления модалок EmailCapture и DailyTip.
- [x] **[F13] Социальное доказательство** — счётчик КП в Hero (Vercel KV + seed), 3 отзыва внизу страницы
- [x] **[F14] Демо без регистрации** — 2 поля + стриминг первых абзацев КП, CTA после демо, API `/api/demo`
- [x] **[F07] Онбординг** — предзаполненная форма с примером при первом посещении (localStorage флаг) + жёлтый баннер-подсказка над формой, `kp_onboarded` записывается после первой генерации
- [x] **[F06] Личный кабинет** — `/dashboard`: история всех КП (до 20), статусы (Черновик/Отправлено/Принято/Отклонено), удаление с подтверждением, фильтры, статистика, ссылка из хедера
- [x] **[F01] Тарифная система — Вариант A «Пакетная модель»** — полная реализация:
  - `lib/credits.ts` — единый модуль: типы, константы, getCredits/applyPayment/decrementCredit/canUseTemplate
  - 3 пакета: Старт 199₽ (10 КП, 60 дн, 3 ВИП + 3 Совр), Активный 490₽ (30 КП, 90 дн, все шаблоны), Безлимит 790₽/мес
  - Бесплатно: только Классика + Минимализм. ВИП + Современный — платно
  - PaywallModal с 3 пакетами на главной; ResultPaywall на странице результата
  - Локи на шаблонах с бейджем PRO и счётчиком оставшихся premium-использований
  - sessionStorage `kp_premium_used` — одно КП не сжигает 2 premium-кредита при переключении
  - Динамический счётчик с названием плана в хедере главной и дашборда
  - `npm run build` — ✅ 0 ошибок

- [x] **[F05] Триггерные уведомления** — полная реализация:
  - `lib/notifications.ts` — утилиты: updateLastKpDate, getInactivityDays, getActiveBanner, shouldShowDailyTip
  - `app/api/notifications/subscribe/route.ts` — POST сохраняет email в Vercel KV; PATCH обновляет дату последнего КП
  - `app/api/notifications/cron/route.ts` — Vercel Cron (07:00 UTC ежедневно): проверяет инактивность 7/14 дней и срок подписки, шлёт email через Resend
  - `vercel.json` — расписание cron `0 7 * * *`
  - In-app: `NotificationBanner` (инактивность 7/14 дней + истечение подписки за 3 дня)
  - In-app: `EmailCaptureModal` — захват email после первого КП для email-напоминаний
  - In-app: `DailyTipModal` — совет по отправке КП 1 раз в сутки после генерации
  - Graceful degradation: без RESEND_API_KEY / KV — всё работает, только email не уходит
  - **Нужно настроить:** RESEND_API_KEY в Vercel → Settings → Environment Variables
- [x] **[F02] Годовая подписка** — полная реализация:
  - `lib/credits.ts` — добавлен plan `yearly` (6 490 ₽, 365 дней, −32%)
  - PaywallModal — переключатель Мес/Год с отображением экономии 1 900 ₽
  - `dashboard/page.tsx` — баннер «Перейди на год» для месячных подписчиков (показывается когда осталось < 17 дней)
  - Mock API поддерживает тип `yearly`

- [x] **[F08] Telegram-бот** — полная реализация:
  - `app/api/telegram/route.ts` — webhook handler
  - Команды: /start, /kp (wizard 6 вопросов + выбор тона), /cancel, /help
  - Сессии в Vercel KV (TTL 1 час): `tg:session:{chatId}`
  - Генерация КП через DeepSeek → форматирование → отправка в чат
  - Регистрация webhook: GET /api/telegram?setup=1&token=CRON_SECRET
  - **Нужно настроить:** TELEGRAM_BOT_TOKEN в Vercel env vars + зарегистрировать webhook

- [x] **[F04] Партнёрская программа** — полная реализация:
  - `lib/referral.ts` — генерация кодов, KV-хранение, трекинг кликов/конверсий
  - `app/api/referral/route.ts` — POST создать/найти, GET статистика
  - `app/partner/page.tsx` — страница партнёра (получить ссылку, посмотреть статистику)
  - `app/ref/page.tsx` — реферальный редирект (/ref?code=X → сохраняет cookie → главная)
  - Ссылка в футере главной страницы
  - 20% комиссия с каждой оплаты реферала, cookie 90 дней

- [x] **VOICE Голосовой ввод** — полная реализация:
  - Используется **бесплатный Web Speech API** (встроен в Chrome/Edge — никаких ключей не нужно!)
  - Кнопки 🎤 рядом с каждым полем формы (companyName, clientName, service, advantages)
  - Нажать 🎤 → говорить по-русски → поле заполняется автоматически
  - Нажать ⏹ Стоп — остановить запись досрочно
  - Graceful degradation: в Firefox/Safari показывает подсказку открыть Chrome
  - **API ключи НЕ нужны** — работает без настройки

### 🔄 Статус спринта запуска (2026-03-19):

**7-дневный sprint: Дни 1–6 выполнены.**

- **День 1** ✅ Баги исправлены, ESLint настроен, Playwright 32/32, .gitignore расширен
- **День 2** ✅ Magic link auth (`lib/auth-magic.ts`), серверные кредиты (`lib/user-kv.ts`)
- **День 3** ✅ ЮКасса интеграция (real + mock fallback), webhook, /payment/success
- **День 4** ✅ Серверная история КП: `/api/kp/[id]`, /result восстанавливается после refresh
- **День 5** ✅ E2E тесты 46/46: auth, payment, plan-expiry
- **День 6** ✅ `/terms`, `/privacy`, блок поддержки (medicalx@bk.ru), Vercel Analytics, KV подключён локально, auth-magic graceful degradation
- **День 7** ⏳ Верификация домена Resend → реальные письма, smoke-test production

### 📁 Реальная структура (актуальная):

```
app/
├── page.tsx              ← лендинг + форма + модалки (~1150 строк)
├── result/page.tsx       ← результат + шаблоны + редактор (~920 строк)
├── dashboard/page.tsx    ← история КП (server + localStorage fallback)
├── partner/page.tsx      ← партнёрская программа
├── ref/page.tsx          ← реферальный редирект
├── unsubscribe/page.tsx  ← отписка от email (NEW)
├── payment/success/page.tsx ← возврат после ЮКасса (NEW)
└── api/
    ├── generate/         ← DeepSeek + сохраняет в KV + возвращает kpId
    ├── kp/[id]/          ← GET конкретного КП (NEW)
    ├── payment/mock/     ← mock оплата (fallback)
    ├── payment/yookassa/ ← реальная ЮКасса (NEW)
    ├── webhooks/yookassa/← webhook payment.succeeded (NEW)
    ├── user/credits/     ← серверные кредиты (NEW)
    ├── user/history/     ← история КП CRUD
    ├── auth/magic/       ← magic link auth (NEW)
    ├── auth/me/          ← текущий пользователь (NEW)
    ├── notifications/    ← email подписка + cron
    └── referral/         ← партнёрка

lib/
├── credits.ts      ← тарифы, кредиты, localStorage
├── user-kv.ts      ← серверное хранение (Vercel KV)
├── auth-magic.ts   ← magic link логика (NEW)
├── yookassa.ts     ← ЮКасса API client (NEW)
├── deepseek.ts     ← AI генерация
├── referral.ts     ← партнёрская программа
├── notifications.ts← email уведомления
└── parseKpResponse.ts ← XML парсер
```

### 📌 Следующий шаг — День 5:
1. **E2E тесты** — auth flow, оплата (mock webhook), истечение плана
2. **Закрыть build + lint + e2e в зелёный**
3. **День 6** — лендинг, юридика, аналитика, production env

### ⚠️ Известные особенности:
- DeepSeek иногда использует `<description>` вместо `<desc>` — парсер обрабатывает оба варианта
- DeepSeek иногда возвращает `<timeline>` как плоский текст — парсер разбивает по нумерованным пунктам
- `mcp-servers/` — отдельные Node.js скрипты, НЕ часть Next.js билда; запускаются через `npx tsx`

---

## ⚡ Команды — запоминай и используй

### Локальная разработка (терминал VSCode: Ctrl + `)
```bash
# Установить зависимости (первый раз или после npm install)
npm install

# Запустить проект локально
npm run dev
# Открой браузер: http://localhost:3000

# Сборка для проверки ошибок
npm run build

# Линтер
npm run lint
```

### Git (сохранить изменения)
```bash
# Посмотреть что изменилось
git status

# Добавить все изменения
git add .

# Сохранить с комментарием
git commit -m "описание что сделал"

# Отправить на GitHub (и автодеплой на Vercel)
git push
```

### Vercel (деплой и настройка)
```bash
# Первый деплой (нужен Vercel CLI: npm i -g vercel)
vercel

# Продакшен деплой
vercel --prod

# Посмотреть переменные окружения
vercel env ls

# Добавить переменную окружения
vercel env add DEEPSEEK_API_KEY

# Посмотреть логи
vercel logs
```

### Если что-то сломалось
```bash
# Удалить node_modules и переустановить
rm -rf node_modules && npm install

# Очистить кэш Next.js
rm -rf .next && npm run dev
```

---

## 🏗️ Архитектурные правила

**Код:**
- Все компоненты на TypeScript (не .js файлы)
- Стили только через Tailwind CSS классы
- API routes в папке `app/api/`
- Утилиты в папке `lib/`

**Безопасность:**
- Никогда не коммитить `.env.local` в git
- `.env.local` уже в `.gitignore`
- Все секреты через переменные окружения Vercel

**DeepSeek:**
- Всегда использовать промт из `lib/deepseek.ts`
- Температура: 0.7, max_tokens: 1200
- Парсить ответ через `lib/parseKpResponse.ts`

**Лимиты КП:**
- Ключ в Vercel KV: `kp_count:{userId}`
- При первой авторизации: установить 3
- Декрементировать ТОЛЬКО при успешной генерации
- При ошибке DeepSeek: не декрементировать

---

## 🎨 Дизайн-правила

- Цвет primary: `#1e3a5f` (тёмно-синий)
- Цвет accent/CTA: `#f59e0b` (янтарный)
- Цвет success/PDF: `#10b981` (зелёный)
- Фон: `#f8fafc` (светлый нейтральный)
- Текст: `#1e293b` (не чёрный)
- Шрифты: Geologica (заголовки) + Nunito Sans (текст)
- Кнопки: height 56px на мобильном, 48px на десктопе
- Форма: все поля 100% ширины, gap 16px

---

## 🤖 Инструкции для Claude (как меня направлять)

Claude, при работе над этим проектом ты должен:

1. **Всегда начинать с диагностики**: прочитай CLAUDE.md, пойми текущий статус, предложи что делать дальше.

2. **После каждого изменения давать команды**: какие команды запустить в терминале чтобы применить изменения. Формат:
   ```
   📋 Команды для применения:
   npm run dev       ← запусти чтобы проверить
   git add .         ← сохранить изменения
   git commit -m "..." ← зафиксировать
   ```

3. **Предлагать улучшения**: если видишь что можно сделать лучше — скажи. Например: "Кстати, здесь можно добавить loading skeleton — улучшит UX".

4. **Объяснять новичку**: если я делаю что-то первый раз, объясни зачем и что произойдёт.

5. **Обновлять CLAUDE.md**: после выполнения задачи скажи что нужно обновить в этом файле.

6. **Следить за MVP**: если задача выходит за рамки MVP — предупреди. Напомни что цель — запустить быстро.

7. **Использовать скиллы**: для UI — `frontend-design-kp-saas`, для тестов — `playwright-kp-testing`, для MCP — `mcp-builder-kp-integrations`.

---

## 📞 Как спрашивать Claude о следующем шаге

Просто напиши одно из:
- `что делаем дальше?`
- `следующий шаг по плану?`
- `что нужно реализовать сегодня?`
- `проверь статус проекта`

Claude прочитает этот файл и даст конкретный список задач.
