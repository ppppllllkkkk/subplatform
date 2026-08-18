# Subcontractor Platform

Монорепозиторий: `frontend/` (React + Vite) и `backend/` (FastAPI + Python).

Почему две части: это разные языковые окружения (Node.js и Python), у каждого
свой процесс и своя команда запуска — так же будет устроен и деплой на Render
(два отдельных сервиса, не один).

## Быстрый старт (одной командой)

```bash
# один раз — зависимости
cd frontend && npm install && cd ..
pip install -r backend/requirements.txt   # или через venv, см. backend/README.md
npm install                                # concurrently для запуска обеих частей разом

# дальше — одной командой
npm run dev
```

Откроется фронтенд на `http://localhost:5173`, бэкенд — на `http://localhost:8000`,
в одном терминале с подписанными логами `[frontend]` / `[backend]`.

Подробности по каждой части — в `frontend/README.md` и `backend/README.md`.

## Деплой на Render

Корневой `render.yaml` — это [Blueprint](https://render.com/docs/infrastructure-as-code),
который одной операцией разворачивает оба сервиса:
- **`subcontractor-platform-api`** — backend, Docker-образ (нужен для
  tesseract/poppler, см. `backend/Dockerfile`);
- **`subcontractor-platform-web`** — frontend, статическая сборка (Vite `dist/`).

Адреса сервисов автоматически подставляются друг другу (CORS на бэкенде и
`VITE_API_URL` на фронтенде) — вручную ничего прописывать не нужно, даже если
Render добавит суффикс к имени сервиса из-за занятого поддомена.

**Шаги:**
1. Залейте репозиторий в git и запушьте на GitHub/GitLab (см. ниже — как
   инициализировать git, если ещё не сделано).
2. В [Render Dashboard](https://dashboard.render.com): **New → Blueprint** →
   выберите репозиторий. Render найдёт `render.yaml` в корне и покажет оба
   сервиса для подтверждения.
3. Нажмите **Apply** — Render соберёт backend (Docker, с OCR-пакетами) и
   frontend (статика) и задеплоит оба.
4. Первый деплой на free-плане может занять несколько минут (сборка Docker-
   образа с tesseract/poppler). После этого оба сервиса будут доступны на
   `https://subcontractor-platform-api.onrender.com` и
   `https://subcontractor-platform-web.onrender.com` (или с суффиксом, если
   имя занято — актуальный адрес Render покажет в дашборде).

**Важно про free-план Render:** бесплатные веб-сервисы «засыпают» после
15 минут без запросов и просыпаются ~30–60 секунд на первый запрос после сна —
это нормально, не ошибка.

### Инициализация git (если репозиторий ещё не в git)

```bash
git init
git add .
git commit -m "Initial commit"
# затем создайте пустой репозиторий на GitHub и:
git remote add origin <URL вашего репозитория>
git branch -M main
git push -u origin main
```

`.gitignore` в корне и в `backend/` уже настроены так, чтобы `node_modules/` и
`venv/` не попали в git — это важно: `venv`, собранный локально на вашей
машине, не будет работать в Docker-образе Render (другая ОС/архитектура), а
сам Render всё равно ставит зависимости заново по `requirements.txt` /
`package.json`.
