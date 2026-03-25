// [F04] Реферальный редирект: /ref?code=abc-123
// СЕРВЕРНЫЙ КОМПОНЕНТ — редирект и cookie без JS (B12 fix)
// Сохраняет cookie на 90 дней → редиректит на главную

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/lib/referral";

interface Props {
  searchParams: { code?: string; ref?: string };
}

export default async function RefPage({ searchParams }: Props) {
  const code = searchParams.code ?? searchParams.ref ?? "";

  if (code) {
    // Серверная установка cookie — работает без JS
    const cookieStore = cookies();
    cookieStore.set(REFERRAL_COOKIE, code, {
      path: "/",
      maxAge: 90 * 24 * 60 * 60, // 90 дней
      sameSite: "lax",
      httpOnly: false, // нужен client-side доступ при оплате
    });
  }

  // Немедленный серверный редирект — никакого "Переходим на сайт..."
  redirect("/");
}
