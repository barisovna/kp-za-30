import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "deepseek-kp",
  version: "1.0.0",
});

// ──────────────────────────────────────────────
// Схема данных формы КП
// ──────────────────────────────────────────────
const KP_FORM_SCHEMA = z.object({
  companyName: z.string().describe("Название вашей компании или ИП"),
  clientName: z.string().describe("Название компании клиента"),
  service: z.string().describe("Услуга или продукт"),
  price: z.string().describe("Стоимость (например: 50 000 ₽)"),
  deadline: z.string().describe("Срок выполнения (например: 14 дней)"),
  advantages: z.string().describe("Ключевые преимущества через запятую"),
  tone: z
    .enum(["official", "friendly", "aggressive"])
    .default("official")
    .describe("Тон: official | friendly | aggressive"),
});

const TONE_MAP = {
  official:
    "Стиль: официально-деловой. Строгий, профессиональный язык без эмоций.",
  friendly:
    "Стиль: дружелюбный, живой. Пиши как партнёр партнёру — тепло, без канцеляризмов.",
  aggressive:
    "Стиль: агрессивные продажи. Давление на боли клиента, срочность, сильные глаголы.",
};

function buildPrompt(
  formData: z.infer<typeof KP_FORM_SCHEMA>,
  systemPromptOverride?: string
): { system: string; user: string } {
  const toneInstruction = TONE_MAP[formData.tone];
  const system =
    systemPromptOverride ??
    `Ты — эксперт по написанию коммерческих предложений для российского бизнеса.
Создай детальное, профессиональное КП на 2 страницы A4.
${toneInstruction}
Верни ответ строго в XML-формате с тегами: <kp>, <title>, <greeting>, <about>, <offer>, <benefits>, <benefitCards>, <priceItems>, <priceTotal>, <timeline>, <conditions>, <price>, <deadline>, <cta>, <signature>.`;

  const user = `Наша компания: ${formData.companyName}
Клиент: ${formData.clientName}
Услуга/продукт: ${formData.service}
Стоимость: ${formData.price}
Срок: ${formData.deadline}
Преимущества: ${formData.advantages}`;

  return { system, user };
}

async function callDeepSeek(
  system: string,
  user: string,
  temperature = 0.7,
  maxTokens = 3500
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY не задан. Добавь в .env.local или переменные окружения."
    );
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `DeepSeek API ошибка ${response.status}: ${err.slice(0, 200)}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "Пустой ответ от DeepSeek";
}

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 1: generate_kp
// ──────────────────────────────────────────────
server.registerTool(
  "generate_kp",
  {
    description:
      "Генерирует полное КП через DeepSeek API. Можно передать свой системный промт для A/B теста.",
    inputSchema: z.object({
      formData: KP_FORM_SCHEMA,
      systemPrompt: z
        .string()
        .optional()
        .describe("Свой системный промт (оставь пустым — использует стандартный)"),
      temperature: z.number().min(0).max(2).default(0.7),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ formData, systemPrompt, temperature }) => {
    const { system, user } = buildPrompt(formData, systemPrompt);
    const result = await callDeepSeek(system, user, temperature);
    return {
      content: [
        {
          type: "text",
          text: `✅ КП сгенерировано (температура: ${temperature})\n\n${result}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 2: test_prompt_scenarios
