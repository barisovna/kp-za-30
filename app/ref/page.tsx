"use client";

// [F04] Реферальный редирект: /ref?code=abc-123
// Сохраняет cookie + засчитывает клик → редирект на главную

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { REFERRAL_COOKIE } from "@/lib/referral";

function RefRedirect() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.get("code") ?? params.get("ref") ?? "";
    if (code) {
      // Сохранить cookie на 90 дней
      const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${REFERRAL_COOKIE}=${code}; path=/; expires=${expires}; SameSite=Lax`;

      // Засчитать клик (fire-and-forget)
      fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackClick: code }),
      }).catch(() => {});
    }

    // Редирект на главную
    router.replace("/");
  }, [params, router]);

  return null;
}

export default function RefPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">⏳</div>
        <p className="text-gray-500">Переходим на сайт...</p>
      </div>
      <Suspense>
        <RefRedirect />
      </Suspense>
    </div>
  );
}
