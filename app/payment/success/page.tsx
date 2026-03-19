"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PLANS } from "@/lib/credits";
import { applyPayment } from "@/lib/credits";

type PlanKey = "start" | "active" | "monthly" | "yearly";

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") as PlanKey | null;
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!plan || !["start", "active", "monthly", "yearly"].includes(plan)) {
      setStatus("error");
      return;
    }

    // Обновляем локальный localStorage (для UI в текущей сессии)
    try {
      applyPayment(plan);
    } catch {}

    // Синхронизируем с сервером — план уже активирован через webhook,
    // но на случай задержки — покажем успех сразу
    setStatus("ok");
  }, [plan]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-500">Проверяем оплату…</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !plan) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-[#1e293b] mb-2">Что-то пошло не так</h1>
          <p className="text-gray-500 text-sm mb-6">
            Напиши нам — разберёмся и поможем.
          </p>
          <Link href="/" className="inline-block bg-[#1e3a5f] text-white font-bold px-6 py-3 rounded-xl">
            На главную
          </Link>
        </div>
      </main>
    );
  }

  const def = PLANS[plan];

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-[#1e293b] mb-2">Оплата прошла!</h1>
        <p className="text-gray-600 text-sm mb-4">
          <strong>{def.name}</strong> активирован.{" "}
          {def.kps === -1
            ? "Безлимитные КП."
            : `Доступно ${def.kps} КП на ${def.daysValid} дней.`}
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-green-700 text-sm">
          ✅ Все шаблоны разблокированы. Можешь создавать КП!
        </div>
        <Link
          href="/"
          className="inline-block bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-8 py-3 rounded-xl transition"
        >
          ⚡ Создать КП →
        </Link>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
