"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";
import { compressImage } from "@/lib/imageCompress";

export default function PhotoReports({ item }) {
  const { t } = useLang();
  const [list, setList] = useState(item.reports || []);
  const [pending, setPending] = useState([]); // загруженные, но ещё не опубликованные URL
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFiles(e) {
    const files = [...e.target.files].slice(0, 20);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const f of files) {
      try {
        const blob = await compressImage(f, { maxDim: 1280, targetKB: 200 });
        const fd = new FormData();
        fd.append("photo", blob, "report.jpg");
        const r = await fetch("/api/upload-photo", { method: "POST", body: fd });
        const j = await r.json();
        if (j.ok) urls.push(j.url);
      } catch (_) {}
    }
    setPending((p) => [...p, ...urls].slice(0, 20));
    setUploading(false);
  }

  async function publish() {
    if (!pending.length && !note.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/photo-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: item.id, photos: pending, note: note.trim() }) });
      const j = await r.json();
      if (j.ok) {
        setList([{ id: j.id || "new-" + Date.now(), photos: pending, note: note.trim(), at: j.at || new Date().toISOString() }, ...list]);
        setPending([]); setNote("");
      } else alert(t("mg_ph_fail"));
    } catch (e) { alert(t("mg_ph_fail")); }
    setBusy(false);
  }

  const fmt = (s) => { try { return new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };
  const thumb = { width: 84, height: 64, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" };

  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ color: "var(--navy)", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📷 {t("mg_ph_h")}</div>

      {item.canManage && (
        <div style={{ marginBottom: 12 }}>
          <input type="file" accept="image/*" multiple onChange={onFiles} />
          {uploading && <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>{t("mg_ph_uploading")}</div>}
          {pending.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {pending.map((u, i) => (
                <div key={u + i} style={{ position: "relative" }}>
                  <img src={u} alt="" style={thumb} />
                  <button type="button" onClick={() => setPending((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", lineHeight: 1, fontSize: 11 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("mg_ph_note_ph")}
            style={{ width: "100%", marginTop: 8, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", fontSize: 14, resize: "vertical" }} />
          <button type="button" className="btn btn-gold" onClick={publish} disabled={busy || uploading || (!pending.length && !note.trim())} style={{ marginTop: 8, padding: "8px 16px", fontSize: 14 }}>
            {busy ? "…" : t("mg_ph_publish")}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t("mg_ph_empty")}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {list.map((rep) => (
            <div key={rep.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <div style={{ color: "var(--ink-soft)", fontSize: 12, marginBottom: 6 }}>{fmt(rep.at)}</div>
              {rep.note && <div style={{ color: "var(--ink)", fontSize: 14, marginBottom: 6, whiteSpace: "pre-line" }}>{rep.note}</div>}
              {Array.isArray(rep.photos) && rep.photos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {rep.photos.map((u, i) => (
                    <a key={u + i} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="" style={thumb} loading="lazy" /></a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
