// Вызов DeepSeek API для генерации КП

export type KpTone = "official" | "friendly" | "aggressive";

export interface KpInput {
  companyName: string;
  clientName: string;
  service: string;
  price: string;
  deadline: string;
  advantages: string;
  tone?: KpTone;
}

export async function generateKp(input: KpInput): Promise<string> {
  const prompt = buildPrompt(input);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3500,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const TONE_INSTRUCTIONS: Record<KpTone, string> = {
  official:
    "Стиль: официально-деловой. Строгий, профессиональный язык без эмоций. Акцент на надёжности, опыте и конкретных результатах.",
  friendly:
    "Стиль: дружелюбный, живой, партнёрский. Пиши как опытный коллега — тепло, без канцеляризмов, с заботой о клиенте.",
  aggressive:
    "Стиль: агрессивные продажи. Давление на боли клиента, ощущение срочности и упущенной выгоды. Сильные глаголы, призывы к немедленному действию.",
};

function buildPrompt(input: KpInput): string {
  const tone = input.tone ?? "official";
  const toneInstruction = TONE_INSTRUCTIONS[tone];

  return `Ты — эксперт по написанию развёрнутых коммерческих предложений для российского бизнеса.

Создай детальное, профессиональное коммерческое предложение на 2 страницы формата A4.
Каждый раздел должен быть содержательным и убедительным.

${toneInstruction}

Данные клиента:
- Наша компания: ${input.companyName}
- Клиент: ${input.clientName}
- Услуга/продукт: ${input.service}
- Общая стоимость: ${input.price}
- Общий срок: ${input.deadline}
- Наши преимущества: ${input.advantages}

КРИТИЧЕСКИ ВАЖНО: Верни ТОЛЬКО XML без лишнего текста. Строго соблюдай имена тегов — используй <desc>, а НЕ <description>. В блоке <timeline> используй теги <step>, а НЕ обычный текст.

<kp>
  <title>Конкретный заголовок КП (упоминает услугу и клиента)</title>

  <greeting>Развёрнутое обращение к клиенту (3-4 предложения): приветствие, кто мы, что предлагаем именно им</greeting>

  <about>О компании (5-7 предложений): история, специализация, ключевые цифры достижений, почему нам доверяют</about>

  <offer>Детальное описание предложения (6-8 предложений): что именно входит в услугу, как будет реализовано, какой конкретный результат получит клиент, что делает это предложение выгодным</offer>

  <benefits>
    <item>Краткое преимущество для простых шаблонов 1</item>
    <item>Краткое преимущество 2</item>
    <item>Краткое преимущество 3</item>
  </benefits>

  <benefitCards>
    <card><title>Название преимущества 1</title><desc>Описание с конкретикой (1-2 предложения)</desc></card>
    <card><title>Название преимущества 2</title><desc>Описание с конкретикой (1-2 предложения)</desc></card>
    <card><title>Название преимущества 3</title><desc>Описание с конкретикой (1-2 предложения)</desc></card>
    <card><title>Название преимущества 4</title><desc>Описание с конкретикой (1-2 предложения)</desc></card>
    <card><title>Название преимущества 5</title><desc>Описание с конкретикой (1-2 предложения)</desc></card>
    <card><title>Название преимущества 6</title><desc>Описание с конкретикой (1-2 предложения)</desc></card>
  </benefitCards>

  <priceItems>
    <item><name>Этап/услуга 1</name><desc>Краткое описание что входит</desc><price>стоимость</price></item>
    <item><name>Этап/услуга 2</name><desc>Краткое описание что входит</desc><price>стоимость</price></item>
    <item><name>Этап/услуга 3</name><desc>Краткое описание что входит</desc><price>стоимость</price></item>
    <item><name>Этап/услуга 4</name><desc>Краткое описание что входит</desc><price>стоимость</price></item>
  </priceItems>
  <priceTotal>${input.price}</priceTotal>

  <timeline>
    <step><title>Этап 1: название</title><duration>Срок: X дней</duration><desc>Что делается, какой результат этапа</desc></step>
    <step><title>Этап 2: название</title><duration>Срок: X дней</duration><desc>Что делается, какой результат этапа</desc></step>
    <step><title>Этап 3: название</title><duration>Срок: X дней</duration><desc>Что делается, какой результат этапа</desc></step>
    <step><title>Этап 4: финал</title><duration>Срок: X дней</duration><desc>Что делается, какой результат этапа</desc></step>
  </timeline>

  <conditions>
    <item>Условие сотрудничества 1 (оплата, гарантии, правки и т.д.)</item>
    <item>Условие сотрудничества 2</item>
    <item>Условие сотрудничества 3</item>
    <item>Условие сотрудничества 4</item>
    <item>Условие сотрудничества 5</item>
  </conditions>

  <price>${input.price}</price>
  <deadline>${input.deadline}</deadline>

  <cta>Призыв к действию (3-4 предложения): конкретный призыв, что будет если не действовать, ограничение по времени</cta>

  <signature>С уважением, команда ${input.companyName}. Контакты и должность</signature>
</kp>`;
}
