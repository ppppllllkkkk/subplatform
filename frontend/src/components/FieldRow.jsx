import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { styles } from "../styles.js";

export default function FieldRow({ label, value, onChange }) {
  const [copied, setCopied] = useState(false);
  const isCopyable = /email|почта|phone|телефон|tel\b/i.test(label) && !!value;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // буфер обмена недоступен — молча игнорируем
    }
  };

  return (
    <div style={styles.fieldRow}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValueRow}>
        <textarea
          style={styles.fieldValue}
          value={value || ""}
          placeholder="—"
          onChange={(e) => onChange(e.target.value)}
          rows={Math.max(1, Math.ceil((value || "").length / 55))}
        />
        {isCopyable && (
          <button style={styles.copyBtn} onClick={handleCopy} aria-label="Скопировать">
            {copied ? <Check size={13} style={{ color: "var(--green)" }} /> : <Copy size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
