/**
 * ЮКасса API client.
 * Документация: https://yookassa.ru/developers/api
 *
 * Переменные окружения:
 *   YUKASSA_SHOP_ID    — номер магазина (например: 123456)
 *   YUKASSA_SECRET_KEY — секретный ключ (например: test_ABC...)
 *
 * Для тестовой среды используй ключи live_... из личного кабинета.
 * Тестовые платежи: https://yookassa.ru/developers/using-api/testing
 */

const YUKASSA_BASE = "https://api.yookassa.ru/v3";

export interface YooPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount: { value: string; currency: string };
  confirmation: { type: string; confirmation_url: string };
  metadata: Record<string, string>;
  created_at: string;
}

function getAuth(): string {
  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;
  if (!shopId || !secretKey) throw new Error("YUKASSA_SHOP_ID / YUKASSA_SECRET_KEY не заданы");
  return Buffer.from(`${shopId}:${secretKey}`).toString("base64");
}

/**
 * Создаёт платёж. Возвращает объект с confirmation_url для редиректа.
 */
export async function createPayment(params: {
  amountRub: number;
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}): Promise<YooPayment> {
  const idempotenceKey = crypto.randomUUID();

  const body = {
    amount: { value: params.amountRub.toFixed(2), currency: "RUB" },
    confirmation: { type: "redirect", return_url: params.returnUrl },
    capture: true,
    description: params.description,
    metadata: params.metadata ?? {},
  };

  const res = await fetch(`${YUKASSA_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getAuth()}`,
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`ЮКасса error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}

/**
 * Получает статус платежа по ID. Используется для верификации webhook.
 */
export async function getPayment(paymentId: string): Promise<YooPayment> {
  const res = await fetch(`${YUKASSA_BASE}/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${getAuth()}` },
  });

  if (!res.ok) {
    throw new Error(`ЮКасса getPayment error ${res.status}`);
  }

  return res.json();
}

/** Проверяет, настроена ли ЮКасса (есть ключи). */
export function isYookassaConfigured(): boolean {
  return !!(process.env.YUKASSA_SHOP_ID && process.env.YUKASSA_SECRET_KEY);
}
