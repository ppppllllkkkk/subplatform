// Обращения к бэкенду.
//
// Разбор SRF (PDF) требует чтения файла на сервере: SRF экспортируется как
// настоящая таблица (с границами ячеек), и pdfplumber (Python) читает поля
// по подписям полностью детерминированно, без ИИ — это подтверждено на
// реальном файле. Поэтому парсинг PDF никогда не должен идти напрямую
// из браузера — только через этот эндпоинт.
//
// В dev-режиме (localhost) VITE_API_URL не задан — запросы идут на
// относительный путь /api/*, который Vite проксирует на localhost:8000
// (см. vite.config.js). В проде (Render) фронтенд и бэкенд — два разных
// домена, поэтому сборка получает VITE_API_URL с полным адресом бэкенда
// (см. render.yaml) и все запросы уходят туда напрямую.
const API_BASE = import.meta.env.VITE_API_URL || "";

export async function extractSrfFields(file) {
  const formData = new FormData();
  formData.append("file", file);

  let res;
  try {
    res = await fetch(`${API_BASE}/api/srf/extract`, {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    throw new Error(
      "Бэкенд пока не подключён (не удалось обратиться к /api/srf/extract)."
    );
  }

  if (!res.ok) {
    throw new Error(`Бэкенд вернул ошибку (${res.status})`);
  }

  return res.json();
}

// Генерирует итоговый RFQ (.docx) на сервере из полей (тех же, что и в
// предпросмотре) и запускает скачивание в браузере. Оформление — из
// настоящего Word-шаблона на сервере, не приближение.
export async function downloadRfqDocx(fields) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/rfq/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  } catch (e) {
    throw new Error(
      "Бэкенд пока не подключён (не удалось обратиться к /api/rfq/generate)."
    );
  }

  if (!res.ok) {
    throw new Error(`Бэкенд вернул ошибку (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "RFQ.docx";
  a.click();
  URL.revokeObjectURL(url);
}

// --- CBE (сравнение коммерческих предложений) ---

export async function fetchCbeReference() {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/cbe/reference`);
  } catch (e) {
    throw new Error("Бэкенд пока не подключён (не удалось обратиться к /api/cbe/reference).");
  }
  if (!res.ok) throw new Error(`Бэкенд вернул ошибку (${res.status})`);
  return res.json();
}

// Отправляет все загруженные файлы разом. Бэкенд сам решает, как каждый
// читать (текстовый PDF или скан через OCR) и сопоставляет строки с
// фиксированными курсами шаблона — по словарю ключевых слов, без ИИ.
export async function extractCbeFiles(files) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  let res;
  try {
    res = await fetch(`${API_BASE}/api/cbe/extract`, {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    throw new Error("Бэкенд пока не подключён (не удалось обратиться к /api/cbe/extract).");
  }
  if (!res.ok) throw new Error(`Бэкенд вернул ошибку (${res.status})`);
  return res.json();
}

// assignments: { vendorId: { canonicalItemId: price } }
export async function downloadCbeXlsx(assignments) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/cbe/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments }),
    });
  } catch (e) {
    throw new Error("Бэкенд пока не подключён (не удалось обратиться к /api/cbe/generate).");
  }
  if (!res.ok) throw new Error(`Бэкенд вернул ошибку (${res.status})`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CBE_Training.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
