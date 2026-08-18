"""
Общее хранилище базы субподрядчиков (одна запись на всю команду).

Простое решение осознанно: категории/строки хранятся целиком одним JSON-полем
(как и раньше в localStorage на фронтенде), без разбора на таблицы — той же
структуре, что уже парсит workbook.js. Если данных станет много и появится
потребность в more сложных запросах (фильтрация на сервере, история изменений
и т.п.) — тогда есть смысл разложить в нормальные таблицы.

DATABASE_URL берётся из переменной окружения (на Render — Render Postgres,
подставляется автоматически через render.yaml). Если переменная не задана
(например, локальная разработка без Postgres), функции просто отключены —
эндпоинты вернут понятную ошибку, а не упадут при старте.
"""

import os
import json

DATABASE_URL = os.environ.get("DATABASE_URL")

_pool = None


def _get_conn():
    import psycopg

    return psycopg.connect(DATABASE_URL)


def is_configured() -> bool:
    return bool(DATABASE_URL)


def init_db():
    if not is_configured():
        return
    with _get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workbook_store (
                id INTEGER PRIMARY KEY DEFAULT 1,
                file_name TEXT,
                categories JSONB,
                updated_at TIMESTAMPTZ DEFAULT now(),
                CONSTRAINT single_row CHECK (id = 1)
            )
            """
        )
        conn.commit()


def load_workbook():
    if not is_configured():
        return None
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT file_name, categories FROM workbook_store WHERE id = 1"
        ).fetchone()
        if not row:
            return None
        file_name, categories = row
        return {"fileName": file_name, "categories": categories}


def save_workbook(file_name: str, categories: list):
    if not is_configured():
        return
    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO workbook_store (id, file_name, categories, updated_at)
            VALUES (1, %s, %s, now())
            ON CONFLICT (id) DO UPDATE
            SET file_name = EXCLUDED.file_name,
                categories = EXCLUDED.categories,
                updated_at = now()
            """,
            (file_name, json.dumps(categories)),
        )
        conn.commit()


def clear_workbook():
    if not is_configured():
        return
    with _get_conn() as conn:
        conn.execute("DELETE FROM workbook_store WHERE id = 1")
        conn.commit()
