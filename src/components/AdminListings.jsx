"use client";
import { useState, useRef, useEffect } from "react";
import OwnerContactBlock from "@/components/OwnerContactBlock";

// Варианты фильтра по статусу модерации. Значения статусов совпадают с колонкой listings.status.
const FILTERS = [
  { key: "all", label: "Все объявления" },
  { key: "pending", label: "На модерации" },
  { key: "rejected", label: "Отклонённые" },
  { key: "approved", label: "Одобренные" },
];

// Дата публикации в часовом поясе Тбилиси + группировка по дням (Сегодня / Вчера / дата).
const TZ = "Asia/Tbilisi";
const dayKey = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString("ru-RU", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }); } catch { return ""; } };
const timeStr = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleTimeString("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const SRC = {
  parser: { label: "Парсер", bg: "#EAF1FB", fg: "#1F5C99", line: "#C9DAF0" },
  partner: { label: "Партнёр", bg: "#F6EEDC", fg: "#8A6418", line: "#E6D3A8" },
  team: { label: "Baylux вручную", bg: "#F1ECF8", fg: "#5B3E96", line: "#D9CCEE" },
  self: { label: "Сам выложил", bg: "#E6F4EC", fg: "#1A7F37", line: "#B9DFC7" },
};
const SRC_FILTERS = [["all", "Все источники"], ["self", "Сами выложили"], ["parser", "Парсер"], ["partner", "Партнёры"], ["team", "Baylux вручную"]];
const PAGE = 100; // рендерим порциями — 3800 карточек разом тормозили страницу

