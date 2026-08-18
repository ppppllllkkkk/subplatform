import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { checkPassword, setStoredPassword } from "../lib/api.js";
import { styles } from "../styles.js";

export default function PasswordGate({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    setError("");
    try {
      const ok = await checkPassword(password);
      if (ok) {
        setStoredPassword(password);
        onSuccess();
      } else {
        setError("Неверный пароль");
      }
    } catch (e) {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={styles.centerPage}>
      <form
        onSubmit={submit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: 280,
          alignItems: "center",
        }}
      >
        <Lock size={22} style={{ color: "var(--ink-soft)" }} />
        <div style={{ fontWeight: 600, fontSize: 15 }}>Доступ по паролю</div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: 14,
            outline: "none",
          }}
        />
        {error && (
          <div style={{ color: "#A32D2D", fontSize: 13, textAlign: "center" }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={checking || !password}
          style={{ ...styles.ghostBtn, width: "100%", justifyContent: "center" }}
        >
          {checking ? <Loader2 size={14} className="spin" /> : "Войти"}
        </button>
      </form>
    </div>
  );
}
