# Голосовой ввод КП — полная архитектура

## Обзор

Функция позволяет пользователю надиктовать данные для КП голосом. Система распознаёт речь,
структурирует её по 6 полям КП и заполняет форму автоматически.

**Стоимость:** Whisper API — $0.006/мин. При 2–3 минутах речи = ~$0.015–0.018 = ~1.5 ₽.
**Источник цены:** OpenAI Pricing page (проверено март 2026).

---

## Компоненты

### 1. Запись аудио в браузере

```javascript
// [VOICE] Модуль записи аудио
// Поддержка: Chrome, Firefox, Safari (iOS 14.5+), Android Chrome

class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,      // Оптимально для Whisper
          channelCount: 1,        // Моно — достаточно для речи
          echoCancellation: true, // Важно для мобильных
          noiseSuppression: true  // Улучшает точность в шуме
        }
      });

      // Выбираем лучший поддерживаемый формат
      const mimeType = this._getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Собираем чанки каждые 250мс для потоковой передачи
      this.mediaRecorder.start(250);
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
      }
      throw error;
    }
  }

  stop() {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType;
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.stream.getTracks().forEach(track => track.stop());
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  _getSupportedMimeType() {
    // Порядок важен: webm/opus — лучшее качество при меньшем размере
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  }
}
```

---

### 2. Отправка в Whisper API (Backend)

**ВАЖНО:** Ключ Whisper API никогда не передавать на фронтенд. Только через backend.

```python
# [VOICE] Backend: транскрипция через Whisper
# Файл: services/voice_transcription.py

import openai
import tempfile
import os
from pathlib import Path

SUPPORTED_FORMATS = {
    'audio/webm': '.webm',
    'audio/webm;codecs=opus': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
}

async def transcribe_audio(audio_bytes: bytes, mime_type: str, language: str = 'ru') -> str:
    """
    Транскрибирует аудио через Whisper API.
    
    Args:
        audio_bytes: Аудио в байтах
        mime_type: MIME-тип аудио от клиента
        language: Язык ('ru' для русского — повышает точность)
    
    Returns:
        Транскрибированный текст
    
    Raises:
        ValueError: Если формат не поддерживается
        openai.APIError: При ошибке API
    """
    extension = SUPPORTED_FORMATS.get(mime_type.split(';')[0])
    if not extension:
        raise ValueError(f"Неподдерживаемый формат аудио: {mime_type}")

    # Лимит Whisper: 25MB. Проверяем заранее.
    MAX_SIZE_BYTES = 25 * 1024 * 1024
    if len(audio_bytes) > MAX_SIZE_BYTES:
        raise ValueError("Аудио слишком длинное. Максимум: ~30 минут.")

    client = openai.AsyncOpenAI()  # Ключ из переменной окружения OPENAI_API_KEY

    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, 'rb') as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                response_format="text",
                # prompt помогает Whisper распознавать бизнес-термины
                prompt=(
                    "Коммерческое предложение, услуги, стоимость, сроки, "
                    "компания, клиент, преимущества, рублей, договор"
                )
            )
        return response
    finally:
        os.unlink(tmp_path)
```

---

### 3. NLU-слой: структурирование текста по полям КП

Это ключевой компонент. Whisper даёт сырой текст — нужно разложить его по 6 полям.

```python
# [VOICE] NLU: структурирование транскрипта
# Файл: services/voice_nlu.py

import json
from openai import AsyncOpenAI

FIELDS_SCHEMA = {
    "company": "Название вашей компании или ваше имя как исполнителя",
    "client": "Название компании или имя клиента, которому отправляется КП",
    "service": "Услуга или продукт, который предлагается",
    "price": "Стоимость услуги (число или диапазон)",
    "deadline": "Срок выполнения работы",
    "advantages": "Ключевые преимущества или почему стоит выбрать вас"
}

SYSTEM_PROMPT = """Ты помощник, который извлекает структурированные данные из транскрипта речи.
Пользователь надиктовал информацию для коммерческого предложения. Извлеки данные в JSON.

Правила:
- Возвращай ТОЛЬКО валидный JSON, без пояснений
- Если поле не упомянуто — значение null
- Не додумывай информацию, только то что сказал пользователь
- Числа в поле price записывай как строку с единицей измерения: "50000 рублей"
- Если сомневаешься в значении поля — пиши null, не угадывай

Схема ответа:
{
  "company": "string или null",
  "client": "string или null", 
  "service": "string или null",
  "price": "string или null",
  "deadline": "string или null",
  "advantages": "string или null",
  "confidence": "high|medium|low",
  "unclear_parts": ["список фраз, которые было сложно распознать или отнести к полю"]
}"""

async def extract_kp_fields(transcript: str) -> dict:
    """
    Извлекает поля КП из транскрипта.
    
    Возвращает словарь с полями и метаданными уверенности.
    """
    client = AsyncOpenAI()
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",  # Достаточно для NLU, дешевле gpt-4
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Транскрипт:\n{transcript}"}
        ],
        response_format={"type": "json_object"},
        temperature=0.1  # Низкая температура = более предсказуемое извлечение
    )
    
    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        # Fallback: возвращаем пустую структуру с транскриптом в advantages
        result = {field: None for field in FIELDS_SCHEMA}
        result["advantages"] = transcript  # Хотя бы не теряем текст
        result["confidence"] = "low"
        result["unclear_parts"] = []
    
    return result
```

---

