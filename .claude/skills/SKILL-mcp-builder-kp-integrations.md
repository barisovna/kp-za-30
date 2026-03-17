---
name: mcp-builder-kp-integrations
description: Создаёт MCP-серверы для интеграций КП-генератора: DeepSeek API, ЮКасса, Vercel KV, Resend (email). Используй когда нужно дать Claude Code прямой доступ к этим API для автоматизации задач разработки и тестирования.
---

# MCP Builder — Интеграции для КП-генератора

## Зачем MCP-серверы для этого проекта

Claude Code с MCP-серверами может:
- **DeepSeek MCP**: тестировать промты прямо в VSCode без запуска сервера
- **ЮКасса MCP**: проверять статус платежей, тестировать webhooks
- **Vercel KV MCP**: просматривать и сбрасывать счётчики КП при разработке
- **Resend MCP**: тестировать magic link письма без настоящего email

---

## MCP-сервер 1: DeepSeek API

### Когда использовать
Итерация промтов без деплоя. Claude Code вызывает DeepSeek напрямую → видишь результат → правишь промт → повторяешь.

### Запрос к Claude Code
```
Создай MCP-сервер для DeepSeek API.
Используй skill: mcp-builder-kp-integrations.
Язык: TypeScript.
Инструменты:
1. generate_kp(systemPrompt, formData) → возвращает сгенерированный текст
2. test_prompt(systemPrompt, testScenario) → тест на одном из 3 сценариев
3. compare_prompts(promptA, promptB, formData) → сравнение двух версий промтов

Документация DeepSeek API: https://api.deepseek.com/docs
API ключ из env: DEEPSEEK_API_KEY
```

### Готовый шаблон сервера

```typescript
// mcp-servers/deepseek/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'deepseek-kp',
  version: '1.0.0',
});

const KP_FORM_DATA_SCHEMA = z.object({
  company: z.string().describe('Название компании/исполнителя'),
  service: z.string().describe('Услуга или продукт'),
  client: z.string().optional().describe('Кому отправляем'),
  pain: z.string().optional().describe('Боль клиента'),
  advantages: z.string().optional().describe('Преимущества через \\n'),
  price: z.string().optional().describe('Стоимость и сроки'),
});

server.registerTool(
  'generate_kp',
  {
    description: 'Генерирует КП через DeepSeek API с заданным системным промтом',
    inputSchema: z.object({
      systemPrompt: z.string().describe('Системный промт'),
      formData: KP_FORM_DATA_SCHEMA,
      temperature: z.number().min(0).max(2).default(0.7),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ systemPrompt, formData, temperature }) => {
    const userPrompt = buildUserPrompt(formData);
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 1200,
      }),
    });
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? 'Ошибка генерации';
    
    return {
      content: [{ type: 'text', text: `РЕЗУЛЬТАТ:\n\n${text}` }],
    };
  }
);

server.registerTool(
  'test_prompt_scenarios',
  {
    description: 'Тестирует промт на трёх стандартных сценариях проекта',
    inputSchema: z.object({
      systemPrompt: z.string(),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ systemPrompt }) => {
    const scenarios = [
      { name: 'Фрилансер-дизайнер', data: { company: 'Иван Козлов', service: 'Редизайн сайта', client: 'Стоматология Улыбка', pain: 'Устаревший сайт, мало клиентов из поиска', advantages: 'Опыт 7 лет\n80+ проектов\nСдаю в срок', price: 'от 80 000₽, 21 день' } },
      { name: 'Агентство', data: { company: 'Digital Hub', service: 'Таргет ВК', client: 'Фитнес-клубы Москвы', pain: 'Дорогой лид, мало записей', advantages: 'Лид в 3 раза дешевле\n4 года в фитнесе\nKPI с гарантией', price: 'от 35 000₽/мес, лиды через 7 дней' } },
      { name: 'Edge-кейс (пустые поля)', data: { company: 'ООО Ромашка', service: 'Бухгалтерские услуги' } },
    ];
    
    const results = await Promise.all(
      scenarios.map(async (s) => {
        const resp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
          body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: buildUserPrompt(s.data) }], max_tokens: 1200 }),
        });
        const d = await resp.json();
        return `--- ${s.name} ---\n${d.choices?.[0]?.message?.content ?? 'ОШИБКА'}`;
      })
    );
    
    return { content: [{ type: 'text', text: results.join('\n\n') }] };
  }
);

function buildUserPrompt(data: Partial<z.infer<typeof KP_FORM_DATA_SCHEMA>>): string {
  return `КОМПАНИЯ: ${data.company ?? ''}
