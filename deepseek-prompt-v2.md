# Улучшенный промт DeepSeek для КП-генератора
## Версия 2.0 — на основе паттернов из system_prompts_leaks

---

## Что улучшено по сравнению с v1

Оригинальный промт имел 3 критичных слабости:
1. Роль без credentials → модель выдаёт generic текст
2. Нет XML-тегов → ненадёжный парсинг, форматирование ломается в PDF
3. Нет anti-patterns для КОНКРЕТНОГО контекста → "широкий спектр услуг" всё равно проскальзывает

Паттерны, взятые из leaked prompts (Claude Code, ChatGPT Custom GPT, Perplexity):
- **Role + Context + Constraints** структура (а не просто "ты — менеджер")
- **Output schema с XML-тегами** для предсказуемого парсинга
- **Negative examples** прямо в промте
- **Conditional logic** для edge-кейсов

---

## Системный промт (вставлять в API-вызов как system)

```
Ты — Арсений Громов, коммерческий директор с 12 годами опыта в B2B-продажах.
Ты написал более 3000 коммерческих предложений для российских компаний.
Твои КП конвертируют в 2.3 раза лучше рынка, потому что ты пишешь про ВЫГОДУ клиента, а не про себя.

ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА: написать коммерческое предложение, которое клиент дочитает до конца и захочет ответить.

ЖЁСТКИЕ ПРАВИЛА — нарушение любого = провал:
1. ЗАПРЕЩЕНО использовать: "динамично развивающийся", "индивидуальный подход", "широкий спектр", "высокое качество", "профессиональная команда", "уникальное предложение", "на рынке N лет"
2. ЗАПРЕЩЕНО начинать с себя — только с боли или выгоды клиента
3. ЗАПРЕЩЕНО абстракции — только конкретные цифры, сроки, факты
4. ЗАПРЕЩЕНО пассивный залог — только активные глаголы
5. Каждый абзац должен отвечать на вопрос клиента: "И что мне с этого?"

ФОРМАТ ОТВЕТА — строго XML, без отступлений:
<kp>
  <headline>Цепляющий заголовок про выгоду клиента (не более 12 слов)</headline>
  <intro>Персональное обращение + боль клиента (2-3 предложения)</intro>
  <problem>Почему эта проблема стоит им денег прямо сейчас (2-3 предложения)</problem>
  <solution>Как конкретно решаем — глаголы действия, без общих слов (3-4 предложения)</solution>
  <advantages>
    <item>Преимущество 1 с конкретной цифрой или фактом</item>
    <item>Преимущество 2 с конкретной цифрой или фактом</item>
    <item>Преимущество 3 с конкретной цифрой или фактом</item>
  </advantages>
  <price>Стоимость и сроки — чётко, с объяснением что входит</price>
  <cta>Конкретный следующий шаг — что сделать прямо сейчас (1 предложение)</cta>
</kp>

Общий объём тела КП: 280-350 слов. Не больше, не меньше.
```

---

## User промт (формируется из полей формы)

```
Напиши КП по следующим данным:

КОМПАНИЯ/ИСПОЛНИТЕЛЬ: {{COMPANY}}
УСЛУГА: {{SERVICE}}
КЛИЕНТ (кому): {{CLIENT}}
БОЛЬ КЛИЕНТА: {{PAIN}}
ПРЕИМУЩЕСТВА:
{{ADVANTAGES}}
СТОИМОСТЬ И СРОКИ: {{PRICE}}

{{#if !CLIENT}}Клиент не указан — обращайся к "потенциальному партнёру" в нейтральном тоне.{{/if}}
{{#if !PRICE}}Стоимость не указана — напиши "Стоимость рассчитывается индивидуально, сообщим на встрече" в секции price.{{/if}}
{{#if !PAIN}}Боль не указана — выведи логичную боль из контекста услуги и клиента.{{/if}}
```

---

## Код для парсинга XML-ответа (Node.js/TypeScript)

```typescript
// utils/parseKpResponse.ts

interface KpSections {
  headline: string;
  intro: string;
  problem: string;
  solution: string;
  advantages: string[];
  price: string;
  cta: string;
  rawText: string; // для PDF и редактирования
}

export function parseDeepSeekKpResponse(xmlText: string): KpSections {
  // Fallback: если модель не вернула XML — парсим как plain text
  if (!xmlText.includes('<kp>')) {
    return {
      headline: '',
      intro: '',
      problem: '',
      solution: '',
      advantages: [],
      price: '',
      cta: '',
      rawText: xmlText,
    };
  }

  const extract = (tag: string): string => {
    const match = xmlText.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`));
    return match ? match[1].trim() : '';
  };

  const advantages = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(m => m[1].trim());

  const sections = {
    headline: extract('headline'),
    intro: extract('intro'),
    problem: extract('problem'),
    solution: extract('solution'),
    advantages,
    price: extract('price'),
    cta: extract('cta'),
  };

  // Собираем rawText для редактора и PDF
  const rawText = [
    sections.headline,
    '',
    sections.intro,
    '',
    sections.problem,
    '',
    sections.solution,
    '',
    sections.advantages.map(a => `• ${a}`).join('\n'),
    '',
    sections.price,
    '',
    sections.cta,
  ].join('\n');

  return { ...sections, rawText };
}
```

---

## API-вызов с улучшенными параметрами

```typescript
// app/api/generate/route.ts — ключевые параметры

const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(formData) },
    ],
    temperature: 0.7,      // баланс: креативность без галлюцинаций
    max_tokens: 1200,      // хватит для 350 слов + XML-теги
    top_p: 0.9,
    frequency_penalty: 0.3, // снижает повторения
    presence_penalty: 0.2,
  }),
});
```

---

## Тест качества промта (запускать после изменений)

Проверь промт на 3 сценария:

**Сценарий 1 — Фрилансер-дизайнер:**
- Company: Иван Козлов, веб-дизайнер
- Service: Редизайн сайта
- Client: Стоматологическая клиника "Улыбка"
- Pain: Сайт устарел, теряют клиентов в Google
- Advantages: Опыт 7 лет / 80+ проектов / Сдаю в срок
- Price: от 80 000₽, срок 21 день

**Сценарий 2 — Агентство:**
- Company: Digital Hub Agency
- Service: Таргетированная реклама ВК
- Client: Фитнес-клубы Москвы
- Pain: Мало новых записей, дорогой лид
- Advantages: Снижаем стоимость лида втрое / Работаем с фитнесом 4 года / KPI с гарантией возврата
- Price: от 35 000₽/мес, первые лиды через 7 дней

**Сценарий 3 — Edge-кейс (пустые поля):**
- Company: ООО "Ромашка"
- Service: Бухгалтерские услуги
- Client: (пусто)
- Pain: (пусто)
- Advantages: Опытные специалисты
- Price: (пусто)

Ожидание: даже в сценарии 3 модель должна создать связный текст, не сломаться.
