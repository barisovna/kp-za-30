import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "resend-kp",
  version: "1.0.0",
});

// ──────────────────────────────────────────────
// HTML-шаблон magic link письма
// ──────────────────────────────────────────────
function buildMagicLinkHtml(email: string, magicUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Вход в КП за 30 секунд</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Nunito Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Шапка -->
        <tr>
          <td style="background:#1e3a5f;padding:28px 40px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">⚡ КП за 30 секунд</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:14px;">Генератор коммерческих предложений</p>
          </td>
        </tr>
        <!-- Контент -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;color:#1e293b;font-size:24px;font-weight:700;">Ссылка для входа</h1>
            <p style="margin:0 0 8px;color:#475569;font-size:16px;line-height:1.6;">Привет! Получили запрос на вход для <strong>${email}</strong></p>
            <p style="margin:0 0 32px;color:#64748b;font-size:14px;">Нажми кнопку ниже — и сразу окажешься в личном кабинете. Ссылка действует 15 минут.</p>
            <!-- Кнопка -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td style="background:#f59e0b;border-radius:12px;padding:0;">
                  <a href="${magicUrl}"
                    style="display:block;padding:16px 40px;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;">
                    ⚡ Войти в аккаунт
                  </a>
                </td>
              </tr>
            </table>
            <!-- Ссылка текстом -->
            <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">Или скопируй ссылку вручную:</p>
            <p style="margin:0 0 32px;word-break:break-all;">
              <a href="${magicUrl}" style="color:#1e3a5f;font-size:12px;">${magicUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Если ты не запрашивал вход — просто проигнорируй это письмо. Ничего не произойдёт.
            </p>
          </td>
        </tr>
        <!-- Футер -->
        <tr>
          <td style="background:#f1f5f9;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© 2025 КП за 30 секунд • Генератор коммерческих предложений для фрилансеров и ИП</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 1: send_magic_link
// ──────────────────────────────────────────────
server.registerTool(
  "send_magic_link",
  {
    description:
      "Отправляет magic link для входа на email через Resend API. Используй при тестировании авторизации.",
    inputSchema: z.object({
      email: z.string().email().describe("Email получателя"),
      token: z.string().describe("Токен для magic link (UUID или любая строка)"),
      baseUrl: z
        .string()
        .default("http://localhost:3000")
        .describe("Базовый URL приложения"),
      fromEmail: z
        .string()
        .default("onboarding@resend.dev")
        .describe("От кого (используй resend.dev для теста, свой домен — для прода)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ email, token, baseUrl, fromEmail }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ RESEND_API_KEY не задан.\n\nКак получить:\n1. Зайди на resend.com\n2. Создай аккаунт → API Keys → Create API Key\n3. Добавь в kp-za-30/.env.local: RESEND_API_KEY=re_xxxx",
          },
        ],
      };
    }

    const magicUrl = `${baseUrl}/api/auth/callback/email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const html = buildMagicLinkHtml(email, magicUrl);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "⚡ Ссылка для входа — КП за 30 секунд",
        html,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return {
        content: [
          {
            type: "text",
            text: `❌ Ошибка Resend ${resp.status}: ${err.slice(0, 300)}`,
          },
        ],
      };
    }

    const data = await resp.json() as { id: string };
    return {
      content: [
        {
          type: "text",
          text: `✅ Magic link отправлен!\n  Кому: ${email}\n  ID письма: ${data.id}\n  Magic URL: ${magicUrl}\n\nПроверь почту — письмо придёт через несколько секунд.`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 2: preview_magic_link_email
// ──────────────────────────────────────────────
server.registerTool(
  "preview_magic_link_email",
  {
    description:
      "Показывает HTML письма magic link без отправки. Удобно для проверки вёрстки.",
    inputSchema: z.object({
      email: z.string().email().default("test@example.com"),
      token: z.string().default("preview-token-123"),
      baseUrl: z.string().default("http://localhost:3000"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ email, token, baseUrl }) => {
    const magicUrl = `${baseUrl}/api/auth/callback/email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const html = buildMagicLinkHtml(email, magicUrl);

    return {
      content: [
        {
          type: "text",
          text: `📧 Превью HTML письма для ${email}:\n\nMagic URL: ${magicUrl}\n\n--- HTML (первые 500 символов) ---\n${html.slice(0, 500)}…\n\nПолный HTML (${html.length} символов) готов к копированию.`,
        },
        {
          type: "text",
          text: html,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 3: list_sent_emails
// ──────────────────────────────────────────────
server.registerTool(
  "list_sent_emails",
  {
    description:
      "Показывает последние отправленные письма через Resend (из твоего аккаунта).",
    inputSchema: z.object({
      limit: z.number().min(1).max(100).default(10),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ limit }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "❌ RESEND_API_KEY не задан." }],
      };
    }

    const resp = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Ошибка ${resp.status}: ${await resp.text()}`,
          },
        ],
      };
    }

    const data = await resp.json() as { data: Array<{ id: string; to: string[]; subject: string; created_at: string; last_event: string }> };
    const emails = data.data ?? [];

    if (emails.length === 0) {
      return {
        content: [{ type: "text", text: "ℹ️ Отправленных писем нет." }],
      };
    }

    const rows = emails.map(
      (e) =>
        `  ${e.id.slice(0, 8)}… | ${e.to[0].padEnd(30)} | ${e.last_event.padEnd(10)} | ${e.created_at.slice(0, 16)}`
    );

    return {
      content: [
        {
          type: "text",
          text: `📨 Последние письма (${emails.length}):\n\n  ID        | Кому                          | Статус     | Дата\n${rows.join("\n")}`,
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────
// ИНСТРУМЕНТ 4: check_resend_connection
// ──────────────────────────────────────────────
server.registerTool(
  "check_resend_connection",
  {
    description: "Проверяет что RESEND_API_KEY задан и работает.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "❌ RESEND_API_KEY не задан.\n\nДобавь в .env.local: RESEND_API_KEY=re_xxxx",
          },
        ],
      };
    }

    const resp = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Ключ задан, но API вернул ${resp.status}. Возможно ключ неверный.`,
          },
        ],
      };
    }

    const data = await resp.json() as { data: Array<{ name: string; status: string }> };
    const domains = (data.data ?? []).map((d) => `  ${d.name} (${d.status})`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `✅ Resend API подключён!\nКлюч: ${apiKey.slice(0, 8)}…\n\nПодключённые домены:\n${domains || "  (только resend.dev — подойдёт для тестов)"}`,
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
