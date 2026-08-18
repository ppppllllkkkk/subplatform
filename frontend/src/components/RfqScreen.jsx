import { useRef, useState } from "react";
import { Upload, Loader2, AlertCircle, Download, RefreshCw, FileCheck } from "lucide-react";
import { styles } from "../styles.js";
import { RFQ_FIELDS, mapSrfToRfq } from "../lib/srf.js";
import { extractSrfFields, downloadRfqDocx } from "../lib/api.js";
import FieldRow from "./FieldRow.jsx";
import RfqPreview from "./RfqPreview.jsx";

export default function RfqScreen() {
  const [srfFileName, setSrfFileName] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [error, setError] = useState("");
  const [rfqData, setRfqData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    setSrfFileName(file.name);
    setStatus("processing");
    setError("");
    try {
      const srf = await extractSrfFields(file);
      setRfqData(mapSrfToRfq(srf));
      setStatus("done");
    } catch (e) {
      setError(e.message || "Не удалось обработать файл");
      setStatus("error");
    }
  };

  const updateField = (fieldId, value) => {
    setRfqData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadRfqDocx(rfqData);
    } catch (e) {
      setDownloadError(e.message || "Не удалось скачать файл");
    } finally {
      setDownloading(false);
    }
  };

  const reset = () => {
    setSrfFileName(null);
    setStatus("idle");
    setError("");
    setRfqData(null);
    setDownloadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (status === "processing") return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const isDone = status === "done" && rfqData;

  return (
    <>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div>
            <div style={styles.brandTitle}>RFQ из SRF</div>
            <div style={styles.brandSub}>Загрузите SRF — поля RFQ заполнятся автоматически</div>
          </div>
        </div>
        {isDone && (
          <button style={styles.ghostBtn} onClick={reset}>
            <RefreshCw size={14} />
            Начать заново
          </button>
        )}
      </header>

      {!isDone && (
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
          <Upload size={22} strokeWidth={1.4} style={{ color: "var(--ink-soft)" }} />
          <div style={styles.uploadTitle}>
            {srfFileName ? `Загружен: ${srfFileName}` : "Загрузите SRF-файл"}
          </div>
          <div style={styles.uploadSub}>Перетащите PDF сюда или нажмите, чтобы выбрать</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {status === "processing" && (
        <div style={styles.rfqStatusRow}>
          <Loader2 size={15} className="spin" style={{ color: "var(--blue)" }} />
          Читаю поля SRF…
        </div>
      )}

      {status === "error" && (
        <div style={{ ...styles.rfqStatusRow, color: "#A32D2D" }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {isDone && (
        <div style={styles.rfqLayout}>
          <div style={styles.rfqLeftCol}>
            <div style={styles.rfqFileBar}>
              <FileCheck size={14} style={{ color: "var(--green)" }} />
              <span style={styles.rfqFileBarName}>{srfFileName}</span>
            </div>

            <button
              style={{ ...styles.primaryBtn, width: "100%", justifyContent: "center" }}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Download size={14} />
              )}
              Скачать RFQ (.docx)
            </button>

            {downloadError && (
              <div style={{ ...styles.rfqStatusRow, color: "#A32D2D" }}>
                <AlertCircle size={14} />
                {downloadError}
              </div>
            )}

            <div style={styles.rfqFieldsLabel}>Поля документа</div>
            <div style={styles.fieldGrid}>
              {RFQ_FIELDS.map((f) => (
                <FieldRow
                  key={f.id}
                  label={f.label}
                  value={rfqData[f.id]}
                  onChange={(v) => updateField(f.id, v)}
                />
              ))}
            </div>
          </div>

          <div style={styles.rfqRightCol}>
            <div style={styles.rfqPreviewDocHeader}>Как будет выглядеть документ</div>
            <RfqPreview fields={rfqData} />
          </div>
        </div>
      )}
    </>
  );
}
