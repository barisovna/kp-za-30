# A/B тест: демо КП на лендинге без регистрации

## Суть

Версия B лендинга показывает интерактивный генератор прямо на главной странице —
без регистрации, без почты, с мгновенным результатом. Цель: пользователь видит
качество КП до принятия решения о регистрации.

## Архитектура A/B теста

### Разделение трафика (без внешних платформ)

```javascript
// [F14] A/B сплит на уровне middleware / Edge функции
// Файл: middleware/ab-split.js (Next.js) или nginx-lua (backend)

const AB_COOKIE = 'kp_ab_variant';
const AB_RATIO = 0.5; // 50/50

export function getVariant(req) {
  // Сначала проверяем cookie — sticky session
  const existing = req.cookies[AB_COOKIE];
  if (existing === 'A' || existing === 'B') return existing;
  
  // Новый пользователь — случайно назначаем
  return Math.random() < AB_RATIO ? 'B' : 'A';
}

// В Next.js middleware:
export function middleware(req) {
  const variant = getVariant(req);
  const res = NextResponse.next();
  
  // Закрепляем вариант в cookie на 30 дней
  res.cookies.set(AB_COOKIE, variant, { maxAge: 30 * 24 * 60 * 60 });
  
  // Передаём вариант в заголовке для аналитики
  res.headers.set('X-AB-Variant', variant);
  
  return res;
}
```

### Лендинг: Версия A (контроль)

Стандартная страница с кнопкой «Попробовать бесплатно» → переход на регистрацию.

### Лендинг: Версия B (тест)

```jsx
// [F14] Демо-блок на лендинге
// Файл: components/landing/DemoBlock.jsx

import { useState } from 'react';

const DEMO_SERVICES = [
  'Разработка сайта', 'SMM-продвижение', 'Дизайн логотипа',
  'SEO-оптимизация', 'Бухгалтерские услуги', 'Юридическая консультация'
];

export function DemoBlock() {
  const [service, setService] = useState('');
  const [client, setClient] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [usedDemo, setUsedDemo] = useState(false);

  const generateDemo = async () => {
    if (!service.trim()) return;
    if (usedDemo) {
      // Вторая попытка → показываем CTA регистрации
      setShowCTA(true);
      return;
    }
    
    setLoading(true);
    setResult('');
    
    try {
      const res = await fetch('/api/demo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, client: client || 'вашему клиенту' })
      });
      
      const data = await res.json();
      
      // Стриминг текста посимвольно для эффекта печатания
      let i = 0;
      const text = data.preview; // Первые 2-3 абзаца КП
      const interval = setInterval(() => {
        setResult(text.slice(0, i));
        i += 3;
        if (i > text.length) {
          clearInterval(interval);
          setShowCTA(true);
          setUsedDemo(true);
        }
      }, 20);
      
      // Аналитика
      trackEvent('demo_generated', { service, variant: 'B' });
    } catch {
      setResult('Не удалось сгенерировать. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="demo-section">
      <h2>Попробуйте прямо сейчас — без регистрации</h2>
      
      <div className="demo-form">
        <div className="field">
          <label>Ваша услуга</label>
          <input
            value={service}
            onChange={e => setService(e.target.value)}
            placeholder="Например: разработка сайта"
            list="services-list"
          />
          <datalist id="services-list">
            {DEMO_SERVICES.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        
        <div className="field">
          <label>Кому отправляете (необязательно)</label>
          <input
            value={client}
            onChange={e => setClient(e.target.value)}
            placeholder="Например: строительной компании"
          />
        </div>
        
        <button 
          onClick={generateDemo}
          disabled={loading || !service.trim()}
          className="btn-demo-generate"
        >
          {loading ? 'Составляем КП...' : '✨ Показать пример КП'}
        </button>
      </div>

      {result && (
        <div className="demo-result">
          <div className="result-label">Вот что получится:</div>
          <div className="result-text">{result}</div>
          {showCTA && (
            <div className="demo-cta-block">
              <p className="blur-hint">...и ещё 3 раздела + красивый PDF</p>
              <a href="/register" className="btn-primary">
                Получить полное КП бесплатно →
              </a>
              <p className="hint-text">3 КП бесплатно, без карты</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

### Backend: демо-эндпоинт

```python
# [F14] Демо-генератор (без авторизации, с rate limiting)
# Файл: api/routes/demo.py

from fastapi import APIRouter, Request, HTTPException
from services.llm import generate_kp_preview
import redis

router = APIRouter(prefix="/api/demo")
redis_client = redis.Redis(host='localhost', port=6379, db=1)

DEMO_RATE_LIMIT = 1          # 1 попытка
DEMO_WINDOW_SECONDS = 86400  # в сутки

@router.post("/generate")
async def demo_generate(request: Request, data: dict):
    # Rate limiting по IP — строго 1 раз в сутки
    ip = request.client.host
    key = f"demo_limit:{ip}"
    
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, DEMO_WINDOW_SECONDS)
    
    if count > DEMO_RATE_LIMIT:
        raise HTTPException(429, {
            "message": "Демо уже использовано",
            "redirect": "/register"
        })
    
    service = data.get("service", "").strip()[:100]  # Защита от инъекций
    client = data.get("client", "вашему клиенту").strip()[:100]
    
    if not service:
        raise HTTPException(400, "Укажите услугу")
    
    # Генерируем только ПРЕВЬЮ: вступление + 1 раздел (не полное КП)
    preview = await generate_kp_preview(service=service, client=client)
    
    return {"preview": preview}
```

---

## Метрики для отслеживания

```python
# [F14] События для аналитики (Amplitude / Posthog / собственное)

EVENTS = {
    # Воронка версии B
    'demo_form_viewed':   'Пользователь увидел форму демо',
    'demo_started':       'Нажал кнопку "Показать пример"',
    'demo_completed':     'Увидел результат демо',
    'demo_cta_clicked':   'Нажал CTA после демо',
    
    # Общие
    'registered':         'Зарегистрировался',
    'first_kp_created':   'Создал первое КП',
    'converted_to_paid':  'Оплатил подписку',
}

# Ключевые воронки для сравнения A vs B:
# A: landing_view → registered → first_kp → paid
# B: landing_view → demo_started → demo_completed → cta_clicked → registered → first_kp → paid
```

## Минимальный объём трафика для достоверного теста

При базовой конверсии лендинга 3–5% и желаемом обнаружении эффекта +20%:

- Нужно **минимум 2 000 уникальных посетителей на каждую версию** (итого 4 000)
- При 100 посетителях в день → тест займёт ~40 дней
- При 500 посетителях в день → ~8 дней

Не делать выводов раньше достижения этого объёма.

## CSS для blur-эффекта «скрытого продолжения»

```css
/* [F14] Визуальный намёк что КП продолжается за пределами демо */
.demo-result {
  position: relative;
  max-height: 320px;
  overflow: hidden;
}

.demo-result::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(transparent, var(--bg-page));
  pointer-events: none;
}

.blur-hint {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  margin: 8px 0 16px;
}
```