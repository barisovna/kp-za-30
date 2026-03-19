/**
 * Магические ссылки + сессии.
 * Хранение: Vercel KV (Upstash Redis).
 * Без NextAuth adapter — собственная реализация для простоты и контроля.
 */
import { kv } from "@vercel/kv";
import { Resend } from "resend";

// Ленивая инициализация — не создаём при импорте (ключ может быть пустым в билде)
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "");
}

const SITE_URL =
  process.env.NEXTAUTH_URL ?? "https://kp-za-30.vercel.app";

// ── Магическая ссылка ─────────────────────────────────────────────────────────

/** Генерирует токен, сохраняет в KV и шлёт письмо. */
export async function sendMagicLink(email: string): Promise<void> {
  const token = crypto.randomUUID();
  // TTL 15 минут
  await kv.set(`kp_magic:${token}`, email, { ex: 900 });

  const link = `${SITE_URL}/api/auth/verify?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    // Локальная разработка без Resend — выводим ссылку в консоль
    console.log(`\n🔗 Magic link (dev):\n${link}\n`);
    return;
  }

  await getResend().emails.send({
    from: "КП за 30 сек <noreply@kp-za-30.ru>",
    to: email,
    subject: "Ссылка для входа в КП за 30 секунд",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e3a5f">⚡ КП за 30 секунд</h2>
        <p>Нажми кнопку ниже, чтобы войти в личный кабинет:</p>
        <a href="${link}"
           style="display:inline-block;background:#1e3a5f;color:#fff;padding:14px 28px;
                  border-radius:12px;text-decoration:none;font-weight:bold;margin:16px 0">
          Войти в кабинет →
        </a>
        <p style="color:#6b7280;font-size:13px">
          Ссылка действует <strong>15 минут</strong> и одноразовая.<br/>
          Если ты не запрашивал вход — просто проигнорируй это письмо.
        </p>
      </div>
    `,
  });
}

/** Проверяет токен. Возвращает email или null. Удаляет токен (одноразовый). */
export async function verifyMagicToken(token: string): Promise<string | null> {
  const email = await kv.get<string>(`kp_magic:${token}`);
  if (!email) return null;
  await kv.del(`kp_magic:${token}`);
  return email;
}

// ── Сессии ────────────────────────────────────────────────────────────────────

export interface SessionData {
  userId: string;  // формат: "user:email@example.com"
  email: string;
  createdAt: number;
}

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 дней

/** Создаёт сессию в KV и возвращает sessionId для cookie. */
export async function createSession(email: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const data: SessionData = {
    userId: `user:${email}`,
    email,
    createdAt: Date.now(),
  };
  await kv.set(`kp_session:${sessionId}`, JSON.stringify(data), {
    ex: SESSION_TTL,
  });
  return sessionId;
}

/** Достаёт сессию из KV. */
export async function getSession(
  sessionId: string
): Promise<SessionData | null> {
  const raw = await kv.get<string>(`kp_session:${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/** Удаляет сессию (logout). */
export async function deleteSession(sessionId: string): Promise<void> {
  await kv.del(`kp_session:${sessionId}`);
}
