"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function MyListings({ items }) {
  const { t } = useLang();
  const STATUS = { pending: t("my_pending"), approved: t("my_approved"), rejected: t("my_rejected") };
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState(null);
  const [sel, setSel] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = list.length > 0 && sel.size === list.length;
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(list.map((x) => x.id)));

  async function del(id) {
    if (!window.confirm(t("my_del_confirm"))) return;
    setBusy(id);
    try {
      const r = await fetch("/api/my-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "delete" }) });
      const j = await r.json();
      if (j.ok) { setList(list.filter((x) => x.id !== id)); setSel((s) => { const n = new Set(s); n.delete(id); return n; }); }
      else alert(t("my_del_fail"));
    } catch (e) { alert(t("my_neterr")); }
    setBusy(null);
  }

  async function delSelected() {
    const ids = list.filter((x) => sel.has(x.id)).map((x) => x.id);
    if (!ids.length) return;
    if (!window.confirm(t("my_del_sel_confirm").replace("{n}", ids.length))) return;
    setBulkBusy(true);
    try {
      const r = await fetch("/api/my-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, action: "delete" }) });
      const j = await r.json();
      if (j.ok) {
        const gone = new Set(j.deleted || ids);
        setList(list.filter((x) => !gone.has(x.id)));
        setSel(new Set());
      } else alert(t("my_del_fail"));
    } catch (e) { alert(t("my_neterr")); }
    setBulkBusy(false);
  }

  if (!list.length) return <p style={{ color: "var(--ink-soft)" }}>{t("my_empty")}</p>;

  return (
    <div>
      <div className="my-bulkbar">
        <label className="my-selall"><input type="checkbox" className="my-check" checked={allSelected} onChange={toggleAll} />{t("my_sel_all")}</label>
        {sel.size > 0 && (
          <>
            <span className="my-selcount">{t("my_sel_count").replace("{n}", sel.size)}</span>
            <button className="my-del-bulk" onClick={delSelected} disabled={bulkBusy}>{bulkBusy ? t("my_deleting") : t("my_del_selected")}</button>
          </>
        )}
      </div>
      <div className="my-list">
        {list.map((r) => (
          <div className={"my-item" + (sel.has(r.id) ? " sel" : "")} key={r.id}>
            <div className="my-left">
              <input type="checkbox" className="my-check" checked={sel.has(r.id)} onChange={() => toggle(r.id)} aria-label="select" />
              <img className="my-thumb" src={r.photo} alt="" />
              <div className="my-main">
                <b>{r.title}</b>
                <span>{r.sub}</span>
                <div className="my-actions">
                  {r.slug ? <a className="my-link" href={"/property/" + r.slug}>{t("my_view")}</a> : <span className="my-note">{t("my_notvisible")}</span>}
                  <a className="my-link" href={"/my/edit/" + r.id}>{t("my_edit")}</a>
                  <button className="my-del" onClick={() => del(r.id)} disabled={busy === r.id}>{busy === r.id ? t("my_deleting") : t("my_del")}</button>
                </div>
              </div>
            </div>
            <span className={"my-status st-" + r.status}>{STATUS[r.status] || r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