УСЛУГА: ${data.service ?? ''}
КЛИЕНТ: ${data.client ?? '(не указан)'}
БОЛЬ: ${data.pain ?? '(не указана)'}
ПРЕИМУЩЕСТВА: ${data.advantages ?? '(не указаны)'}
СТОИМОСТЬ: ${data.price ?? '(не указана)'}`;
}

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Настройка в Claude Code (.claude/settings.json)
```json
{
  "mcpServers": {
    "deepseek-kp": {
      "command": "node",
      "args": ["./mcp-servers/deepseek/dist/index.js"],
      "env": {
        "DEEPSEEK_API_KEY": "${DEEPSEEK_API_KEY}"
      }
    }
  }
}
```

---

## MCP-сервер 2: Vercel KV (счётчики КП)

### Когда использовать
Отладка логики счётчиков: просмотр текущих значений, сброс для тестирования, ручная установка лимитов.

### Запрос к Claude Code
```
Создай MCP-сервер для Vercel KV.
Используй skill: mcp-builder-kp-integrations.
Инструменты:
1. get_kp_count(userId) → текущий счётчик пользователя
2. set_kp_count(userId, count) → установить счётчик
3. reset_all_counters() → сброс всех счётчиков (только dev)
4. list_users() → список пользователей с их счётчиками

Используй @vercel/kv SDK.
Env: KV_REST_API_URL, KV_REST_API_TOKEN
```

### Ключевые инструменты для разработки

```typescript
// Самые полезные инструменты при разработке:

// 1. Проверить что происходит с конкретным юзером
// Claude Code: "Покажи счётчик для user_abc123"
// → get_kp_count('user_abc123') → 0

// 2. Сбросить счётчик для тестирования happy path
// Claude Code: "Сбрось счётчик для user_abc123 на 3"
// → set_kp_count('user_abc123', 3)

// 3. Симулировать исчерпанный лимит
// Claude Code: "Установи счётчик 0 для тестового юзера"
// → set_kp_count('test_user', 0)
```

---

## MCP-сервер 3: ЮКасса (заглушка → реальная)

### Когда использовать
Фаза 2 (день 4 по таймлайну): подключение реальных платежей.

### Запрос к Claude Code
```
Создай MCP-сервер для ЮКасса API.
Используй skill: mcp-builder-kp-integrations.
Режим: сначала заглушка (mock), потом реальный API.

Инструменты:
1. create_payment(amount, description, userId) → создать платёж, вернуть URL
2. check_payment_status(paymentId) → статус платежа
3. list_payments(userId) → история платежей пользователя

Документация ЮКасса: https://yookassa.ru/developers/api
Env: YUKASSA_SHOP_ID, YUKASSA_SECRET_KEY
```

### Заглушка для MVP (до реального подключения)

```typescript
server.registerTool('create_payment', { ... }, async ({ amount, description, userId }) => {
  // В MVP возвращаем фейковый URL
  const fakePaymentUrl = `https://yookassa.ru/checkout/payments/fake-${Date.now()}`;
  
  console.log(`[MOCK] Создан платёж: ${amount}₽ для ${userId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: `mock_${Date.now()}`,
        status: 'pending',
        amount: { value: amount, currency: 'RUB' },
        confirmation: { type: 'redirect', confirmation_url: fakePaymentUrl },
      })
    }]
  };
});
```

---

## MCP-сервер 4: Resend (magic link email)

### Когда использовать
Тестирование авторизации: отправка тестовых magic link без настоящего SMTP.

### Запрос к Claude Code
```
Создай MCP-сервер для Resend API.
Используй skill: mcp-builder-kp-integrations.
Инструменты:
1. send_magic_link(email, token, baseUrl) → отправить письмо
2. preview_magic_link_email(email, token) → показать HTML письма без отправки
3. list_sent_emails(limit) → последние отправленные письма

Env: RESEND_API_KEY
```

---

## Общая структура проекта с MCP-серверами

```
kp-za-30/
├── mcp-servers/
│   ├── deepseek/
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── vercel-kv/
│   │   └── src/index.ts
│   ├── yookassa/
│   │   └── src/index.ts (заглушка → реальный)
│   └── resend/
│       └── src/index.ts
├── .claude/
│   └── settings.json   ← регистрация всех серверов
└── ...приложение
```

---

## Как добавлять новые интеграции

Шаблон запроса к Claude Code:
```
Создай MCP-сервер для [НАЗВАНИЕ API].
Используй skill: mcp-builder-kp-integrations.
Язык: TypeScript.

Документация API: [URL или текст]
Env переменные: [KEY_NAME=...]

Инструменты:
1. [tool_name](params) → что делает
2. [tool_name](params) → что делает

Добавь сервер в .claude/settings.json.
Создай package.json с build скриптом.
```

---

## Чеклист качества MCP-сервера

- [ ] Каждый инструмент имеет чёткое description на русском
- [ ] Все параметры с типами и describe()
- [ ] Error handling с actionable сообщениями ("Неверный API ключ — проверьте DEEPSEEK_API_KEY в .env")
- [ ] readOnlyHint правильно выставлен (read ≠ write операции)
- [ ] Тест через `npx @modelcontextprotocol/inspector`
- [ ] Добавлен в .claude/settings.json
- [ ] Добавлен npm script: `"build:mcp": "tsc -p mcp-servers/*/tsconfig.json"`
