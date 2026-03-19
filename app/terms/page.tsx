import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Пользовательское соглашение — КП за 30 секунд",
  description: "Условия использования сервиса КП за 30 секунд",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Шапка */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-[#1e3a5f] hover:underline mb-4 inline-block"
          >
            ← На главную
          </Link>
          <h1 className="text-2xl font-bold font-heading text-[#1e3a5f] mb-2">
            Пользовательское соглашение
          </h1>
          <p className="text-sm text-gray-500">Последнее обновление: 19 марта 2026 г.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 text-sm text-[#1e293b] leading-relaxed">

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">1. Общие положения</h2>
            <p>
              Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует
              отношения между ИП (далее — «Сервис», «мы») и физическим или юридическим
              лицом (далее — «Пользователь», «вы»), использующим веб-сервис
              «КП за 30 секунд», доступный по адресу kp-za-30.vercel.app и связанным
              доменам.
            </p>
            <p className="mt-2">
              Начиная использовать Сервис, вы подтверждаете, что ознакомились с настоящим
              Соглашением и принимаете его условия в полном объёме.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">2. Предмет соглашения</h2>
            <p>
              Сервис предоставляет инструмент для автоматической генерации коммерческих
              предложений (КП) на основе данных, введённых Пользователем, с помощью
              технологий искусственного интеллекта. Результат генерации — текст КП,
              который Пользователь может редактировать, копировать и сохранять в PDF.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">3. Регистрация и аккаунт</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Для использования всех функций Сервиса требуется регистрация по email.</li>
              <li>Вы несёте ответственность за сохранность доступа к своему аккаунту.</li>
              <li>Вы обязуетесь предоставлять достоверные данные при регистрации.</li>
              <li>
                Мы вправе заблокировать аккаунт при нарушении условий настоящего
                Соглашения.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">4. Бесплатный доступ и тарифы</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Бесплатный доступ предоставляет ограниченное количество генераций КП
                (3 штуки) без обязательства оплаты.
              </li>
              <li>
                Платные тарифы активируются после успешной оплаты и действуют в
                течение срока, указанного при покупке.
              </li>
              <li>
                Неиспользованные генерации по истечении срока действия тарифа не
                переносятся и не компенсируются.
              </li>
              <li>
                Стоимость и состав тарифов могут меняться; изменения публикуются на
                сайте и не распространяются на уже оплаченные периоды.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">5. Оплата и возврат</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Оплата производится через платёжный сервис ЮКасса.</li>
              <li>
                Возврат денежных средств возможен в течение 14 дней с момента оплаты,
                если вы не использовали ни одной платной генерации. Для возврата
                напишите на{" "}
                <a
                  href="mailto:medicalx@bk.ru"
                  className="text-[#1e3a5f] hover:underline"
                >
                  medicalx@bk.ru
                </a>
                .
              </li>
              <li>
                После использования хотя бы одной платной генерации возврат не
                производится.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">6. Права на контент</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Данные, введённые вами в форму, остаются вашей собственностью.
              </li>
              <li>
                Сгенерированные КП принадлежат вам — вы можете использовать их
                в любых коммерческих целях.
              </li>
              <li>
                Мы не несём ответственности за точность, полноту или коммерческую
                эффективность сгенерированных текстов.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">7. Ограничения использования</h2>
            <p>Запрещается использовать Сервис для:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>генерации мошеннических, незаконных или вводящих в заблуждение материалов;</li>
              <li>автоматизированного массового использования (парсинг, боты, скрейпинг);</li>
              <li>перепродажи доступа к Сервису третьим лицам;</li>
              <li>любых действий, нарушающих законодательство Российской Федерации.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">8. Ответственность</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Сервис предоставляется «как есть» без гарантий бесперебойной работы
                и достижения коммерческих результатов.
              </li>
              <li>
                Наша ответственность ограничена суммой, уплаченной вами за тариф в
                текущем расчётном периоде.
              </li>
              <li>
                Мы не несём ответственности за действия или решения третьих лиц,
                принятые на основании сгенерированных КП.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">9. Персональные данные</h2>
            <p>
              Порядок обработки персональных данных описан в нашей{" "}
              <Link href="/privacy" className="text-[#1e3a5f] hover:underline">
                Политике конфиденциальности
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">10. Изменение соглашения</h2>
            <p>
              Мы вправе вносить изменения в настоящее Соглашение, публикуя обновлённую
              версию на этой странице. Продолжение использования Сервиса после
              публикации изменений означает ваше согласие с новыми условиями.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">11. Контакты</h2>
            <p>
              По всем вопросам, связанным с настоящим Соглашением, обращайтесь по
              адресу:{" "}
              <a
                href="mailto:medicalx@bk.ru"
                className="text-[#1e3a5f] hover:underline font-medium"
              >
                medicalx@bk.ru
              </a>
            </p>
          </section>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-[#1e3a5f] underline">
            Политика конфиденциальности
          </Link>
          {" · "}
          <Link href="/" className="hover:text-[#1e3a5f] underline">
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
