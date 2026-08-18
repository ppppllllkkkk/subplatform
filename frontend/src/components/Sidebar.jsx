import { Database, Inbox, FileText, Scale } from "lucide-react";
import { styles } from "../styles.js";

export default function Sidebar({ section, onSectionChange }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarBrand}>
        <div style={styles.brandMark}>ДБ</div>
      </div>
      <nav style={styles.sidebarNav}>
        <button
          style={section === "database" ? styles.navItemActive : styles.navItemButton}
          onClick={() => onSectionChange("database")}
        >
          <Database size={15} />
          <span>Subcontractor Database</span>
        </button>

        <div style={styles.navItemDisabled} title="Появится на следующем этапе">
          <Inbox size={15} />
          <span>SRF</span>
        </div>

        <button
          style={section === "rfq" ? styles.navItemActive : styles.navItemButton}
          onClick={() => onSectionChange("rfq")}
        >
          <FileText size={15} />
          <span>RFQ</span>
        </button>

        <div style={styles.navItemDisabled} title="Появится на следующем этапе">
          <Inbox size={15} />
          <span>Commercial Offer</span>
        </div>

        <button
          style={section === "cbe" ? styles.navItemActive : styles.navItemButton}
          onClick={() => onSectionChange("cbe")}
        >
          <Scale size={15} />
          <span>CBE</span>
        </button>
      </nav>
    </aside>
  );
}
