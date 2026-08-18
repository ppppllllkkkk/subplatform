import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import { styles } from "../styles.js";
import { fetchCbeReference, extractCbeFiles, downloadCbeXlsx } from "../lib/api.js";

const STATUS_META = {
  matched: { icon: CheckCircle2, color: "var(--green)", label: "" },
  ambiguous: { icon: HelpCircle, color: "#C98A2C", label: "нужно подтвердить" },
  unmatched: { icon: HelpCircle, color: "#A32D2D", label: "не распознано" },
};

export default function CbeScreen() {
  const [reference, setReference] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [error, setError] = useState("");
  const [vendorBlocks, setVendorBlocks] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCbeReference().then(setReference).catch(() => {});
  }, []);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    setStatus("processing");
    setError("");
    try {
      const { results } = await extractCbeFiles(files);
      const blocks = results.map((r) => ({
        filename: r.filename,
        source: r.source,
        vendorId: r.vendorGuess || "",
        error: r.error || null,
        items: (r.items || []).map((it) => ({
          description: it.description,
          price: it.price,
          itemId: it.status === "matched" ? it.matchedId : "",
          candidates: it.candidates || [],
          status: it.status,
        })),
      }));
      setVendorBlocks((prev) => [...prev, ...blocks]);
      setStatus("done");
    } catch (e) {
      setError(e.message || "Не удалось обработать файлы");
      setStatus("error");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (status === "processing") return;
    handleFiles(e.dataTransfer.files);
  };

  const updateBlockVendor = (blockIdx, vendorId) => {
    setVendorBlocks((prev) =>
      prev.map((b, i) => (i === blockIdx ? { ...b, vendorId } : b))
    );
  };

  const updateItem = (blockIdx, itemIdx, patch) => {
    setVendorBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        const items = b.items.map((it, j) => (j === itemIdx ? { ...it, ...patch } : it));
        return { ...b, items };
      })
    );
  };

  const removeBlock = (blockIdx) => {
    setVendorBlocks((prev) => prev.filter((_, i) => i !== blockIdx));
  };

  const reset = () => {
    setVendorBlocks([]);
    setStatus("idle");
    setError("");
    setDownloadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const assignments = {};
      vendorBlocks.forEach((b) => {
        if (!b.vendorId) return;
        const prices = {};
        b.items.forEach((it) => {
          if (it.itemId && it.price) prices[it.itemId] = it.price;
        });
        if (Object.keys(prices).length) assignments[b.vendorId] = prices;
      });
      await downloadCbeXlsx(assignments);
    } catch (e) {
      setDownloadError(e.message || "Не удалось скачать файл");
    } finally {
      setDownloading(false);
    }
  };

  const itemName = (id) => reference?.items.find((i) => i.id === id)?.name || "";
  const vendorName = (id) => reference?.vendors.find((v) => v.id === id)?.name || "";

  const hasBlocks = vendorBlocks.length > 0;
  const readyToDownload = vendorBlocks.some((b) => b.vendorId);

  return (
    <>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div>
            <div style={styles.brandTitle}>CBE — сравнение предложений</div>
            <div style={styles.brandSub}>
              Загрузите ценовые предложения поставщиков — цены разложатся по курсам
            </div>
          </div>
        </div>
        {hasBlocks && (
          <button style={styles.ghostBtn} onClick={reset}>
            <RefreshCw size={14} />
            Начать заново
          </button>
        )}
      </header>

      <div
        style={{
          ...styles.uploadZone,
          ...(isDragging ? styles.uploadZoneActive : {}),
          ...(status === "processing" ? { opacity: 0.6, pointerEvents: "none" } : {}),
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {status === "processing" ? (
          <>
            <Loader2 size={24} className="spin" style={{ color: "var(--blue)" }} />
            <div style={styles.uploadTitle}>Читаю документы…</div>
          </>
        ) : (
          <>
            <Upload size={22} strokeWidth={1.4} style={{ color: "var(--ink-soft)" }} />
            <div style={styles.uploadTitle}>Загрузите одно или несколько предложений</div>
            <div style={styles.uploadSub}>PDF, в том числе сканы — перетащите сюда или выберите</div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
        />
      </div>

      {status === "error" && (
        <div style={{ ...styles.rfqStatusRow, color: "#A32D2D" }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {hasBlocks && (
        <div style={styles.cbeBlocks}>
          {vendorBlocks.map((block, blockIdx) => (
            <div key={blockIdx} style={styles.cbeVendorCard}>
              <div style={styles.cbeVendorHeader}>
                <div style={styles.cbeVendorFile}>
                  {block.filename}
                  {block.source === "ocr" && (
                    <span style={styles.cbeSourceTag}>OCR</span>
                  )}
                </div>
                <select
                  style={{
                    ...styles.cbeSelect,
                    ...(!block.vendorId ? styles.cbeSelectEmpty : {}),
                  }}
                  value={block.vendorId}
                  onChange={(e) => updateBlockVendor(blockIdx, e.target.value)}
                >
                  <option value="">Выберите поставщика…</option>
                  {reference?.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button style={styles.rowRemove} onClick={() => removeBlock(blockIdx)}>
                  <X size={14} />
                </button>
              </div>

              {block.error ? (
                <div style={{ ...styles.rfqStatusRow, color: "#A32D2D" }}>
                  <AlertCircle size={14} />
                  {block.error}
                </div>
              ) : (
                <div style={styles.cbeItemList}>
                  {block.items.map((it, itemIdx) => {
                    const meta = STATUS_META[it.status];
                    const Icon = meta.icon;
                    return (
                      <div key={itemIdx} style={styles.cbeItemRow}>
                        <Icon size={14} style={{ color: meta.color, flexShrink: 0, marginTop: 9 }} />
                        <div style={styles.cbeItemDesc} title={it.description}>
                          {it.description}
                        </div>
                        <select
                          style={{
                            ...styles.cbeSelect,
                            ...(it.status !== "matched" ? styles.cbeSelectAmbiguous : {}),
                          }}
                          value={it.itemId}
                          onChange={(e) =>
                            updateItem(blockIdx, itemIdx, { itemId: e.target.value })
                          }
                        >
                          <option value="">— выберите курс —</option>
                          {reference?.items.map((ci) => (
                            <option key={ci.id} value={ci.id}>
                              {it.candidates.includes(ci.id) ? "★ " : ""}
                              {ci.name}
                            </option>
                          ))}
                        </select>
                        <input
                          style={styles.cbePriceInput}
                          value={it.price}
                          onChange={(e) =>
                            updateItem(blockIdx, itemIdx, { price: e.target.value })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div style={styles.cbeDownloadRow}>
            <button
              style={{ ...styles.primaryBtn, opacity: readyToDownload ? 1 : 0.5 }}
              onClick={handleDownload}
              disabled={downloading || !readyToDownload}
            >
              {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              Скачать CBE (.xlsx)
            </button>
            {!readyToDownload && (
              <span style={styles.cbeDownloadHint}>
                Выберите поставщика хотя бы для одного файла
              </span>
            )}
          </div>

          {downloadError && (
            <div style={{ ...styles.rfqStatusRow, color: "#A32D2D" }}>
              <AlertCircle size={14} />
              {downloadError}
            </div>
          )}
        </div>
      )}
    </>
  );
}