// ──────────────────────────────────────────────
server.registerTool(
  "test_prompt_scenarios",
  {
    description:
      "Тестирует промт на 3 стандартных сценариях: фрилансер, агентство, edge-кейс (минимум полей).",
    inputSchema: z.object({
      systemPrompt: z
        .string()
        .optional()
        .describe("Системный промт для тестирования (оставь пустым — стандартный)"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ systemPrompt }) => {
    const scenarios: z.infer<typeof KP_FORM_SCHEMA>[] = [
      {
        companyName: "Иван Козлов, фрилансер",
        clientName: "Стоматология «Улыбка»",
        service: "Редизайн сайта",
        price: "от 80 000 ₽",
        deadline: "21 день",
        advantages: "Опыт 7 лет, 80+ проектов, сдаю в срок, поддержка 6 мес.",
        tone: "friendly",
      },
      {
        companyName: "Digital Hub Agency",
        clientName: "Сеть фитнес-клубов Москвы",
        service: "Таргетированная реклама ВКонтакте",
        price: "от 35 000 ₽/мес",
        deadline: "лиды через 7 дней",
        advantages:
          "4 года в фитнесе, лид в 3 раза дешевле рынка, KPI с гарантией",
        tone: "aggressive",
      },
      {
        companyName: "ООО Ромашка",
        clientName: "ИП Петров",
        service: "Бухгалтерские услуги",
        price: "5 000 ₽/мес",
        deadline: "постоянно",
        advantages: "Опыт 10 лет",
        tone: "official",
      },
    ];

    const results: string[] = [];
    for (const scenario of scenarios) {
      const label = `${scenario.companyName} → ${scenario.clientName} (${scenario.service})`;
      try {
        const { system, user } = buildPrompt(scenario, systemPrompt);
        const text = await callDeepSeek(system, user, 0.7, 1500);
        results.push(`━━━ ${label} ━━━\n${text.slice(0, 600)}…\n`);
      } catch (e) {
        results.push(`━━━ ${label} ━━━\n❌ ОШИБКА: ${e}\n`);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `📊 Результаты тестирования промта на 3 сценариях:\n\n${results.join("\n")}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 3: compare_prompts
// ──────────────────────────────────────────────
server.registerTool(
  "compare_prompts",
  {
    description:
      "Сравнивает два промта (A/B тест) на одних и тех же данных. Помогает выбрать лучший вариант.",
    inputSchema: z.object({
      promptA: z.string().describe("Вариант A системного промта"),
      promptB: z.string().describe("Вариант B системного промта"),
      formData: KP_FORM_SCHEMA,
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ promptA, promptB, formData }) => {
    const { user } = buildPrompt(formData);

    const [resultA, resultB] = await Promise.all([
      callDeepSeek(promptA, user, 0.7, 2000),
      callDeepSeek(promptB, user, 0.7, 2000),
    ]);

    return {
      content: [
        {
          type: "text",
          text: `🔬 A/B СРАВНЕНИЕ ПРОМТОВ\n\n▶ ВАРИАНТ A:\n${resultA.slice(0, 1000)}…\n\n▶ ВАРИАНТ B:\n${resultB.slice(0, 1000)}…\n\nВыбери лучший и скажи мне — обновлю deepseek.ts.`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 4: check_api_key
// ──────────────────────────────────────────────
server.registerTool(
  "check_api_key",
  {
    description:
      "Проверяет что DEEPSEEK_API_KEY задан и работает (отправляет минимальный запрос).",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "❌ DEEPSEEK_API_KEY не найден.\n\nКак добавить:\n1. Открой файл kp-za-30/.env.local\n2. Добавь строку: DEEPSEEK_API_KEY=sk-xxxxxxx\n3. Перезапусти npm run dev",
          },
        ],
      };
    }

    try {
      const resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: "Ответь одним словом: привет" }],
          max_tokens: 10,
        }),
      });

      if (!resp.ok) {
        return {
          content: [
            {
              type: "text",
              text: `❌ API ключ задан, но запрос вернул ${resp.status}.\nВозможно ключ неверный или нет баланса на счету DeepSeek.`,
            },
          ],
        };
      }

      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content ?? "?";
      return {
        content: [
          {
            type: "text",
            text: `✅ DEEPSEEK_API_KEY работает!\nКлюч: ${apiKey.slice(0, 8)}…${apiKey.slice(-4)}\nОтвет API: "${reply}"`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `❌ Ошибка соединения: ${e}` }],
      };
    }
  }
);

// ──────────────────────────────────────────────
// ЗАПУСК
// ──────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
