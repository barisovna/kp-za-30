# Тарифы и биллинг

## Схема тарифов

| Тариф | Цена | КП | Функции |
|---|---|---|---|
| Free | 0 ₽ | 3 всего | Базовые поля, PDF |
| One-time | 199 ₽/шт | 1 КП | Как Basic |
| Basic | 990 ₽/мес | Безлимит | Голос, история, TG-бот |
| Basic Yearly | 7 990 ₽/год | Безлимит | Как Basic + скидка 33% |
| Pro | 1 990 ₽/мес | Безлимит | Всё + брендинг, стили, DOCX, трекер |
| Pro Yearly | 15 990 ₽/год | Безлимит | Как Pro + скидка 33% |

## Схема БД

```sql
-- [F01][F02][F03] Расширенная схема пользователя
ALTER TABLE users ADD COLUMN plan_tier VARCHAR(20) DEFAULT 'free'
  CHECK (plan_tier IN ('free', 'basic', 'pro'));

ALTER TABLE users ADD COLUMN plan_period VARCHAR(10) DEFAULT 'monthly'
  CHECK (plan_period IN ('monthly', 'yearly'));

ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN one_time_credits INT DEFAULT 0;
ALTER TABLE users ADD COLUMN free_kp_used INT DEFAULT 0;

-- [F04] Реферальная программа
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id),
  referee_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  amount_rub DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
```

## Логика списания

```python
# services/quota.py

def can_generate_kp(user) -> tuple[bool, str]:
    """Проверяет может ли пользователь создать КП. Возвращает (can, reason)."""
    
    if user.plan_tier in ('basic', 'pro'):
        if user.subscription_ends_at > datetime.now():
            return True, 'subscription'
        else:
            return False, 'subscription_expired'
    
    if user.one_time_credits > 0:
        return True, 'one_time'
    
    if user.free_kp_used < 3:
        return True, 'free'
    
    return False, 'limit_reached'

def consume_quota(user):
    """Списывает одно КП с баланса."""
    can, reason = can_generate_kp(user)
    if not can:
        raise QuotaExceededError()
    
    if reason == 'free':
        user.free_kp_used += 1
    elif reason == 'one_time':
        user.one_time_credits -= 1
    
    db.session.commit()
```