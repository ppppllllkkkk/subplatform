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

// --- Пароль сайта ---
//
// Хранится в localStorage (переживает перезагрузку страницы). Бэкенд
// проверяет его на каждый /api-запрос (см. backend/main.py) — так что даже
// прямой вызов API в обход интерфейса ничего не даст без пароля.
const PASSWORD_KEY = "subhub-app-password";

export function getStoredPassword() {
  return localStorage.getItem(PASSWORD_KEY) || "";
}

export function setStoredPassword(password) {
  localStorage.setItem(PASSWORD_KEY, password);
}

export function clearStoredPassword() {
  localStorage.removeItem(PASSWORD_KEY);
}

// Проверяет пароль перед входом в приложение (см. PasswordGate.jsx).
// /api/database используется как лёгкая проверка авторизации: 401 значит
// пароль неверный, что угодно другое (в т.ч. 503, если БД ещё не
// подключена) значит пароль верный — сам сервер его принял.
export async function checkPassword(password) {
  const res = await fetch(`${API_BASE}/api/database`, {
    headers: { "X-App-Password": password },
  });
  return res.status !== 401;
}

// Единая обёртка над fetch: подставляет адрес бэкенда и заголовок с паролем,
// и кидает понятную ошибку при сетевом сбое или неверном пароле.
async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "X-App-Password": getStoredPassword(),
      },
    });
  } catch (e) {
    throw new Error(`Бэкенд пока не подключён (не удалось обратиться к ${path}).`);
  }

  if (res.status === 401) {
    clearStoredPassword();
    const err = new Error("Неверный пароль");
    err.isAuthError = true;
    throw err;
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail || "";
    } catch {}
    throw new Error(`Бэкенд вернул ошибку (${res.status})${detail ? ": " + detail : ""}`);
  }
  return res;
}

export async function extractSrfFields(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/srf/extract", { method: "POST", body: formData });
  return res.json();
}

// Генерирует итоговый RFQ (.docx) на сервере из полей (тех же, что и в
// предпросмотре) и запускает скачивание в браузере. Оформление — из
// настоящего Word-шаблона на сервере, не приближение.
export async function downloadRfqDocx(fields) {
  const res = await apiFetch("/api/rfq/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
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
  const res = await apiFetch("/api/cbe/reference");
  return res.json();
}

// Отправляет все загруженные файлы разом. Бэкенд сам решает, как каждый
// читать (текстовый PDF или скан через OCR) и сопоставляет строки с
// фиксированными курсами шаблона — по словарю ключевых слов, без ИИ.
export async function extractCbeFiles(files) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await apiFetch("/api/cbe/extract", { method: "POST", body: formData });
  return res.json();
}

// assignments: { vendorId: { canonicalItemId: price } }
export async function downloadCbeXlsx(assignments) {
  const res = await apiFetch("/api/cbe/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignments }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "CBE_Training.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

// --- Общая база субподрядчиков (одна на всю команду, хранится на сервере) ---

export async function fetchDatabase() {
  const res = await apiFetch("/api/database");
  return res.json(); // { fileName, categories } | null
}

export async function saveDatabase(fileName, categories) {
  await apiFetch("/api/database", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, categories }),
  });
}

export async function clearDatabase() {
  await apiFetch("/api/database", { method: "DELETE" });
}
