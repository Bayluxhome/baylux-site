"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

export default function MyListings({ items }) {
  const { t } = useLang();
  const STATUS = { pending: t("my_pending"), approved: t("my_approved"), rejected: t("my_rejected") };
  const [list, setList] = useState(items);
  const [busy, setBusy] = useState(null);

  async function del(id) {
    if (!window.confirm(t("my_del_confirm"))) return;
    setBusy(id);
    try {
      const r = await fetch("/api/my-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "delete" }) });
      const j = await r.json();
      if (j.ok) setList(list.filter((x) => x.id !== id));
      else alert(t("my_del_fail"));
    } catch (e) { alert(t("my_neterr")); }
    setBusy(null);
  }

  if (!list.length) return <p style={{ color: "var(--ink-soft)" }}>{t("my_empty")}</p>;

  return (
    <div className="my-list">
      {list.map((r) => (
        <div className="my-item" key={r.id}>
          <div className="my-left">
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
  );
}
