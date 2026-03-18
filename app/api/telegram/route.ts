// [F08] Telegram Bot — webhook handler
// Команды: /start, /kp (wizard 6 шагов → DeepSeek → КП в чат), /cancel, /help

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { generateKp, type KpInput, type KpTone } from "@/lib/deepseek";
import { parseKpResponse } from "@/lib/parseKpResponse";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SITE_URL = process.env.NEXTAUTH_URL ?? "https://kp-za-30.vercel.app";

// ── Типы Telegram ─────────────────────────────────────────────────────────────
interface TgMessage {
  chat: { id: number };
  from?: { id: number; first_name: string; username?: string };
  text?: string;
}
interface TgCallbackQuery {
  id: string;
  from: { id: number; first_name: string };
  message: { chat: { id: number }; message_id: number };
  data: string;
}
interface TgUpdate {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

// ── Сессия пользователя в KV ──────────────────────────────────────────────────
interface TgSession {
  step: number; // 0=idle, 1..6=вопросы, 7=тон
  data: Partial<KpInput>;
}

const QUESTIONS: Record<number, string> = {
  1: "📝 <b>Шаг 1 из 6</b>\nКак называется ваша компания?",
  2: "👤 <b>Шаг 2 из 6</b>\nКак называется компания клиента?",
  3: "🛠 <b>Шаг 3 из 6</b>\nЧто вы предлагаете? (услуга или продукт)",
  4: "💰 <b>Шаг 4 из 6</b>\nСтоимость? (например: от 50 000 ₽)",
  5: "📅 <b>Шаг 5 из 6</b>\nСрок выполнения? (например: 2 недели)",
  6: "⭐ <b>Шаг 6 из 6</b>\nВаши ключевые преимущества (почему клиент должен выбрать вас):",
};

// ── Вспомогательные функции ───────────────────────────────────────────────────
async function tgFetch(method: string, body: object) {
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch {
    // Silent fail — не ломаем webhook ответ
  }
}

async function sendMessage(chatId: number, text: string, extra?: object) {
  return tgFetch("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function sendTyping(chatId: number) {
  return tgFetch("sendChatAction", { chat_id: chatId, action: "typing" });
}

async function answerCallback(callbackQueryId: string, text?: string) {
  return tgFetch("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

// ── KV сессии (TTL 1 час) ─────────────────────────────────────────────────────
async function getSession(chatId: number): Promise<TgSession> {
  try {
    const s = await kv.get<TgSession>(`tg:session:${chatId}`);
    return s ?? { step: 0, data: {} };
  } catch {
    return { step: 0, data: {} };
  }
}

async function setSession(chatId: number, session: TgSession) {
  try {
    await kv.set(`tg:session:${chatId}`, session, { ex: 3600 });
  } catch {
    // KV недоступен — сессия не сохранится
  }
}

async function clearSession(chatId: number) {
  try {
    await kv.del(`tg:session:${chatId}`);
  } catch {}
}

// ── Форматирование КП для Telegram ───────────────────────────────────────────
function formatKpText(parsed: ReturnType<typeof parseKpResponse>): string {
  const lines: string[] = [];

  if (parsed.title) lines.push(`📄 <b>${parsed.title}</b>`, "");
  if (parsed.greeting) lines.push(parsed.greeting, "");

  if (parsed.offer) {
    lines.push("<b>🎯 Наше предложение:</b>", parsed.offer, "");
  }

  if (parsed.benefits?.length) {
    lines.push("<b>✅ Преимущества:</b>");
    parsed.benefits.forEach((b) => lines.push(`• ${b}`));
    lines.push("");
  }

  if (parsed.priceItems?.length) {
    lines.push("<b>💰 Состав и стоимость:</b>");
    parsed.priceItems.forEach((item) =>
      lines.push(`• <b>${item.name}</b> — ${item.price}`)
    );
    if (parsed.priceTotal) lines.push(`\n<b>Итого: ${parsed.priceTotal}</b>`);
    lines.push("");
  } else if (parsed.price) {
    lines.push(`💰 <b>Стоимость:</b> ${parsed.price}`, "");
  }

  if (parsed.deadline) lines.push(`⏱ <b>Срок:</b> ${parsed.deadline}`, "");

  if (parsed.conditions?.length) {
    lines.push("<b>📋 Условия:</b>");
    parsed.conditions.forEach((c) => lines.push(`• ${c}`));
    lines.push("");
  }

  if (parsed.cta) lines.push("<b>📞 Следующий шаг:</b>", parsed.cta, "");
  if (parsed.signature) lines.push(parsed.signature);

  return lines.join("\n");
}

function splitMessage(text: string, maxLen = 4000): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      if (nl > start) end = nl + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

// ── Обработка команд ──────────────────────────────────────────────────────────
async function handleCommand(chatId: number, command: string, name: string) {
  switch (command) {
    case "/start":
    case "/help":
      await sendMessage(
        chatId,
        `👋 <b>Привет, ${name}!</b>\n\n` +
          `Я создам коммерческое предложение за 30 секунд — прямо здесь, в Telegram.\n\n` +
          `<b>Команды:</b>\n` +
          `/kp — ✍️ создать новое КП\n` +
          `/cancel — ❌ отменить создание\n` +
          `/help — 💡 эта справка\n\n` +
          `Просто нажми /kp и ответь на 6 вопросов! 🚀`
      );
      break;

    case "/kp":
      await clearSession(chatId);
      await setSession(chatId, { step: 1, data: {} });
      await sendMessage(
        chatId,
        `🚀 <b>Создаём коммерческое предложение!</b>\n\n` +
          `Я задам 6 вопросов. Ответь на каждый — и КП готово!\n\n` +
          QUESTIONS[1]
      );
      break;

    case "/cancel":
      await clearSession(chatId);
      await sendMessage(
        chatId,
        `❌ Создание КП отменено.\n\nНажми /kp чтобы начать заново.`
      );
      break;

    default:
      await sendMessage(
        chatId,
        `Неизвестная команда. Напиши /help для справки.`
      );
  }
}

// ── Обработка текстовых сообщений ────────────────────────────────────────────
async function handleText(chatId: number, text: string) {
  const session = await getSession(chatId);

  if (session.step === 0) {
    await sendMessage(
      chatId,
      `Нажми /kp чтобы создать коммерческое предложение.\nИли /help для справки.`
    );
    return;
  }

  // Сохраняем ответ на текущий шаг
  switch (session.step) {
    case 1: session.data.companyName = text; break;
    case 2: session.data.clientName  = text; break;
    case 3: session.data.service     = text; break;
    case 4: session.data.price       = text; break;
    case 5: session.data.deadline    = text; break;
    case 6: session.data.advantages  = text; break;
  }

  session.step++;

  if (session.step <= 6) {
    await setSession(chatId, session);
    await sendMessage(chatId, QUESTIONS[session.step]);
  } else {
    // Все 6 полей собраны — спрашиваем тон
    session.step = 7;
    await setSession(chatId, session);
    await sendMessage(chatId, "🎨 <b>Почти готово!</b>\nВыберите тон КП:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📋 Официальный", callback_data: "tone:official"   },
            { text: "😊 Дружелюбный", callback_data: "tone:friendly"   },
            { text: "🔥 Агрессивный",  callback_data: "tone:aggressive" },
          ],
        ],
      },
    });
  }
}

