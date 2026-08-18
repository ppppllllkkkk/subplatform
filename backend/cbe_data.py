"""
Общие данные для CBE (Commercial Bid Evaluation) по обучению.

CANONICAL_ITEMS — 10 фиксированных строк шаблона (row = номер строки в Sheet1,
name — как называется в самом файле, keywords — по каким словам узнаём этот
курс в тексте вендорского предложения, независимо от языка и формулировки).

VENDORS — 7 колонок шаблона, каждая под конкретного, заранее известного
поставщика. detect_keywords используется, чтобы угадать вендора по названию
файла/тексту документа.
"""

CANONICAL_ITEMS = [
    {
        "id": "labour_code",
        "row": 14,
        "name": "Labour Code, Occupational Safety and Health Training",
        "keywords": ["трудовому кодексу", "labour code", "охране труда", "безопасность и охрана труда"],
    },
    {
        "id": "civil_protection",
        "row": 15,
        "name": 'Training on the Law of RK "On Civil Protection" for Industrial Safety at Hazardous Facilities',
        "keywords": ["гражданской защите", "civil protection", "опасных производственных", "промышленная безопасность"],
    },
    {
        "id": "fire_safety",
        "row": 16,
        "name": "Fire Safety Technical Minimum Training",
        "keywords": ["пожарно-технич", "пожарной безопасности", "fire safety", "fire technical"],
    },
    {
        "id": "crane_safe_ops",
        "row": 17,
        "name": "Person Responsible for Safe Crane Operations",
        "keywords": ["безопасное производство работ кранами", "safe crane", "перемещению грузов"],
    },
    {
        "id": "crane_condition",
        "row": 18,
        "name": "Person Responsible for the Technically Sound Condition of Lifting Cranes",
        "keywords": ["исправное состояние", "исправном состоянии", "грузоподъемных кранов", "technically sound", "maintenance of cranes"],
    },
    {
        "id": "pressure_equipment",
        "row": 19,
        "name": "Industrial Safety Rules for the Operation of Pressure Equipment",
        "keywords": ["давлением", "pressure equipment", "сосуды, работающие"],
    },
    {
        "id": "first_aid",
        "row": 20,
        "name": "First Aid Training",
        "keywords": ["первой помощи", "доврачебной помощи", "доврачебная помощь", "first aid"],
    },
    {
        "id": "electrical_iv_v",
        "row": 21,
        "name": "Electrical Safety: Technical Operation and Safety Rules (Groups IV and V)",
        "keywords": ["iv и v", "4-5 групп", "групп iv", "groups iv", "электроустановок"],
    },
    {
        "id": "electrical_ii_iii",
        "row": 22,
        "name": "Electrical Safety: Technical Operation and Safety Rules (Groups II and III)",
        "keywords": ["iii и ii", "ii и iii", "2-3 групп", "groups ii", "groups iii", "электроустановок"],
    },
    {
        "id": "qualification",
        "row": 23,
        "name": "Qualification Certificate",
        "keywords": ["квалификационное удостоверение", "подтверждение квалификации", "qualification certificate", "квалификационный курс"],
    },
]

VENDORS = [
    {"id": "krts", "name": "KRTS LTD LLP", "column": "G", "keywords": ["krts"]},
    {"id": "rtg", "name": "RTG Tilmash LLP", "column": "J", "keywords": ["rtg", "тилмаш", "tilmash"]},
    {"id": "apec", "name": "Apec Training Center LLP (offline)", "column": "M", "keywords": ["apec", "апек"]},
    {"id": "intekko", "name": "Intekko LLP", "column": "P", "keywords": ["intekko", "интекко"]},
    {"id": "kazprof", "name": '"KazProf" Specialized Training Center LLP', "column": "S", "keywords": ["kazprof", "казпроф"]},
    {"id": "safeline", "name": "SafeLine LLP", "column": "V", "keywords": ["safeline", "сейфлайн"]},
    {"id": "baitau", "name": "Baitau LLP", "column": "Y", "keywords": ["baitau", "байтау"]},
]


def guess_vendor(text: str):
    low = text.lower()
    for vendor in VENDORS:
        if any(kw in low for kw in vendor["keywords"]):
            return vendor["id"]
    return None
