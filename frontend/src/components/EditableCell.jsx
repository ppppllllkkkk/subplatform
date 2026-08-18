import { useEffect, useRef } from "react";
import { styles } from "../styles.js";

export default function EditableCell({ value, onChange }) {
  const ref = useRef(null);

  // Синхронизируем содержимое при изменениях извне, но не трогаем текст,
  // пока ячейка реально редактируется — иначе будет прыгать курсор.
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.textContent = value || "";
    }
  }, [value]);

  return (
    <div
      ref={ref}
      style={styles.cellEditable}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent)}
    />
  );
}