### 4. API-эндпоинт (Backend)

```python
# [VOICE] API endpoint
# Файл: api/routes/voice.py

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.voice_transcription import transcribe_audio
from services.voice_nlu import extract_kp_fields
from services.auth import get_current_user

router = APIRouter(prefix="/api/voice", tags=["voice"])

# Лимит: 10MB на загрузку (10 минут аудио ~ 5MB в webm/opus)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

@router.post("/transcribe")
async def voice_to_kp_fields(
    audio: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Принимает аудиофайл, возвращает заполненные поля КП.
    
    Требует авторизации. Голосовой ввод доступен всем тарифам.
    """
    # Проверка размера
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, "Аудио слишком большое. Максимум 10MB (~10 минут).")
    
    if len(audio_bytes) < 1000:  # Менее 1KB — скорее всего пустая запись
        raise HTTPException(400, "Аудиозапись слишком короткая.")

    # Шаг 1: Транскрипция
    try:
        transcript = await transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=audio.content_type,
            language='ru'
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, "Ошибка сервиса распознавания речи. Попробуйте ещё раз.")

    if not transcript or len(transcript.strip()) < 10:
        raise HTTPException(422, "Не удалось распознать речь. Говорите чётче или используйте форму.")

    # Шаг 2: Структурирование
    fields = await extract_kp_fields(transcript)
    
    return {
        "transcript": transcript,       # Показываем пользователю для проверки
        "fields": fields,               # Заполненные поля формы
        "can_generate": _can_generate(fields)  # Достаточно ли данных для КП
    }

def _can_generate(fields: dict) -> bool:
    """КП можно генерировать если заполнены хотя бы service и price."""
    return bool(fields.get("service") and fields.get("price"))
```

---

### 5. UI-компонент (React)

```jsx
// [VOICE] Компонент голосового ввода
// Файл: components/VoiceInput.jsx

import { useState, useRef } from 'react';

const STATES = {
  IDLE: 'idle',
  RECORDING: 'recording', 
  PROCESSING: 'processing',
  REVIEW: 'review',
  ERROR: 'error'
};

export function VoiceInput({ onFieldsFilled }) {
  const [state, setState] = useState(STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recorderRef = useRef(null);

  const startRecording = async () => {
    setError('');
    const { VoiceRecorder } = await import('../lib/voiceRecorder');
    recorderRef.current = new VoiceRecorder();
    
    try {
      await recorderRef.current.start();
      setState(STATES.RECORDING);
    } catch (e) {
      setError(e.message);
      setState(STATES.ERROR);
    }
  };

  const stopAndProcess = async () => {
    setState(STATES.PROCESSING);
    
    const blob = await recorderRef.current.stop();
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    try {
      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ошибка распознавания');
      }

      const data = await res.json();
      setTranscript(data.transcript);
      
      // Заполняем форму, но НЕ генерируем КП автоматически
      // Пользователь должен проверить поля
      onFieldsFilled(data.fields, data.transcript);
      setState(STATES.REVIEW);
    } catch (e) {
      setError(e.message);
      setState(STATES.ERROR);
    }
  };

  return (
    <div className="voice-input">
      {state === STATES.IDLE && (
        <button onClick={startRecording} className="btn-voice">
          🎤 Надиктовать КП голосом
        </button>
      )}
      
      {state === STATES.RECORDING && (
        <div className="recording-active">
          <div className="pulse-dot" />
          <span>Говорите... расскажите про услугу, клиента и цену</span>
          <button onClick={stopAndProcess} className="btn-stop">
            ⏹ Готово
          </button>
        </div>
      )}

      {state === STATES.PROCESSING && (
        <div className="processing">
          <span className="spinner" />
          Распознаём речь...
        </div>
      )}

      {state === STATES.REVIEW && (
        <div className="review-block">
          <p className="transcript-label">Мы распознали:</p>
          <p className="transcript-text">{transcript}</p>
          <p className="hint">Проверьте поля ниже и при необходимости исправьте</p>
        </div>
      )}

      {state === STATES.ERROR && (
        <div className="error-block">
          <p>{error}</p>
          <button onClick={() => setState(STATES.IDLE)}>Попробовать ещё раз</button>
        </div>
      )}
    </div>
  );
}
```

---

## Подсказка для пользователя (UX-текст)

Показывать кнопкой «Что говорить?» рядом с микрофоном:

```
Просто расскажите о своём предложении в свободной форме, например:

«Я дизайнер, делаю логотипы. Хочу предложить Ивану из компании СтройПрофи 
разработку фирменного стиля за 35 тысяч рублей. Срок — 2 недели. 
Я работаю уже 7 лет, делал логотипы для 50+ компаний, всегда сдаю в срок.»
```

---

## Известные ограничения и как их обходить

| Ограничение | Решение |
|---|---|
| Точность Whisper падает при шуме | `noiseSuppression: true` в MediaRecorder + подсказка «говорите в тихом месте» |
| Safari iOS < 14.5 не поддерживает MediaRecorder | Показывать fallback: «Обновите Safari или используйте Chrome» |
| Whisper может не распознать профессиональные термины | Параметр `prompt` с бизнес-терминами (уже добавлен в код выше) |
| NLU может неверно отнести фразу к полю | Поэтому всегда показываем transcript + редактируемые поля — пользователь исправляет |
| Задержка ~3–5 сек на транскрипцию | Показывать анимированный лоадер, не пустой экран |