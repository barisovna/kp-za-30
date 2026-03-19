import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — КП за 30 секунд",
  description: "Политика обработки персональных данных сервиса КП за 30 секунд",
};

export default function PrivacyPage() {
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
            Политика конфиденциальности
          </h1>
          <p className="text-sm text-gray-500">Последнее обновление: 19 марта 2026 г.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 text-sm text-[#1e293b] leading-relaxed">

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">1. Кто мы</h2>
            <p>
              Настоящая Политика конфиденциальности описывает, как сервис «КП за 30
              секунд» (далее — «Сервис», «мы») собирает, использует и защищает ваши
              персональные данные при использовании нашего сайта.
            </p>
            <p className="mt-2">
              Контактный email:{" "}
              <a
                href="mailto:medicalx@bk.ru"
                className="text-[#1e3a5f] hover:underline"
              >
                medicalx@bk.ru
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">
              2. Какие данные мы собираем
            </h2>
            <p className="mb-2">Мы можем собирать следующие данные:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Email-адрес</strong> — при регистрации или подписке на
                напоминания.
              </li>
              <li>
                <strong>Данные из формы генерации</strong> — название компании, услуги,
                стоимость и другие поля, которые вы вводите для создания КП.
              </li>
              <li>
                <strong>История КП</strong> — сгенерированные вами документы
                сохраняются в базе данных для обеспечения доступа к ним.
              </li>
              <li>
                <strong>Технические данные</strong> — IP-адрес, тип браузера, страницы
                сайта — автоматически собираются системами аналитики для улучшения
                работы Сервиса.
              </li>
              <li>
                <strong>Платёжные данные</strong> — мы не храним данные банковских карт.
                Платежи обрабатываются через защищённый сервис ЮКасса.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">
              3. Цели обработки данных
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Обеспечение работы Сервиса и генерации КП.</li>
              <li>Управление вашим аккаунтом и тарифом.</li>
              <li>Отправка email-напоминаний (только с вашего согласия).</li>
              <li>Обработка платежей и активация тарифов.</li>
              <li>Техническая поддержка и ответы на ваши обращения.</li>
              <li>Улучшение качества Сервиса на основе агрегированной статистики.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">
              4. Передача данных третьим лицам
            </h2>
            <p className="mb-2">
              Мы не продаём и не передаём ваши персональные данные третьим лицам,
              кроме случаев, необходимых для работы Сервиса:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>DeepSeek</strong> — AI-сервис, которому передаются введённые
                вами данные формы для генерации текста КП.
              </li>
              <li>
                <strong>ЮКасса</strong> — платёжный сервис для обработки транзакций.
              </li>
              <li>
                <strong>Resend</strong> — сервис для отправки email-сообщений.
              </li>
              <li>
                <strong>Vercel</strong> — облачная платформа, на которой работает
                Сервис; данные хранятся в соответствии с их политикой
                конфиденциальности.
              </li>
            </ul>
            <p className="mt-2">
              Все указанные сервисы обрабатывают данные в соответствии со своими
              политиками конфиденциальности и только в целях оказания услуги.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">5. Cookies</h2>
            <p>
              Мы используем cookies и локальное хранилище браузера (localStorage) для:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>сохранения состояния вашей сессии;</li>
              <li>хранения настроек интерфейса;</li>
              <li>отслеживания реферальных переходов;</li>
              <li>сбора агрегированной аналитики посещений.</li>
            </ul>
            <p className="mt-2">
              Вы можете отключить cookies в настройках браузера, однако это может
              ограничить функциональность Сервиса.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">
              6. Хранение и защита данных
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Данные хранятся на защищённых серверах Vercel и Upstash (Redis).
              </li>
              <li>Передача данных осуществляется по зашифрованному протоколу HTTPS.</li>
              <li>
                Мы принимаем разумные меры для защиты ваших данных от
                несанкционированного доступа, но не можем гарантировать абсолютную
                защиту.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">
              7. Срок хранения данных
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>История КП хранится до тех пор, пока ваш аккаунт активен.</li>
              <li>
                Email для уведомлений хранится до момента отписки или удаления аккаунта.
              </li>
              <li>
                После удаления аккаунта ваши данные удаляются в течение 30 дней,
                кроме данных, необходимых для выполнения юридических обязательств.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">8. Ваши права</h2>
            <p className="mb-2">
              В соответствии с Федеральным законом № 152-ФЗ «О персональных данных»
              вы имеете право:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>получить информацию об обработке ваших персональных данных;</li>
              <li>потребовать исправления неточных данных;</li>
              <li>потребовать удаления ваших данных;</li>
              <li>отозвать согласие на обработку персональных данных;</li>
              <li>отписаться от email-уведомлений в любой момент.</li>
            </ul>
            <p className="mt-2">
              Для реализации своих прав обратитесь на{" "}
              <a
                href="mailto:medicalx@bk.ru"
                className="text-[#1e3a5f] hover:underline"
              >
                medicalx@bk.ru
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">
              9. Изменение политики
            </h2>
            <p>
              Мы можем обновлять настоящую Политику. Актуальная версия всегда доступна
              на этой странице. При существенных изменениях мы уведомим вас по email.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-[#1e3a5f] mb-2">10. Контакты</h2>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, пишите нам:{" "}
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
          <Link href="/terms" className="hover:text-[#1e3a5f] underline">
            Пользовательское соглашение
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
