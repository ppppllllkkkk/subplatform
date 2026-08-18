// Слой хранения данных.
//
// Раньше был localStorage (у каждого свой браузер, свои данные). Теперь
// база субподрядчиков общая на всю команду — эти три функции обращаются
// к бэкенду (см. api.js), который хранит её в Postgres. Сигнатуры (async,
// те же аргументы) не изменились, так что остальной код приложения не
// заметил переключения.

import { fetchDatabase, saveDatabase, clearDatabase } from "./api.js";

export async function loadWorkbook() {
  try {
    const data = await fetchDatabase();
    return data && data.fileName ? data : null;
  } catch (e) {
    console.error("Storage read error:", e);
    return null;
  }
}

export async function saveWorkbook(payload) {
  try {
    await saveDatabase(payload.fileName, payload.categories);
  } catch (e) {
    console.error("Storage write error:", e);
  }
}

export async function clearWorkbook() {
  try {
    await clearDatabase();
  } catch (e) {
    console.error("Storage clear error:", e);
  }
}
