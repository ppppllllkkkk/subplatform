"""
Извлечение пар (курс, цена) из вендорского прайс-листа.

Пробуем сначала прочитать как обычный текстовый PDF (pdfplumber, без ИИ).
Если текстового слоя нет вообще — значит, это скан, и достаём текст через
OCR (tesseract). Само чтение (текстом или через OCR) не требует ИИ; вопрос
понимания смысла ("что это за курс") решается отдельно, в cbe_match.py.
"""

import os
import re
import subprocess
import tempfile

import pdfplumber

PRICE_RE = re.compile(r"(\d[\d\s]{2,7}\d|\d{3,7})\s*$")


def _clean(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def _has_text_layer(pdf) -> bool:
    for page in pdf.pages:
        if (page.extract_text() or "").strip():
            return True
    return False


def _extract_via_tables(pdf) -> list[dict]:
    items = []
    price_re = re.compile(r"^[\d\s\u00a0]{3,8}$")

    for page in pdf.pages:
        for table in page.extract_tables():
            pending_desc = None
            pending_online = None
            pending_offline = None

            def flush():
                price = pending_offline or pending_online
                if pending_desc and price:
                    items.append({"description": pending_desc, "price": price})

            for row in table:
                cells = [_clean(c) for c in row]
                if not any(cells):
                    continue

                desc_candidate = None
                for c in cells:
                    if c and len(c) >= 8 and c.lower() not in ("онлайн", "офлайн") \
                            and not price_re.match(c):
                        desc_candidate = c
                        break

                fmt = None
                if any((c or "").strip().lower() == "офлайн" for c in cells):
                    fmt = "offline"
                elif any((c or "").strip().lower() == "онлайн" for c in cells):
                    fmt = "online"

                price = None
                for c in reversed(cells):
                    if c and price_re.match(c.replace("\u00a0", " ")):
                        price = c.replace(" ", "").replace("\u00a0", "")
                        break

                if desc_candidate:
                    # Началось описание нового курса — сохраняем предыдущий
                    flush()
                    pending_desc, pending_online, pending_offline = desc_candidate, None, None
                    if fmt == "offline":
                        pending_offline = price
                    elif price:
                        pending_online = price
                else:
                    # Строка-продолжение (обычно вторая строка с Офлайн-ценой)
                    if fmt == "offline" and price:
                        pending_offline = price
                    elif fmt == "online" and price:
                        pending_online = price
                    elif price and not pending_online and not pending_offline:
                        pending_online = price

            flush()

    return items


def _extract_via_ocr(file_path: str) -> list[dict]:
    tessdata_dir = os.environ.get("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/5/tessdata")
    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, "page")
        subprocess.run(
            ["pdftoppm", "-jpeg", "-r", "300", file_path, prefix],
            check=True, capture_output=True,
        )
        text_chunks = []
        for name in sorted(os.listdir(tmp)):
            if name.endswith(".jpg"):
                out_prefix = os.path.join(tmp, "out")
                env = dict(os.environ, TESSDATA_PREFIX=tessdata_dir)
                subprocess.run(
                    ["tesseract", os.path.join(tmp, name), out_prefix, "-l", "rus+eng"],
                    check=True, capture_output=True, env=env,
                )
                with open(out_prefix + ".txt", encoding="utf-8") as f:
                    text_chunks.append(f.read())
        full_text = "\n".join(text_chunks)

    items = []
    lines = [_clean(l) for l in full_text.splitlines()]
    lines = [l for l in lines]
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line:
            i += 1
            continue
        m = PRICE_RE.search(line)
        if not m:
            i += 1
            continue
        price = m.group(1).replace(" ", "")
        description = line[: m.start()].strip(" .:-|")

        # Склеиваем последующие строки-продолжения (без своей цены и без
        # маркера новой позиции вида "8 |") в одно описание. Пустые строки
        # между продолжениями пропускаем, а не считаем концом описания.
        j = i + 1
        merges = 0
        while j < len(lines) and merges < 2:
            if not lines[j]:
                j += 1
                continue
            if PRICE_RE.search(lines[j]) or re.match(r"^\d{1,2}\s*[|\.]", lines[j]):
                break
            description += " " + lines[j]
            merges += 1
            j += 1
        i = j

        if len(description) < 8 or not re.search(r"[A-Za-zА-Яа-я]{4,}", description):
            continue
        items.append({"description": _clean(description), "price": price})
    return items


def extract_vendor_items(file_path: str) -> dict:
    """Возвращает {"source": "text"|"ocr", "raw_text": str, "items": [...]}."""
    with pdfplumber.open(file_path) as pdf:
        if _has_text_layer(pdf):
            items = _extract_via_tables(pdf)
            raw_text = "\n".join((p.extract_text() or "") for p in pdf.pages)
            if items:
                return {"source": "text", "raw_text": raw_text, "items": items}

    # Либо не было текстового слоя, либо не удалось выделить таблицу — OCR.
    items = _extract_via_ocr(file_path)
    return {"source": "ocr", "raw_text": "", "items": items}
