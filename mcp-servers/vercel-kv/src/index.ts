import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "vercel-kv-kp",
  version: "1.0.0",
});

// ──────────────────────────────────────────────
// Работа с Vercel KV через REST API
// Ключи: kp_count:{userId} — остаток бесплатных КП
// ──────────────────────────────────────────────
async function kvRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "KV_REST_API_URL или KV_REST_API_TOKEN не заданы в .env.local.\n" +
        "Получи их в Vercel Dashboard → Storage → KV."
    );
  }

  const resp = await fetch(`${url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    throw new Error(`Vercel KV ошибка ${resp.status}: ${await resp.text()}`);
  }

  return resp.json();
}

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 1: get_kp_count
// ──────────────────────────────────────────────
server.registerTool(
  "get_kp_count",
  {
    description:
      "Показывает сколько бесплатных КП осталось у пользователя (ключ: kp_count:{userId}).",
    inputSchema: z.object({
      userId: z.string().describe("ID пользователя (email или session ID)"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ userId }) => {
    const key = `kp_count:${userId}`;
    const data = (await kvRequest("GET", `/get/${key}`)) as { result: string | null };
    const count = data.result !== null ? parseInt(data.result) : null;

    return {
      content: [
        {
          type: "text",
          text:
            count === null
              ? `ℹ️ Пользователь ${userId} не найден в KV.\nПри первом входе будет установлено 3 бесплатных КП.`
              : `📊 Пользователь: ${userId}\nОсталось КП: ${count} из 3\nКлюч в KV: ${key}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 2: set_kp_count
// ──────────────────────────────────────────────
server.registerTool(
  "set_kp_count",
  {
    description:
      "Устанавливает счётчик КП вручную. Используй при тестировании: set 3 = сброс лимита, set 0 = симуляция исчерпанного лимита.",
    inputSchema: z.object({
      userId: z.string().describe("ID пользователя"),
      count: z.number().min(0).max(100).describe("Новое значение счётчика (0-100)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ userId, count }) => {
    const key = `kp_count:${userId}`;
    await kvRequest("POST", `/set/${key}/${count}`);
    return {
      content: [
        {
          type: "text",
          text: `✅ Счётчик установлен.\nПользователь: ${userId}\nНовое значение: ${count}\nКлюч: ${key}\n\n${count === 0 ? "⚠️ Лимит исчерпан — пользователь увидит баннер оплаты." : count === 3 ? "✨ Лимит сброшен до максимума." : ""}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 3: list_users
// ──────────────────────────────────────────────
server.registerTool(
  "list_users",
  {
    description:
      "Показывает всех пользователей с их счётчиками КП. Полезно при отладке.",
    inputSchema: z.object({
      limit: z.number().min(1).max(100).default(20).describe("Максимум записей"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ limit }) => {
    const data = (await kvRequest("GET", `/keys/kp_count:*`)) as {
      result: string[];
    };
    const keys = (data.result ?? []).slice(0, limit);

    if (keys.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "ℹ️ Пользователей в KV пока нет. Счётчики создаются при первой авторизации.",
          },
        ],
      };
    }

    // Получаем значения для всех ключей
    const rows: string[] = [];
    for (const key of keys) {
      const val = (await kvRequest("GET", `/get/${key}`)) as { result: string };
      const userId = key.replace("kp_count:", "");
      rows.push(`  ${userId.padEnd(30)} → ${val.result ?? "?"} КП`);
    }

    return {
      content: [
        {
          type: "text",
          text: `👥 Пользователи (${keys.length} из max ${limit}):\n\n${rows.join("\n")}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 4: reset_all_counters
// ──────────────────────────────────────────────
server.registerTool(
  "reset_all_counters",
  {
    description:
      "⚠️ ТОЛЬКО ДЛЯ DEV! Сбрасывает счётчики всех пользователей до 3. Не использовать на продакшене.",
    inputSchema: z.object({
      confirm: z
        .literal("ДА_СБРОСИТЬ_ВСЕ")
        .describe('Введи "ДА_СБРОСИТЬ_ВСЕ" для подтверждения'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  async ({ confirm: _ }) => {
    const data = (await kvRequest("GET", `/keys/kp_count:*`)) as {
      result: string[];
    };
    const keys = data.result ?? [];

    let resetCount = 0;
    for (const key of keys) {
      await kvRequest("POST", `/set/${key}/3`);
      resetCount++;
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Сброшено ${resetCount} счётчиков.\nВсем пользователям восстановлено 3 бесплатных КП.`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 5: check_kv_connection
// ──────────────────────────────────────────────
server.registerTool(
  "check_kv_connection",
  {
    description: "Проверяет подключение к Vercel KV и корректность API ключей.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ Переменные окружения не заданы.\n\nКак настроить:\n1. Открой vercel.com → Storage → Create KV Database\n2. Скопируй KV_REST_API_URL и KV_REST_API_TOKEN\n3. Добавь в kp-za-30/.env.local",
          },
        ],
      };
    }

    try {
      await kvRequest("POST", `/set/test_connection/ok`);
      await kvRequest("GET", `/get/test_connection`);
      return {
        content: [
          {
            type: "text",
            text: `✅ Vercel KV подключён!\nURL: ${url.slice(0, 40)}…\nТокен: ${token.slice(0, 8)}…`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `❌ Ошибка подключения: ${e}` }],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
