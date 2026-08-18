import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Upload, RefreshCw, Loader2 } from "lucide-react";
import { styles } from "./styles.js";
import { parseWorkbook, exportCategoryToXlsx, guessColIndex } from "./lib/workbook.js";
import { loadWorkbook, saveWorkbook } from "./lib/storage.js";
import Sidebar from "./components/Sidebar.jsx";
import CategoryDashboard from "./components/CategoryDashboard.jsx";
import CategoryDetail, { LIST_BATCH } from "./components/CategoryDetail.jsx";
import RfqScreen from "./components/RfqScreen.jsx";
import CbeScreen from "./components/CbeScreen.jsx";

const PAGE_SIZE = 50;

export default function App() {
  const [section, setSection] = useState("database"); // "database" | "rfq"

  // --- Загруженная книга (Subcontractor Database) ---
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // --- Главный экран: поиск / фильтр по категориям ---
  const [dashSearch, setDashSearch] = useState("");
  const [fillFilter, setFillFilter] = useState("all"); // all | high | mid | low

  // --- Открытая категория ---
  const [activeCategory, setActiveCategory] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "table"
  const [selectedRowIdx, setSelectedRowIdx] = useState(null);
  const [listLimit, setListLimit] = useState(LIST_BATCH);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      const saved = await loadWorkbook();
      if (saved) {
        setFileName(saved.fileName);
        setCategories(saved.categories);
      }
      setLoading(false);
    })();
  }, []);

  const handleFile = useCallback(async (file) => {
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const cats = parseWorkbook(buf);
      setCategories(cats);
      setFileName(file.name);
      setActiveCategory(null);
      await saveWorkbook({ fileName: file.name, categories: cats });
    } catch (e) {
      alert("Не удалось прочитать файл: " + (e.message || e));
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const updateCell = (categoryName, rowIdx, colIdx, value) => {
    setCategories((prev) => {
      const next = prev.map((c) => {
        if (c.name !== categoryName) return c;
        const rows = c.rows.map((r, i) =>
          i === rowIdx ? r.map((v, j) => (j === colIdx ? value : v)) : r
        );
        return { ...c, rows };
      });
      saveWorkbook({ fileName, categories: next });
      return next;
    });
  };

  const totalRecords = useMemo(
    () => categories.reduce((sum, c) => sum + c.rows.length, 0),
    [categories]
  );

  const fillMatch = (rate) =>
    fillFilter === "all" ||
    (fillFilter === "high" && rate >= 80) ||
    (fillFilter === "mid" && rate >= 50 && rate < 80) ||
    (fillFilter === "low" && rate < 50);

  const dashQuery = dashSearch.trim().toLowerCase();

  // Совпадения отдельных записей по всей базе (не только по названию категории)
  const recordMatches = useMemo(() => {
    if (dashQuery.length < 2) return [];
    const out = [];
    for (const c of categories) {
      const primaryIdx = guessColIndex(c.headers, ["company", "компан"], 0);
      for (let i = 0; i < c.rows.length; i++) {
        const row = c.rows[i];
        if (row.some((v) => v.toLowerCase().includes(dashQuery))) {
          out.push({ category: c.name, rowIdx: i, label: row[primaryIdx] || `Запись ${i + 1}` });
          if (out.length >= 30) return out;
        }
      }
    }
    return out;
  }, [categories, dashQuery]);

  const visibleCategories = useMemo(() => {
    return categories.filter((c) => {
      if (!fillMatch(c.fillRate)) return false;
      if (!dashQuery) return true;
      if (c.name.toLowerCase().includes(dashQuery)) return true;
      return recordMatches.some((m) => m.category === c.name);
    });
  }, [categories, dashQuery, fillFilter, recordMatches]);

  const openRecord = (categoryName, rowIdx) => {
    setActiveCategory(categoryName);
    setViewMode("list");
    setSelectedRowIdx(rowIdx);
  };

  const activeCat = categories.find((c) => c.name === activeCategory);

  const filteredRows = useMemo(() => {
    if (!activeCat) return [];
    if (!search.trim()) return activeCat.rows;
    const q = search.trim().toLowerCase();
    return activeCat.rows.filter((r) => r.some((c) => c.toLowerCase().includes(q)));
  }, [activeCat, search]);

  useEffect(() => {
    setPage(0);
    setSelectedRowIdx(null);
    setListLimit(LIST_BATCH);
  }, [activeCategory, search]);

  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const primaryIdx = activeCat ? guessColIndex(activeCat.headers, ["company", "компан"], 0) : 0;
  const secondaryIdx = activeCat
    ? guessColIndex(activeCat.headers, ["contact", "контакт"], primaryIdx === 0 ? 1 : 0)
    : 1;

  useEffect(() => {
    if (viewMode === "list" && activeCat && filteredRows.length > 0 && selectedRowIdx === null) {
      setSelectedRowIdx(activeCat.rows.indexOf(filteredRows[0]));
    }
  }, [viewMode, filteredRows, selectedRowIdx, activeCat]);

  const selectedRow = activeCat && selectedRowIdx !== null ? activeCat.rows[selectedRowIdx] : null;

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <Loader2 size={22} className="spin" style={{ color: "var(--blue)" }} />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <Sidebar section={section} onSectionChange={setSection} />

      <main style={styles.page}>
        {section === "database" ? (
          <>
            <header style={styles.header}>
              <div style={styles.brand}>
                <div>
                  <div style={styles.brandTitle}>Subcontractor Database</div>
                  <div style={styles.brandSub}>
                    {fileName ? fileName : "Дашборд по загруженному файлу"}
                  </div>
                </div>
              </div>
              {categories.length > 0 && (
                <button style={styles.ghostBtn} onClick={() => fileInputRef.current?.click()}>
                  <RefreshCw size={14} />
                  Заменить файл
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </header>

            {categories.length === 0 ? (
              <div
                style={{ ...styles.uploadZone, ...(isDragging ? styles.uploadZoneActive : {}) }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {parsing ? (
                  <>
                    <Loader2 size={24} className="spin" style={{ color: "var(--blue)" }} />
                    <div style={styles.uploadTitle}>Разбираю файл…</div>
                  </>
                ) : (
                  <>
                    <Upload size={26} strokeWidth={1.4} style={{ color: "var(--ink-soft)" }} />
                    <div style={styles.uploadTitle}>Загрузите Excel-файл базы субподрядчиков</div>
                    <div style={styles.uploadSub}>
                      Каждая вкладка файла станет отдельной категорией на дашборде. Перетащите
                      файл сюда или нажмите, чтобы выбрать.
                    </div>
                  </>
                )}
              </div>
            ) : !activeCat ? (
              <CategoryDashboard
                categories={categories}
                totalRecords={totalRecords}
                dashSearch={dashSearch}
                onDashSearchChange={setDashSearch}
                fillFilter={fillFilter}
                onFillFilterChange={setFillFilter}
                dashQuery={dashQuery}
                recordMatches={recordMatches}
                visibleCategories={visibleCategories}
                onOpenCategory={setActiveCategory}
                onOpenRecord={openRecord}
              />
            ) : (
              <CategoryDetail
                activeCat={activeCat}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                search={search}
                onSearchChange={setSearch}
                filteredRows={filteredRows}
                listLimit={listLimit}
                onListLimitIncrease={() => setListLimit((l) => l + LIST_BATCH)}
                selectedRowIdx={selectedRowIdx}
                onSelectRow={setSelectedRowIdx}
                selectedRow={selectedRow}
                primaryIdx={primaryIdx}
                secondaryIdx={secondaryIdx}
                pageRows={pageRows}
                page={page}
                onPageChange={setPage}
                pageCount={pageCount}
                onBack={() => setActiveCategory(null)}
                onExport={() => exportCategoryToXlsx(activeCat)}
                onUpdateCell={(rowIdx, colIdx, value) =>
                  updateCell(activeCat.name, rowIdx, colIdx, value)
                }
              />
            )}
          </>
        ) : section === "rfq" ? (
          <RfqScreen />
        ) : (
          <CbeScreen />
        )}
      </main>
    </div>
  );
}
