import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "yookassa-kp",
  version: "1.0.0",
});

// ──────────────────────────────────────────────
// Режим работы: MOCK (MVP) → REAL (после подключения ЮКасса)
// Переключение: YUKASSA_MODE=real в .env.local
// ──────────────────────────────────────────────
const isMock = process.env.YUKASSA_MODE !== "real";

// Хранилище платежей (только для mock-режима, в памяти)
const mockPayments: Record<
  string,
  {
    id: string;
    status: "pending" | "succeeded" | "cancelled";
    amount: number;
    description: string;
    userId: string;
    createdAt: string;
    confirmationUrl: string;
  }
> = {};

async function yukassaRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;

  if (!shopId || !secretKey || shopId === "test") {
    throw new Error(
      "YUKASSA_SHOP_ID / YUKASSA_SECRET_KEY не настроены.\n" +
        "Зарегистрируйся на yookassa.ru и получи ключи в настройках магазина."
    );
  }

  const credentials = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  const idempotenceKey = `kp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const resp = await fetch(`https://api.yookassa.ru/v3${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    throw new Error(`ЮКасса API ошибка ${resp.status}: ${await resp.text()}`);
  }

  return resp.json();
}

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 1: create_payment
// ──────────────────────────────────────────────
server.registerTool(
  "create_payment",
  {
    description:
      "Создаёт платёж на подписку 990₽/мес. В mock-режиме возвращает тестовый URL.",
    inputSchema: z.object({
      amount: z
        .number()
        .default(990)
        .describe("Сумма в рублях (по умолчанию 990 — стандартная подписка)"),
      description: z
        .string()
        .default("Подписка КП за 30 секунд — 1 месяц")
        .describe("Описание платежа"),
      userId: z.string().describe("ID пользователя (email)"),
      returnUrl: z
        .string()
        .default("http://localhost:3000/dashboard")
        .describe("URL для редиректа после оплаты"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ amount, description, userId, returnUrl }) => {
    if (isMock) {
      const id = `mock_${Date.now()}`;
      const confirmationUrl = `https://yookassa.ru/checkout/payments/${id}`;
      mockPayments[id] = {
        id,
        status: "pending",
        amount,
        description,
        userId,
        createdAt: new Date().toISOString(),
        confirmationUrl,
      };

      return {
        content: [
          {
            type: "text",
            text: `🧪 MOCK-режим (реальные платежи не создаются)\n\nПлатёж создан:\n  ID: ${id}\n  Сумма: ${amount} ₽\n  Пользователь: ${userId}\n  URL оплаты: ${confirmationUrl}\n\nДля перехода в реальный режим:\n  Добавь в .env.local: YUKASSA_MODE=real\n  Укажи настоящие YUKASSA_SHOP_ID и YUKASSA_SECRET_KEY`,
          },
        ],
      };
    }

    const data = (await yukassaRequest("POST", "/payments", {
      amount: { value: amount.toFixed(2), currency: "RUB" },
      confirmation: { type: "redirect", return_url: returnUrl },
      capture: true,
      description,
      metadata: { userId },
    })) as {
      id: string;
      confirmation: { confirmation_url: string };
      status: string;
    };

    return {
      content: [
        {
          type: "text",
          text: `✅ Платёж создан в ЮКасса!\n  ID: ${data.id}\n  Статус: ${data.status}\n  URL оплаты: ${data.confirmation.confirmation_url}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 2: check_payment_status
// ──────────────────────────────────────────────
server.registerTool(
  "check_payment_status",
  {
    description: "Проверяет статус платежа по ID.",
    inputSchema: z.object({
      paymentId: z.string().describe("ID платежа"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ paymentId }) => {
    if (isMock) {
      const payment = mockPayments[paymentId];
      if (!payment) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Платёж ${paymentId} не найден в mock-хранилище.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `🧪 MOCK: Платёж ${paymentId}\n  Статус: ${payment.status}\n  Сумма: ${payment.amount} ₽\n  Пользователь: ${payment.userId}\n  Создан: ${payment.createdAt}`,
          },
        ],
      };
    }

    const data = (await yukassaRequest("GET", `/payments/${paymentId}`)) as {
      id: string;
      status: string;
      amount: { value: string };
    };
    return {
      content: [
        {
          type: "text",
          text: `Платёж ${data.id}:\n  Статус: ${data.status}\n  Сумма: ${data.amount.value} ₽`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 3: simulate_payment_success (только mock)
// ──────────────────────────────────────────────
server.registerTool(
  "simulate_payment_success",
  {
    description:
      "🧪 ТОЛЬКО MOCK: симулирует успешную оплату — меняет статус платежа на succeeded. Полезно для тестирования логики после оплаты.",
    inputSchema: z.object({
      paymentId: z.string().describe("ID mock-платежа"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ paymentId }) => {
    if (!isMock) {
      return {
        content: [
          {
            type: "text",
            text: "❌ Этот инструмент доступен только в mock-режиме (YUKASSA_MODE=mock).",
          },
        ],
      };
    }

    if (!mockPayments[paymentId]) {
      return {
        content: [
          { type: "text", text: `❌ Платёж ${paymentId} не найден.` },
        ],
      };
    }

    mockPayments[paymentId].status = "succeeded";
    return {
      content: [
        {
          type: "text",
          text: `✅ Симулирована успешная оплата!\n  ID: ${paymentId}\n  Статус: succeeded\n  Пользователь: ${mockPayments[paymentId].userId}\n\nТеперь проверь что подписка активировалась в твоём приложении.`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 4: list_payments
// ──────────────────────────────────────────────
server.registerTool(
  "list_payments",
  {
    description: "Показывает историю платежей пользователя.",
    inputSchema: z.object({
      userId: z.string().optional().describe("Фильтр по userId (оставь пустым — все)"),
      limit: z.number().default(10).describe("Количество записей"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ userId, limit }) => {
    if (isMock) {
      const all = Object.values(mockPayments)
        .filter((p) => !userId || p.userId === userId)
        .slice(0, limit);

      if (all.length === 0) {
        return {
          content: [{ type: "text", text: "ℹ️ Платежей пока нет." }],
        };
      }

      const rows = all.map(
        (p) =>
          `  ${p.id} | ${p.status.padEnd(10)} | ${p.amount} ₽ | ${p.userId}`
      );
      return {
        content: [
          {
            type: "text",
            text: `🧪 MOCK-платежи (${all.length}):\n\n${rows.join("\n")}`,
          },
        ],
      };
    }

    const params = new URLSearchParams({ limit: String(limit) });
    const data = (await yukassaRequest(
      "GET",
      `/payments?${params}`
    )) as { items: Array<{ id: string; status: string; amount: { value: string }; metadata?: { userId: string } }> };

    const items = (data.items ?? []).filter(
      (p) => !userId || p.metadata?.userId === userId
    );

    const rows = items.map(
      (p) =>
        `  ${p.id} | ${p.status.padEnd(10)} | ${p.amount.value} ₽ | ${p.metadata?.userId ?? "?"}`
    );

    return {
      content: [
        {
          type: "text",
          text: `Платежи (${items.length}):\n\n${rows.join("\n") || "Нет записей"}`,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
