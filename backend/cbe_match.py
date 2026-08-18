"""
Сопоставление строк вендорского прайс-листа с 10 фиксированными курсами
шаблона — по словарю ключевых слов, без ИИ.

Если для строки находится ровно одно совпадение — считаем её надёжно
сопоставленной. Если совпадений два и больше (например, вендор объединил
два курса в один пункт) или совпадений нет вовсе — помечаем строку как
требующую подтверждения человеком, а не выбираем наугад.
"""

import re

from cbe_data import CANONICAL_ITEMS


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower())


ELECTRICAL_FALLBACK = ["электробезопасность", "правила птэ", "птэ и птб"]


def match_item(description: str) -> list[str]:
    d = _normalize(description)
    candidates = [item["id"] for item in CANONICAL_ITEMS if any(kw in d for kw in item["keywords"])]
    if not candidates and any(kw in d for kw in ELECTRICAL_FALLBACK):
        # Понятно, что это про электробезопасность, но какая именно группа —
        # неясно (частая причина: OCR коверкает римские цифры IV/V/III/II).
        # Предлагаем выбрать из двух вариантов вручную, а не оставлять пусто.
        candidates = ["electrical_iv_v", "electrical_ii_iii"]
    return candidates


def match_vendor_items(items: list[dict]) -> list[dict]:
    results = []
    for entry in items:
        candidates = match_item(entry["description"])
        if len(candidates) == 1:
            status = "matched"
        elif len(candidates) > 1:
            status = "ambiguous"
        else:
            status = "unmatched"
        results.append(
            {
                "description": entry["description"],
                "price": entry["price"],
                "candidates": candidates,
                "matchedId": candidates[0] if status == "matched" else None,
                "status": status,
            }
        )
    return results
