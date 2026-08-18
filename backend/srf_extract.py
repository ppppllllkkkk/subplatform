"""
Извлечение полей из SRF (Service Requisition Form).

SRF экспортируется как настоящая таблица (с границами ячеек), поэтому поля
читаются по подписям полностью детерминированно — без распознавания
изображений и без ИИ. Работает надёжно, пока документ создаётся тем же
способом (та же корпоративная форма, экспортированная с сохранением
структуры таблицы, а не отсканированная как картинка).
"""

import re
import pdfplumber

# Поля левой колонки формы: подпись в первой ячейке строки, значение — во второй.
LEFT_LABELS = {
    "requestorName": ["requestor name"],
    "department": ["depatrment", "department"],
    "position": ["position"],
    "proposedSuppliers": ["proposed supplier"],
    "summaryDescription": ["summary description"],
}

# Поля правой колонки формы: подпись где-то в строке, значение — первая
# непустая ячейка правее неё в той же строке.
RIGHT_LABELS = {
    "projectName": ["project name"],
    "projectNumber": ["project number", "con number"],
    "srfNo": ["srf no"],
    "srfDate": ["srf date"],
}


def _clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def _find_main_table(pdf):
    """Возвращает первую найденную таблицу на любой странице документа."""
    for page in pdf.pages:
        tables = page.extract_tables()
        if tables:
            return tables[0]
    return []


def extract_srf_fields(file_path: str) -> dict:
    result = {key: "" for key in {**LEFT_LABELS, **RIGHT_LABELS}}
    items = []

    with pdfplumber.open(file_path) as pdf:
        table = _find_main_table(pdf)

        for row in table:
            cells = [_clean(c) for c in row]
            if not cells:
                continue

            if cells[0]:
                low0 = cells[0].lower()
                for field, keywords in LEFT_LABELS.items():
                    if not result[field] and any(kw in low0 for kw in keywords):
                        if len(cells) > 1 and cells[1]:
                            result[field] = cells[1]

            for idx, cell in enumerate(cells):
                if not cell:
                    continue
                low = cell.lower()
                for field, keywords in RIGHT_LABELS.items():
                    if not result[field] and any(kw in low for kw in keywords):
                        for value in cells[idx + 1 :]:
                            if value:
                                result[field] = value
                                break

            # Строки ведомости объёма работ: во второй ячейке — номер позиции
            # (число), в третьей — описание.
            if len(cells) > 2 and cells[1].isdigit() and cells[2]:
                items.append(
                    {
                        "description": cells[2],
                        "startDate": cells[4] if len(cells) > 4 else "",
                        "finishDate": cells[6] if len(cells) > 6 else "",
                        "quantity": cells[7] if len(cells) > 7 else "",
                        "uom": cells[8] if len(cells) > 8 else "",
                    }
                )

    result["items"] = items
    return result