// ── Обработка нажатия кнопки тона ────────────────────────────────────────────
async function handleToneCallback(
  chatId: number,
  tone: KpTone,
  callbackQueryId: string
) {
  await answerCallback(callbackQueryId, "Генерирую КП...");

  const session = await getSession(chatId);
  if (!session.data.companyName) {
    await sendMessage(chatId, "⚠️ Сессия устарела. Начни заново: /kp");
    return;
  }

  session.data.tone = tone;
  const toneLabel =
    tone === "official"
      ? "Официальный"
      : tone === "friendly"
      ? "Дружелюбный"
      : "Агрессивный";

  await sendMessage(
    chatId,
    `⏳ <b>Генерирую КП (${toneLabel} тон)...</b>\n\n` +
      `Компания: ${session.data.companyName}\n` +
      `Клиент: ${session.data.clientName}\n\n` +
      `Обычно занимает 10–20 секунд...`
  );
  await sendTyping(chatId);

  try {
    const input: KpInput = {
      companyName: session.data.companyName!,
      clientName:  session.data.clientName!,
      service:     session.data.service!,
      price:       session.data.price!,
      deadline:    session.data.deadline!,
      advantages:  session.data.advantages!,
      tone:        session.data.tone,
    };

    const rawXml  = await generateKp(input);
    const parsed  = parseKpResponse(rawXml);
    const kpText  = formatKpText(parsed);

    await clearSession(chatId);

    // Отправляем КП (может быть несколько сообщений если длинное)
    const chunks = splitMessage(kpText);
    for (const chunk of chunks) {
      await sendMessage(chatId, chunk);
    }

    await sendMessage(
      chatId,
      `✅ <b>КП готово!</b>\n\n` +
        `Для красивого PDF с вашим логотипом — зайди на сайт:\n` +
        `👉 <a href="${SITE_URL}">${SITE_URL}</a>\n\n` +
        `Создать ещё одно КП? /kp`
    );
  } catch (err) {
    console.error("[Telegram bot] generateKp error:", err);
    await clearSession(chatId);
    await sendMessage(
      chatId,
      `❌ Ошибка генерации. Попробуй ещё раз: /kp\n\n` +
        `Если ошибка повторяется — используй сайт: <a href="${SITE_URL}">${SITE_URL}</a>`
    );
  }
}

// ── Webhook endpoint ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  let update: TgUpdate;
  try {
    update = await req.json() as TgUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (update.message) {
      const msg      = update.message;
      const chatId   = msg.chat.id;
      const text     = msg.text ?? "";
      const firstName = msg.from?.first_name ?? "друг";

      if (text.startsWith("/")) {
        const command = text.split(" ")[0].toLowerCase();
        await handleCommand(chatId, command, firstName);
      } else if (text.trim()) {
        await handleText(chatId, text.trim());
      }
    } else if (update.callback_query) {
      const cq     = update.callback_query;
      const chatId = cq.message.chat.id;
      const data   = cq.data ?? "";

      if (data.startsWith("tone:")) {
        const tone = data.replace("tone:", "") as KpTone;
        await handleToneCallback(chatId, tone, cq.id);
      }
    }
  } catch (err) {
    console.error("[Telegram webhook] error:", err);
  }

  // Всегда 200 — иначе Telegram будет ретраить
  return NextResponse.json({ ok: true });
}

// ── Регистрация webhook (GET /api/telegram?setup=1&token=SECRET) ──────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const setup = searchParams.get("setup");
  const token = searchParams.get("token");
  const adminToken = process.env.CRON_SECRET ?? "";

  if (setup !== "1" || token !== adminToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const webhookUrl = `${SITE_URL}/api/telegram`;
  const result = await tgFetch("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
  });

  return NextResponse.json({ webhookUrl, result });
}
