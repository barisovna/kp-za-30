"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { KpTone } from "@/lib/deepseek";
import type { ParsedKp } from "@/lib/parseKpResponse";

interface HistoryItem {
  id: string;
  title: string;
  createdAt: string;
  kp: ParsedKp;
  logo?: string;
}

interface KpFormData {
  companyName: string;
  clientName: string;
  service: string;
  price: string;
  deadline: string;
  advantages: string;
  tone: KpTone;
}

// ─── [F14] Демо-блок ────────────────────────────────────────────────────────
const DEMO_SERVICES = [
  "Разработка сайта", "SMM-продвижение", "Дизайн логотипа",
  "Бухгалтерские услуги", "Юридическая консультация", "SEO-оптимизация",
];

function DemoBlock() {
  const [service, setService] = useState("");
  const [client, setClient] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [used, setUsed] = useState(false);

  const generate = useCallback(async () => {
    if (!service.trim()) return;
    if (used) { setShowCta(true); return; }

    setLoading(true);
    setPreview("");
    setShowCta(false);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, client }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const chunk = json.choices?.[0]?.delta?.content ?? "";
            if (chunk) setPreview((p) => p + chunk);
          } catch { /* skip */ }
        }
      }

      setUsed(true);
      setShowCta(true);
    } catch {
      setPreview("Не удалось сгенерировать демо. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }, [service, client, used]);

  return (
    <section className="px-6 -mt-8 mb-2">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 border-2 border-[#f59e0b]/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#f59e0b] text-lg">⚡</span>
          <h2 className="font-bold font-heading text-[#1e293b] text-base">Попробуй прямо сейчас — без регистрации</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Введи услугу — увидишь фрагмент настоящего КП</p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1">
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              list="demo-services"
              placeholder="Ваша услуга (напр. разработка сайта)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/50"
            />
            <datalist id="demo-services">
              {DEMO_SERVICES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex-1">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="Тип клиента (необязательно)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/50"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !service.trim()}
            className="bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl text-sm transition whitespace-nowrap"
          >
            {loading ? "Генерирую…" : "Показать пример"}
          </button>
        </div>

        {preview && (
          <div className="bg-[#f8fafc] rounded-xl p-4 text-sm text-[#1e293b] leading-relaxed whitespace-pre-wrap border border-gray-100 mb-3">
            {preview}
            {loading && <span className="animate-pulse text-[#f59e0b]">|</span>}
            {!loading && <span className="text-gray-300"> …</span>}
          </div>
        )}

        {showCta && !loading && (
          <div className="bg-[#1e3a5f]/5 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-[#1e293b] mb-2">
              {used && preview ? "Нравится? Получи полное КП — бесплатно!" : "Хочешь полное КП?"}
            </p>
            <button
              onClick={() => {
                const formEl = document.getElementById("kp-form");
                formEl?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#f59e0b] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#d97706] transition"
            >
              ⚡ Создать полное КП бесплатно
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
// ────────────────────────────────────────────────────────────────────────────

const TONE_OPTIONS: { value: KpTone; label: string; hint: string }[] = [
  { value: "official", label: "Официальный", hint: "Строго и профессионально" },
  { value: "friendly", label: "Дружелюбный", hint: "Тепло и по-партнёрски" },
  { value: "aggressive", label: "Агрессивный", hint: "Давление и срочность" },
];

export default function HomePage() {
  const [formData, setFormData] = useState<KpFormData>({
    companyName: "",
    clientName: "",
    service: "",
    price: "",
    deadline: "",
    advantages: "",
    tone: "official",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [kpCount, setKpCount] = useState<number>(847);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("kp_history");
    if (raw) setHistory(JSON.parse(raw));
    // [F13] Загружаем счётчик КП
    fetch("/api/counter").then((r) => r.json()).then((d) => {
      if (d.count) setKpCount(d.count);
    }).catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Логотип не должен превышать 2 МБ");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка генерации");
      }

      sessionStorage.setItem("kp_result", JSON.stringify(data.kp));
      if (logoPreview) {
        sessionStorage.setItem("kp_logo", logoPreview);
      } else {
        sessionStorage.removeItem("kp_logo");
      }

      // Сохраняем в историю localStorage (последние 5)
      const historyRaw = localStorage.getItem("kp_history");
      const history: HistoryItem[] = historyRaw ? JSON.parse(historyRaw) : [];
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: data.kp.title,
        createdAt: new Date().toLocaleDateString("ru-RU"),
        kp: data.kp,
        logo: logoPreview || undefined,
      };
      const updated = [newItem, ...history].slice(0, 5);
      localStorage.setItem("kp_history", JSON.stringify(updated));

      window.location.href = "/result";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* Шапка */}
      <header className="bg-[#1e3a5f] text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-heading">⚡ КП за 30 сек</span>
          </div>
          <span className="text-sm text-blue-200">Осталось бесплатных КП: <strong className="text-[#f59e0b]">3</strong></span>
        </div>
      </header>

      {/* Hero секция */}
      <section className="bg-[#1e3a5f] text-white pb-20 pt-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* [F13] Счётчик социального доказательства */}
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 text-sm text-blue-200">
            <span className="text-[#f59e0b] font-bold">{kpCount.toLocaleString("ru-RU")}</span>
            коммерческих предложений уже создано
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 leading-tight">
            Коммерческое предложение<br />
            <span className="text-[#f59e0b]">за 30 секунд</span>
          </h1>
          <p className="text-lg text-blue-200 max-w-xl mx-auto mb-2">
            Заполни 6 полей — получи профессиональное КП. Без шаблонов, без копипаста.
          </p>
          <p className="text-sm text-blue-300">
            Для фрилансеров, ИП и малых агентств
          </p>
        </div>
      </section>

      {/* [F14] Демо-блок — попробовать без регистрации */}
      <DemoBlock />

      {/* Форма */}
      <section className="px-6 py-10 -mt-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold font-heading text-[#1e293b] mb-6">
            Заполни форму — и получи готовое КП
          </h2>

          <form id="kp-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Логотип компании */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                Логотип компании <span className="font-normal text-gray-400">(необязательно)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#1e3a5f] transition group"
              >
                {logoPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Логотип" className="h-12 w-auto max-w-[120px] object-contain rounded" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#1e293b]">Логотип загружен</span>
                      <span className="text-xs text-[#1e3a5f] group-hover:underline">Нажми чтобы заменить</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="ml-auto text-gray-400 hover:text-red-500 transition text-lg leading-none"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xl group-hover:bg-blue-50 transition">
                      🏢
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#1e293b]">Загрузить логотип</span>
                      <p className="text-xs text-gray-400">PNG, JPG до 2 МБ — будет в шапке КП</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            {/* Поле 1 */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                Ваша компания / имя
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Например: ООО «Ромашка» или Иван Петров"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
              />
            </div>

            {/* Поле 2 */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                Название компании клиента
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Например: ООО «Лидер» или Алексей Смирнов"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
              />
            </div>

            {/* Поле 3 */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                Услуга или продукт
              </label>
              <input
                type="text"
                name="service"
                value={formData.service}
                onChange={handleChange}
                placeholder="Например: разработка сайта, SMM, бухгалтерия"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
              />
            </div>

            {/* Поля 4 и 5 — в строку на десктопе */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Стоимость
                </label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Например: 50 000 ₽"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Срок выполнения
                </label>
                <input
                  type="text"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  placeholder="Например: 14 дней"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Поле 6 */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                Ключевые преимущества
              </label>
              <textarea
                name="advantages"
                value={formData.advantages}
                onChange={handleChange}
                placeholder="Например: опыт 5 лет, 200+ проектов, гарантия возврата, поддержка 24/7"
                required
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Перечисли через запятую — чем конкретнее, тем лучше КП</p>
            </div>

            {/* Тон КП */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-2">
                Тон коммерческого предложения
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col items-center text-center cursor-pointer rounded-xl border-2 px-3 py-3 transition ${
                      formData.tone === opt.value
                        ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={opt.value}
                      checked={formData.tone === opt.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className={`font-semibold text-sm ${formData.tone === opt.value ? "text-[#1e3a5f]" : "text-[#1e293b]"}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">{opt.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl py-4 md:py-3 mt-2 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Генерирую КП...
                </span>
              ) : (
                "⚡ Создать КП"
              )}
            </button>
          </form>
        </div>
      </section>

      {/* История КП */}
      {history.length > 0 && (
        <section className="px-6 pb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-bold font-heading text-[#1e293b] mb-3">
              📂 Ваши последние КП
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("kp_result", JSON.stringify(item.kp));
                    if (item.logo) sessionStorage.setItem("kp_logo", item.logo);
                    else sessionStorage.removeItem("kp_logo");
                    window.location.href = "/result";
                  }}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#1e3a5f] hover:shadow-sm transition text-left group"
                >
                  <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center text-[#1e3a5f] text-sm flex-shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1e293b] text-sm truncate group-hover:text-[#1e3a5f]">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-400">{item.createdAt}</div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-[#1e3a5f]">Открыть →</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Зарегистрируйся чтобы не потерять КП — они хранятся только в браузере
            </p>
          </div>
        </section>
      )}

      {/* Преимущества */}
      <section className="px-6 pb-10">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "⚡", title: "30 секунд", desc: "Вместо 2–4 часов" },
            { icon: "📄", title: "4 шаблона", desc: "Включая ВИП" },
            { icon: "🆓", title: "3 КП бесплатно", desc: "Без карты" },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="font-bold text-[#1e3a5f] text-sm">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* [F13] Отзывы */}
      <section className="px-6 pb-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-bold font-heading text-[#1e293b] mb-4 text-center">Что говорят пользователи</h2>
          <div className="grid gap-3">
            {[
              { name: "Анна К.", role: "Дизайнер-фрилансер", text: "Раньше тратила 3 часа на КП, теперь — 5 минут. Клиенты говорят что оно выглядит очень профессионально!", stars: 5 },
              { name: "Михаил Р.", role: "ИП, SMM-специалист", text: "Особенно нравится ВИП-шаблон — отправляю крупным клиентам, сразу видно класс. Уже 2 сделки закрыл после первого отправленного КП.", stars: 5 },
              { name: "Светлана Н.", role: "Агентство веб-разработки", text: "Удобно что можно редактировать текст после генерации. Нейросеть даёт хорошую основу, я немного правлю под себя.", stars: 5 },
            ].map((r) => (
              <div key={r.name} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-3">
                <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-sm flex-shrink-0">
                  {r.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#1e293b]">{r.name}</span>
                    <span className="text-xs text-gray-400">{r.role}</span>
                    <span className="ml-auto text-[#f59e0b] text-xs">{"★".repeat(r.stars)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Футер */}
      <footer className="text-center text-xs text-gray-400 pb-8">
        © 2025 КП за 30 секунд
      </footer>
    </main>
  );
}
