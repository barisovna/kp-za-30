# КП за 30 секунд — Улучшенные материалы для Claude Code

## Что в этой папке

```
kp-generator/
├── deepseek-prompt-v2.md          ← Улучшенный промт (v2) + парсер + тест
└── skills/
    ├── SKILL-frontend-design-kp-saas.md     ← Скилл 1: UI для Russian B2B
    ├── SKILL-playwright-kp-testing.md       ← Скилл 2: E2E тесты
    └── SKILL-mcp-builder-kp-integrations.md ← Скилл 3: MCP для DeepSeek/ЮКасса/KV
```

---

## Как использовать скиллы в Claude Code

Три способа подключить скиллы:

**Способ 1 — Указать в промте напрямую:**
```
Создай лендинг. Используй skill: frontend-design-kp-saas.
(прикрепи файл SKILL-frontend-design-kp-saas.md к сообщению)
```

**Способ 2 — Положить в проект как .claude/skills/:**
```
kp-za-30/
└── .claude/
    └── skills/
        ├── frontend-design-kp-saas.md
        ├── playwright-kp-testing.md
        └── mcp-builder-kp-integrations.md
```
Claude Code автоматически их найдёт.

**Способ 3 — Добавить в CLAUDE.md (project instructions):**
```markdown
## Скиллы этого проекта
- UI → см. .claude/skills/frontend-design-kp-saas.md
- Тесты → см. .claude/skills/playwright-kp-testing.md
- MCP → см. .claude/skills/mcp-builder-kp-integrations.md
```

---

## Таймлайн использования

**День 1 (MVP локально):**
- Скилл: frontend-design-kp-saas → лендинг + форма
- Промт: deepseek-prompt-v2.md → вставить в /api/generate

**День 2 (PDF доводка):**
- Скилл: frontend-design-kp-saas → страница /result

**День 3 (деплой):**
- Скилл: mcp-builder-kp-integrations → Vercel KV MCP для отладки

**День 4 (оплата):**
- Скилл: mcp-builder-kp-integrations → ЮКасса MCP

**День 5 (тестирование):**
- Скилл: playwright-kp-testing → полное E2E покрытие

---

## Ключевые улучшения vs оригинальный промт

| | v1 (оригинал) | v2 (улучшенный) |
|---|---|---|
| Роль | "опытный менеджер" | Арсений Громов, 12 лет, 3000+ КП |
| Вывод | plain text | XML с тегами |
| Парсинг | ненадёжный | TypeScript функция с fallback |
| Anti-patterns | 7 слов | 15+ конкретных запрещённых фраз |
| Edge-кейсы | нет | conditional logic для пустых полей |
| Temperature | не указан | 0.7 + frequency_penalty 0.3 |
| Тест | нет | 3 сценария с ожиданиями |
