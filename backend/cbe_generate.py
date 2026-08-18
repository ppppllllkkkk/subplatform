"""
Заполнение CBE-шаблона подтверждёнными ценами.

Трогаем только "сырые" ячейки цены (по одной на вендора на каждую из 10
строк) — формулы (TOTAL, GRAND TOTAL, лист Price Comparison) остаются
нетронутыми и пересчитаются в Excel сами при открытии файла.
"""

import os

import openpyxl

from cbe_data import CANONICAL_ITEMS, VENDORS

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "templates", "cbe_template.xlsx")

ROW_BY_ID = {item["id"]: item["row"] for item in CANONICAL_ITEMS}
COLUMN_BY_VENDOR = {v["id"]: v["column"] for v in VENDORS}


def generate_cbe_xlsx(assignments: dict, output_path: str) -> str:
    """
    assignments: { vendor_id: { canonical_item_id: price } }
    """
    wb = openpyxl.load_workbook(TEMPLATE_PATH)
    ws = wb["Sheet1"]

    for vendor_id, prices in assignments.items():
        col = COLUMN_BY_VENDOR.get(vendor_id)
        if not col:
            continue
        for item_id, price in prices.items():
            row = ROW_BY_ID.get(item_id)
            if not row or price in (None, ""):
                continue
            try:
                ws[f"{col}{row}"] = float(price)
            except (TypeError, ValueError):
                continue

    wb.save(output_path)
    return output_path
