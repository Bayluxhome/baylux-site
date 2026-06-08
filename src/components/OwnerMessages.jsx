"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

// Сообщения собственнику по объекту. Публикует ответственный/управляющий (item.canManage),
// собственник видит список и получает на email.
export default function OwnerMessages({ item }) {
  const { t } = useLang();
  const [list, setList] = useState(item.messages || []);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const r = await fetch("/api/owner-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: item.id, body: text }) });
      const j = await r.json();
      if (j.ok) {
        setList([{ id: "new-" + Date.now(), body: text, at: new Date().toISOString() }, ...list]);
        setBody("");
        if (!j.emailed) alert(t("mg_msg_noemail"));
      } else alert(t("mg_msg_fail"));
    } catch (e) { alert(t("mg_msg_fail")); }
    setBusy(false);
  }

  const fmt = (s) => { try { return new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>✉️ {t("mg_msg_h")}</div>

      {item.canManage && (
        <div style={{ marginBottom: 12 }}>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder={t("mg_msg_ph")}
            style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, resize: "vertical" }} />
          {!item.ownerEmail && <div style={{ color: "var(--gold-dk)", fontSize: 12, marginTop: 4 }}>⚠️ {t("mg_msg_noemail")}</div>}
          <button type="button" className="btn btn-gold" onClick={send} disabled={busy || !body.trim()} style={{ marginTop: 8, padding: "8px 16px", fontSize: 14 }}>
            {busy ? "…" : t("mg_msg_send")}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t("mg_msg_empty")}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {list.map((m) => (
            <div key={m.id} style={{ borderLeft: "3px solid var(--gold)", paddingLeft: 10 }}>
              <div style={{ color: "var(--ink)", fontSize: 14, whiteSpace: "pre-line" }}>{m.body}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 12, marginTop: 2 }}>{fmt(m.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
