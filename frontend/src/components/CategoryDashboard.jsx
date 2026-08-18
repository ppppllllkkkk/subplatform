import { Search, Inbox } from "lucide-react";
import { styles } from "../styles.js";
import { fillBadgeColor } from "../lib/workbook.js";

const FILTERS = [
  ["all", "Все"],
  ["high", "Заполнено"],
  ["mid", "Частично"],
  ["low", "Мало данных"],
];

export default function CategoryDashboard({
  categories,
  totalRecords,
  dashSearch,
  onDashSearchChange,
  fillFilter,
  onFillFilterChange,
  dashQuery,
  recordMatches,
  visibleCategories,
  onOpenCategory,
  onOpenRecord,
}) {
  return (
    <>
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Категорий с данными</div>
          <div style={styles.statValue}>{categories.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Всего записей</div>
          <div style={styles.statValue}>{totalRecords}</div>
        </div>
      </div>

      <div style={styles.dashToolbar}>
        <div style={styles.searchBox}>
          <Search size={13} style={{ color: "var(--ink-soft)" }} />
          <input
            style={{ ...styles.searchInput, width: 260 }}
            placeholder="Поиск по категориям и записям…"
            value={dashSearch}
            onChange={(e) => onDashSearchChange(e.target.value)}
          />
        </div>
        <div style={styles.filterChips}>
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              style={{
                ...styles.filterChip,
                ...(fillFilter === key ? styles.filterChipActive : {}),
              }}
              onClick={() => onFillFilterChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {dashQuery.length >= 2 && recordMatches.length > 0 && (
        <div style={styles.matchesBox}>
          <div style={styles.matchesLabel}>
            Совпадения записей ({recordMatches.length}
            {recordMatches.length >= 30 ? "+" : ""})
          </div>
          <div style={styles.matchesList}>
            {recordMatches.slice(0, 12).map((m, i) => (
              <button
                key={i}
                style={styles.matchItem}
                onClick={() => onOpenRecord(m.category, m.rowIdx)}
              >
                <span style={styles.matchLabel}>{m.label}</span>
                <span style={styles.matchCategory}>{m.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleCategories.length === 0 ? (
        <div style={styles.emptySearch}>
          <Inbox size={18} style={{ opacity: 0.4 }} />
          Ничего не найдено
        </div>
      ) : (
        <div style={styles.grid}>
          {visibleCategories.map((c) => {
            const badge = fillBadgeColor(c.fillRate);
            return (
              <button key={c.name} style={styles.card} onClick={() => onOpenCategory(c.name)}>
                <div style={styles.cardTop}>
                  <span style={styles.cardName}>{c.name}</span>
                  <span
                    style={{
                      ...styles.cardBadge,
                      background: badge.bg,
                      color: badge.fg,
                    }}
                  >
                    {c.rows.length} записей
                  </span>
                </div>
                <div style={styles.cardMeta}>заполненность полей ~{c.fillRate}%</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