export default function AdminListings({ items, navBefore = null, navAfter = null }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [src, setSrc] = useState("all");
  const ddRef = useRef(null);

  // Закрытие выпадающего списка по клику вне него.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function act(id, action) {
    if (action === "delete" && !confirm("Удалить объявление навсегда?")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/admin/delete-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await r.json();
      if (j.ok) {
        if (action === "delete") setRows((rs) => rs.filter((x) => x.id !== id));
        else if (action === "approve") setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status: "approved" } : x)));
        else setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)));
      } else alert("Ошибка: " + (j.error || "не удалось"));
    } catch { alert("Сбой сети"); }
    setBusy(null);
  }

  const curLabel = (FILTERS.find((f) => f.key === filter) || FILTERS[0]).label;
  // Фильтр применяется к полному списку rows (порядок created_at desc сохраняется), поэтому
  // корректно работает и при обновлении данных, и при изменении статуса через модерацию.
  const visible = (filter === "all" ? rows : rows.filter((r) => r.status === filter)).filter((r) => src === "all" || r.source === src);
  const srcCount = rows.reduce((m, r) => { m[r.source] = (m[r.source] || 0) + 1; return m; }, {});
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 864e5).toISOString());
  const dayCount = visible.reduce((m, r) => { const k = dayKey(r.created); m[k] = (m[k] || 0) + 1; return m; }, {});
  const dayLabel = (k) => (k === today ? "Сегодня" : k === yesterday ? "Вчера" : k || "Без даты");
  const page = visible.slice(0, shown);

  return (
    <>
      {/* Панель разделов + фильтр по статусу. Фильтр — тем же стилем (btn-ghost), справа от «Импорт сводки». */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        {navBefore}
        <div ref={ddRef} style={{ position: "relative", display: "inline-block" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            style={{ padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
          >
            <span>{curLabel}</span>
            <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▼</span>
          </button>
          {open && (
            <div
              role="listbox"
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40,
                background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
                boxShadow: "0 10px 28px rgba(1,39,75,.14)", overflow: "hidden",
                minWidth: 190, maxWidth: "80vw",
              }}
            >
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="option"
                  aria-selected={filter === f.key}
                  className="bx-admf-opt"
                  onClick={() => { setFilter(f.key); setOpen(false); setShown(PAGE); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    background: filter === f.key ? "var(--sand, #f5efe2)" : "#fff", border: "none",
                    cursor: "pointer", fontSize: 14, color: "var(--navy)", whiteSpace: "nowrap",
                    fontWeight: filter === f.key ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {navAfter}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SRC_FILTERS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setSrc(k); setShown(PAGE); }}
              style={{ padding: "7px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                border: `1px solid ${k === "all" ? "var(--line)" : SRC[k].line}`,
                background: src === k ? (k === "all" ? "var(--navy)" : SRC[k].fg) : (k === "all" ? "#fff" : SRC[k].bg),
                color: src === k ? "#fff" : (k === "all" ? "var(--navy)" : SRC[k].fg), fontWeight: 600 }}>
              {l}{k !== "all" ? ` · ${srcCount[k] || 0}` : ""}
            </button>
          ))}
        </div>
        <style>{`.bx-admf-opt:hover{background:var(--sand,#f5efe2)!important;}`}</style>
      </div>

      <h2 style={{ color: "var(--navy)", fontSize: 18, marginBottom: 12 }}>{curLabel} · {visible.length} <span style={{ fontWeight: 400, fontSize: 14, color: "var(--ink-soft)" }}>· сегодня {dayCount[today] || 0}, вчера {dayCount[yesterday] || 0}</span></h2>

      {visible.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {page.map((r, i) => (
            <div key={r.id} style={{ display: "contents" }}>
            {(i === 0 || dayKey(page[i - 1].created) !== dayKey(r.created)) && (
              <div style={{ marginTop: i ? 14 : 0, fontWeight: 700, color: "var(--navy)", fontSize: 14 }}>
                {dayLabel(dayKey(r.created))} · {dayCount[dayKey(r.created)] || 0}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, alignItems: "center", border: `1px solid ${(SRC[r.source] || SRC.parser).line}`, borderLeft: `5px solid ${(SRC[r.source] || SRC.parser).fg}`, background: r.source === "self" ? SRC.self.bg : "#fff", borderRadius: 10, padding: 10, flexWrap: "wrap" }}>
              <img src={r.photo} alt="" loading="lazy" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: (SRC[r.source] || SRC.parser).bg, color: (SRC[r.source] || SRC.parser).fg, border: `1px solid ${(SRC[r.source] || SRC.parser).line}`, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {(SRC[r.source] || SRC.parser).label}{r.channel ? ` · @${r.channel}` : ""}
                  </span>
                  {r.title}
                </div>
                <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{r.sub}</div>
                <div style={{ fontSize: 12, color: r.status === "approved" ? "#1a7f37" : r.status === "pending" ? "#b3801e" : "#b3261e" }}>
                  {r.created ? `${dayLabel(dayKey(r.created))}, ${timeStr(r.created)} · ` : ""}{r.status} · id {r.id}{r.owner ? ` · ${r.owner}` : ""}
                </div>
                {r.dupes && r.dupes.length > 0 && (
                  <div style={{ fontSize: 12, color: "#b3261e", fontWeight: 600, marginTop: 2 }}>
                    ⚠️ возможный дубль: {r.dupes.map((d) => "#" + d).join(", ")}
                  </div>
                )}
                {/* Контакт собственника/риелтора — служебная информация, только для админов.
                    На сайте публикуется номер агентства, эти данные наружу не выводятся. */}
                <OwnerContactBlock className="adm-owner" name={r.ownerName} phone={r.ownerPhone} tg={r.ownerTg} sourceRef={r.sourceRef} sourceUrl={r.sourceUrl} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.slug && <a className="btn btn-ghost" href={`/property/${r.slug}`} target="_blank" style={{ padding: "7px 12px", fontSize: 13 }}>Открыть</a>}
                <a className="btn btn-ghost" href={`/my/edit/${r.id}`} style={{ padding: "7px 12px", fontSize: 13 }}>Редактировать</a>
                {r.status !== "approved" && (
                  <button className="btn btn-gold" disabled={busy === r.id} onClick={() => act(r.id, "approve")} style={{ padding: "7px 12px", fontSize: 13 }}>
                    {busy === r.id ? "…" : "Опубликовать"}
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button className="btn btn-ghost" disabled={busy === r.id} onClick={() => act(r.id, "unpublish")} style={{ padding: "7px 12px", fontSize: 13 }}>Снять</button>
                )}
                <button className="btn" disabled={busy === r.id} onClick={() => act(r.id, "delete")}
                  style={{ padding: "7px 12px", fontSize: 13, background: "#b3261e", color: "#fff" }}>
                  {busy === r.id ? "…" : "Удалить"}
                </button>
              </div>
            </div>
            </div>
          ))}
          {visible.length > shown && (
            <button type="button" className="btn btn-ghost" onClick={() => setShown((n) => n + PAGE)} style={{ alignSelf: "center", padding: "9px 18px" }}>
              Показать ещё {Math.min(PAGE, visible.length - shown)} (из {visible.length - shown})
            </button>
          )}
        </div>
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>Объявлений нет.</p>
      )}
    </>
  );
}
