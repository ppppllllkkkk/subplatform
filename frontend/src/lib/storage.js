// Слой хранения данных.
//
// Сейчас реализован через localStorage — этого достаточно для локальной
// разработки и демонстрации. Когда появится бэкенд, эти три функции
// (loadWorkbook / saveWorkbook / clearWorkbook) нужно будет переписать на
// обращения к API — остальной код приложения их вызовы не заметит,
// так как сигнатуры (async, те же аргументы) уже рассчитаны на сетевой вызов.

const STORAGE_KEY = "subcontractor-workbook";

export async function loadWorkbook() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Storage read error:", e);
    return null;
  }
}

export async function saveWorkbook(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("Storage write error:", e);
  }
}

export async function clearWorkbook() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Storage clear error:", e);
  }
}
