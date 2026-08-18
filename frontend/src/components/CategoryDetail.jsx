import { ArrowLeft, Search, Rows3, Table2, Download, Inbox, Building2 } from "lucide-react";
import { styles } from "../styles.js";
import FieldRow from "./FieldRow.jsx";
import EditableCell from "./EditableCell.jsx";

const LIST_BATCH = 150;

export default function CategoryDetail({
  activeCat,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  filteredRows,
  listLimit,
  onListLimitIncrease,
  selectedRowIdx,
  onSelectRow,
  selectedRow,
  primaryIdx,
  secondaryIdx,
  pageRows,
  page,
  onPageChange,
  pageCount,
  onBack,
  onExport,
  onUpdateCell,
}) {
  return (
    <div>
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={15} />
          Все категории
        </button>
        <div style={styles.detailTitle}>{activeCat.name}</div>
        <div style={styles.detailActions}>
          <div style={styles.searchBox}>
            <Search size={13} style={{ color: "var(--ink-soft)" }} />
            <input
              style={styles.searchInput}
              placeholder="Поиск по строкам…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewToggleBtn,
                ...(viewMode === "list" ? styles.viewToggleBtnActive : {}),
              }}
              onClick={() => onViewModeChange("list")}
              aria-label="Вид списком"
            >
              <Rows3 size={14} />
            </button>
            <button
              style={{
                ...styles.viewToggleBtn,
                ...(viewMode === "table" ? styles.viewToggleBtnActive : {}),
              }}
              onClick={() => onViewModeChange("table")}
              aria-label="Вид таблицей"
            >
              <Table2 size={14} />
            </button>
          </div>
          <button style={styles.ghostBtnSmall} onClick={onExport}>
            <Download size={13} />
            Экспорт
          </button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div style={styles.emptySearch}>
          <Inbox size={18} style={{ opacity: 0.4 }} />
          Ничего не найдено по запросу «{search}»
        </div>
      ) : viewMode === "list" ? (
        <div style={styles.listDetailWrap}>
          <div style={styles.listPane}>
            <div style={styles.listCount}>{filteredRows.length} записей</div>
            {filteredRows.slice(0, listLimit).map((row) => {
              const rIdx = activeCat.rows.indexOf(row);
              const isActive = rIdx === selectedRowIdx;
              return (
                <button
                  key={rIdx}
                  style={{
                    ...styles.listItem,
                    ...(isActive ? styles.listItemActive : {}),
                  }}
                  onClick={() => onSelectRow(rIdx)}
                >
                  <div style={styles.listItemPrimary}>
                    {row[primaryIdx] || `Запись ${rIdx + 1}`}
                  </div>
                  {row[secondaryIdx] && (
                    <div style={styles.listItemSecondary}>{row[secondaryIdx]}</div>
                  )}
                </button>
              );
            })}
            {listLimit < filteredRows.length && (
              <button style={styles.loadMoreBtn} onClick={onListLimitIncrease}>
                Показать ещё ({filteredRows.length - listLimit})
              </button>
            )}
          </div>

          <div style={styles.detailPane}>
            {!selectedRow ? (
              <div style={styles.detailPlaceholder}>
                <Building2 size={20} style={{ opacity: 0.35 }} />
                Выберите запись слева
              </div>
            ) : (
              <>
                <div style={styles.detailPaneTitle}>
                  {selectedRow[primaryIdx] || "Без названия"}
                </div>
                <div style={styles.detailPaneSub}>{activeCat.name}</div>
                <div style={styles.fieldGrid}>
                  {activeCat.headers.map((h, i) => (
                    <FieldRow
                      key={i}
                      label={h}
                      value={selectedRow[i]}
                      onChange={(v) => onUpdateCell(selectedRowIdx, i, v)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {activeCat.headers.map((h, i) => (
                    <th key={i} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const rIdx = activeCat.rows.indexOf(row);
                  return (
                    <tr key={rIdx} style={styles.tr}>
                      {row.map((val, cIdx) => (
                        <td key={cIdx} style={styles.td}>
                          <EditableCell
                            value={val}
                            onChange={(v) => onUpdateCell(rIdx, cIdx, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.pageBtn}
                disabled={page === 0}
                onClick={() => onPageChange(Math.max(0, page - 1))}
              >
                Назад
              </button>
              <span style={styles.pageInfo}>
                Стр. {page + 1} из {pageCount} · показано {pageRows.length} из{" "}
                {filteredRows.length}
              </span>
              <button
                style={styles.pageBtn}
                disabled={page >= pageCount - 1}
                onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
              >
                Дальше
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { LIST_BATCH };
