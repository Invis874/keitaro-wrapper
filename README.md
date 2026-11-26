# Keitaro Wrapper

![Docker](https://img.shields.io/badge/Docker-✓-blue?logo=docker)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Keitaro](https://img.shields.io/badge/Keitaro-API-orange)

Тестовое задание: обёртка над рекламным трекером Keitaro.

## Что делает

1. **Создаватор кампаний** — форма с названием, GEO (мультивыбор) и ID оффера. Создаёт кампанию с двумя потоками:
   - Первый поток: фильтр по выбранным странам → редирект на `google.com`.
   - Второй поток: оффер (редирект на лендинг).
2. **Редактор кампаний** — позволяет добавлять/удалять офферы в потоке, менять `share` (вес), закреплять проценты, редактировать GEO-поток. Все изменения копятся локально и отправляются в Keitaro по кнопке **Push**. Есть **Pull** (загрузить свежие данные из Keitaro) и **Cancel** (сбросить локальные изменения).

## Стек

- **Бэкенд:** FastAPI, SQLAlchemy (async), PostgreSQL, httpx.
- **Фронтенд:** React (Vite), Tailwind CSS.
- **Инфраструктура:** Docker, docker-compose.

## Запуск

1. Клонируй репозиторий:
   ```bash
   git clone <url>
   cd <project>
   ```

2. Создай `.env` в корне проекта (рядом с `docker-compose.yml`):
   ```bash
   cp .env .env.backup
   ```

3. Запусти через Docker:
   ```bash
   docker-compose up --build
   ```

4. После запуска:
- Бэкенд: `http://localhost:8000` (Swagger: `http://localhost:8000/docs`).
- Фронтенд: `http://localhost:3000`.

## Первоначальная настройка

Перед первым использованием нужно заполнить кэш офферов (чтобы работал автокомплит). Выполни:
   ```bash
   curl -X POST http://localhost:8000/api/campaigns/sync-offers
   ```
Или через Swagger UI: `POST /api/campaigns/sync-offers`.

## Как пользоваться

1. Открой `http://localhost:3000/create`.
2. Заполни форму:
   - Имя кампании (без префикса `test_фамилия_` — он добавится автоматически).
   - Гео: выбери страны из выпадающего списка.
   - Оффер: начни вводить ID или название, выбери из подсказок.
3. Нажми «Создать». Кампания появится в Keitaro с двумя потоками.
4. Перейди в `http://localhost:3000/edit` → выбери кампанию → «Редактировать».
5. В редакторе:
   - Добавляй/удаляй офферы, меняй `share`, закрепляй проценты.
   - Редактируй GEO-поток (страны).
   - Изменения копятся локально (жёлтый индикатор в шапке).
   - **Push** — отправить изменения в Keitaro.
   - **Cancel** — сбросить локальные изменения.
   - **Pull** — загрузить свежие данные из Keitaro (только если нет несохранённых изменений).

## Архитектура

- **Бэкенд** — тонкая прослойка над Keitaro API. Не хранит «живые» данные кампаний, а только кэш офферов (`offers_cache`) и локальные черновики (`stream_drafts`).
- **`GET /api/streams/{campaign_id}`** возвращает **оригинальный ответ Keitaro** (в поле `offers`) плюс отдельное поле `local_drafts` с нашими локальными данными (`pinned`, `is_orphaned`, `name`). Фронт мержит их при отображении.
- **`POST /api/streams/{campaign_id}/push`** принимает полный список офферов от фронта, отправляет `PUT` в Keitaro и синхронизирует БД.
- **`StreamDraft`** в БД хранит историю офферов (включая «сирот» — удалённых из Keitaro, но оставшихся в истории).

## Миграции и сброс БД

Таблицы создаются автоматически при старте бэкенда (`Base.metadata.create_all`). Если нужно сбросить БД:

```
docker-compose down -v
docker-compose up --build
```

## Примечания

- Проект использует учебный стенд Keitaro (`keitaro-for-tests.etolegko.com`). Он поддерживает только те методы, которые нужны для задания.
- API-ключ и URL стенда — в `.env`. Не коммить `.env` в репозиторий (он в `.gitignore`).
- Названия кампаний должны начинаться с `test_фамилия_` (например, `test_ivanov_campaign1`). Форма добавляет префикс автоматически.