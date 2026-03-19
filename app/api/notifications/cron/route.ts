// [F05] Vercel Cron — ежедневная рассылка триггерных уведомлений
// Запускается по расписанию из vercel.json (каждый день в 10:00 МСК = 07:00 UTC)
// Проверяет подписчиков в KV и отправляет письма через Resend

import { NextRequest, NextResponse } from "next/server";

interface UserData {
  email: string;
  plan: string;
  planExpires: number | null;
  lastKpDate: string;
  subscribedAt: string;
}

// ── HTML-шаблоны писем ────────────────────────────────────────────────────────
function emailInactivity7(email: string): { subject: string; html: string } {
  return {
    subject: "Клиент ждёт ответа? ⚡",
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1e3a5f; padding: 32px 40px; text-align: center;">
      <p style="color: #f59e0b; font-size: 28px; margin: 0;">⚡</p>
      <h1 style="color: white; font-size: 22px; margin: 12px 0 0;">КП за 30 секунд</h1>
    </div>
    <div style="padding: 32px 40px;">
      <h2 style="font-size: 20px; color: #1e293b; margin: 0 0 16px;">Клиент ждёт твоего ответа?</h2>
      <p style="color: #64748b; line-height: 1.6; margin: 0 0 16px;">
        Прошло 7 дней с твоего последнего КП. Если есть потенциальный клиент — самое время отправить предложение, пока он не выбрал другого исполнителя.
      </p>
      <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
        Создай КП за 30 секунд — заполни 6 полей и получи готовый документ.
      </p>
      <a href="https://kp-za-30.vercel.app" style="display: inline-block; background: #f59e0b; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 15px;">
        ⚡ Создать КП сейчас
      </a>
    </div>
    <div style="padding: 16px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Ты получил это письмо, потому что подписался на напоминания.
        <br>Нажми <a href="https://kp-za-30.vercel.app/unsubscribe?email=${encodeURIComponent(email)}" style="color: #94a3b8;">отписаться</a>, чтобы больше не получать их.
      </p>
    </div>
  </div>
</body></html>`,
  };
}

function emailInactivity14(email: string): { subject: string; html: string } {
  return {
    subject: "Кейс: Михаил закрыл сделку на 150 000 ₽ 📄",
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1e3a5f; padding: 32px 40px; text-align: center;">
      <p style="color: #f59e0b; font-size: 28px; margin: 0;">📄</p>
      <h1 style="color: white; font-size: 22px; margin: 12px 0 0;">КП за 30 секунд</h1>
    </div>
    <div style="padding: 32px 40px;">
      <h2 style="font-size: 20px; color: #1e293b; margin: 0 0 16px;">Реальный кейс: как КП помогло закрыть сделку</h2>
      <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 0 0 20px;">
        <p style="color: #1e293b; font-style: italic; margin: 0; line-height: 1.6;">
          «Я SMM-специалист. Раньше писал КП вручную — 2–3 часа на документ. Клиенты часто говорили "подумаем" и пропадали. После того как начал отправлять красивые PDF-КП, конверсия выросла. Последняя сделка — агентство на 150 000 ₽/мес. КП сделал за 4 минуты.»
        </p>
        <p style="color: #64748b; font-size: 13px; margin: 12px 0 0;">— Михаил Р., SMM-специалист, Москва</p>
      </div>
      <p style="color: #64748b; line-height: 1.6; margin: 0 0 24px;">
        Уже 14 дней без нового КП. Возможно, упустил несколько потенциальных клиентов. Давай исправим это прямо сейчас — займёт меньше минуты.
      </p>
      <a href="https://kp-za-30.vercel.app" style="display: inline-block; background: #f59e0b; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 15px;">
        ⚡ Создать КП бесплатно
      </a>
    </div>
    <div style="padding: 16px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        <a href="https://kp-za-30.vercel.app/unsubscribe?email=${encodeURIComponent(email)}" style="color: #94a3b8;">Отписаться от напоминаний</a>
      </p>
    </div>
  </div>
</body></html>`,
  };
}

function emailExpiry3(email: string, daysLeft: number): { subject: string; html: string } {
  return {
    subject: `Твоя подписка заканчивается через ${daysLeft} ${daysLeft === 1 ? "день" : "дня"} ⏰`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #1e3a5f; padding: 32px 40px; text-align: center;">
      <p style="color: #f59e0b; font-size: 28px; margin: 0;">⏰</p>
      <h1 style="color: white; font-size: 22px; margin: 12px 0 0;">КП за 30 секунд</h1>
    </div>
    <div style="padding: 32px 40px;">
      <h2 style="font-size: 20px; color: #1e293b; margin: 0 0 16px;">
        Подписка заканчивается через ${daysLeft} ${daysLeft === 1 ? "день" : "дня"}
      </h2>
      <p style="color: #64748b; line-height: 1.6; margin: 0 0 16px;">
        После окончания подписки ты сможешь создать только 3 КП бесплатно.
        Продли сейчас — не теряй доступ к безлимитным КП и всем шаблонам.
      </p>
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
        <p style="margin: 0; font-weight: bold; color: #1e293b;">💡 Переходи на годовую — экономия 1 900 ₽</p>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Вместо 9 480 ₽/год → всего 6 490 ₽</p>
      </div>
      <a href="https://kp-za-30.vercel.app" style="display: inline-block; background: #1e3a5f; color: white; font-weight: bold; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 15px;">
        Продлить подписку →
      </a>
    </div>
    <div style="padding: 16px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        <a href="https://kp-za-30.vercel.app/unsubscribe?email=${encodeURIComponent(email)}" style="color: #94a3b8;">Отписаться</a>
      </p>
    </div>
  </div>
</body></html>`,
  };
}

// ── Отправка через Resend ─────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "КП за 30 сек <noreply@kp-za-30.vercel.app>",
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Cron handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Проверяем секретный заголовок Vercel Cron (безопасность)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return NextResponse.json({ ok: true, skipped: "no-kv" });
  }

  // Получаем список подписчиков
  const membersRes = await fetch(`${kvUrl}/smembers/notif:subscribers`, {
    headers: { Authorization: `Bearer ${kvToken}` },
  });
  const membersData = await membersRes.json() as { result: string[] | null };
  const subscribers = membersData.result ?? [];

  let sent = 0;
  const now = Date.now();

  for (const emailEncoded of subscribers) {
    try {
      const email = decodeURIComponent(emailEncoded);
      // Читаем данные пользователя
      const userRes = await fetch(`${kvUrl}/get/notif:user:${emailEncoded}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const { result } = await userRes.json() as { result: string | null };
      if (!result) continue;

      const user = JSON.parse(result) as UserData;
      const lastKp = new Date(user.lastKpDate).getTime();
      const inactivityDays = Math.floor((now - lastKp) / (1000 * 60 * 60 * 24));

      // Проверяем срок подписки
      if (user.planExpires) {
        const daysLeft = Math.ceil((user.planExpires - now) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 3) {
          const { subject, html } = emailExpiry3(email, daysLeft);
          if (await sendEmail(email, subject, html)) sent++;
          continue;
        }
      }

      // 14 дней неактивности
      if (inactivityDays === 14) {
        const { subject, html } = emailInactivity14(email);
        if (await sendEmail(email, subject, html)) sent++;
      }
      // 7 дней неактивности (точно 7, не повторяем)
      else if (inactivityDays === 7) {
        const { subject, html } = emailInactivity7(email);
        if (await sendEmail(email, subject, html)) sent++;
      }
    } catch {
      // Пропускаем битые записи
    }
  }

  return NextResponse.json({ ok: true, checked: subscribers.length, sent });
}
