import * as XLSX from "xlsx";

// Вкладки, которые обычно являются оглавлением/обложкой, а не данными категории
const SKIP_SHEET_NAMES = new Set([
  "home",
  "index",
  "contents",
  "toc",
  "cover",
  "содержание",
]);

function normSheetName(n) {
  return n.trim().toLowerCase();
}

function isRowEmpty(row) {
  return (
    !row ||
    row.every((c) => c === null || c === undefined || String(c).trim() === "")
  );
}

export function guessColIndex(headers, keywords, fallback) {
  const idx = headers.findIndex((h) =>
    keywords.some((k) => h.toLowerCase().includes(k))
  );
  return idx >= 0 ? idx : fallback;
}

/**
 * Разбирает загруженную книгу Excel на категории.
 * Каждая вкладка становится отдельной категорией (кроме служебных вкладок
 * вроде "Home"/"Index" и полностью пустых вкладок).
 */
export function parseWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const categories = [];

  wb.SheetNames.forEach((sheetName) => {
    if (SKIP_SHEET_NAMES.has(normSheetName(sheetName))) return;

    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    if (!aoa.length) return;

    const headerRowRaw = aoa[0] || [];
    // Обрезаем хвостовые полностью пустые колонки у заголовка
    let lastCol = headerRowRaw.length - 1;
    while (lastCol >= 0 && String(headerRowRaw[lastCol] || "").trim() === "") {
      lastCol--;
    }
    if (lastCol < 0) return;

    const headers = headerRowRaw
      .slice(0, lastCol + 1)
      .map((h, i) => String(h || "").trim() || `Колонка ${i + 1}`);

    const dataRows = aoa
      .slice(1)
      .map((r) => headers.map((_, i) => (r[i] !== undefined ? String(r[i]) : "")))
      .filter((r) => !isRowEmpty(r));

    if (dataRows.length === 0) return; // пустые категории не показываем

    let filled = 0;
    dataRows.forEach((r) =>
      r.forEach((c) => {
        if (c.trim() !== "") filled++;
      })
    );
    const fillRate = Math.round((filled / (dataRows.length * headers.length)) * 100);

    categories.push({ name: sheetName, headers, rows: dataRows, fillRate });
  });

  categories.sort((a, b) => a.name.localeCompare(b.name));
  return categories;
}

export function exportCategoryToXlsx(category) {
  const aoa = [category.headers, ...category.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, category.name.slice(0, 31));
  XLSX.writeFile(wb, `${category.name}.xlsx`);
}

export function fillBadgeColor(rate) {
  if (rate >= 80) return { bg: "#E1F5EE", fg: "#0F6E56" };
  if (rate >= 50) return { bg: "#FAEEDA", fg: "#854F0B" };
  return { bg: "#FCEBEB", fg: "#A32D2D" };
}
