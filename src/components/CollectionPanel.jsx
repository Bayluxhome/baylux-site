"use client";
import { useState } from "react";
import Link from "next/link";
import { useActiveCollection, writeActive, toggleItem } from "@/components/CollectionActive";
import { useLang } from "@/components/LangContext";

// Боковая панель активной подборки (задача №06, п.4): клиент, объекты, счётчик, удаление.
// Показывается на любой странице, пока подборка выбрана в кабинете. Сохранение, ссылка
// и отправка — в кабинете (CollectionsList), здесь только состав; вторую панель не плодим.
export default function CollectionPanel() {
  const active = useActiveCollection();
  const { t } = useLang();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState("");
  if (!active) return null;
  const items = active.items || [];

  async function remove(id) {
    setBusy(id);
    await toggleItem(active, id);
    setBusy("");
  }

  return (
    <div className={"colp" + (open ? "" : " colp-min")}>
      <button type="button" className="colp-head" onClick={() => setOpen(!open)}>
        <span>🗂 {active.title || t("col_untitled")}{active.client_name ? ` · ${active.client_name}` : ""}</span>
        <b>{items.length}</b>
      </button>
      {open && (
        <>
          <div className="colp-list">
            {items.length === 0 && <div className="colp-empty">{t("col_panel_empty")}</div>}
            {items.map((i) => (
              <div className="colp-item" key={i.id}>
                <Link href={`/property/${i.slug}`}>{i.title}</Link>
                <button type="button" onClick={() => remove(i.id)} disabled={busy === i.id} aria-label={t("col_remove")} title={t("col_remove")}>✕</button>
              </div>
            ))}
          </div>
          <div className="colp-actions">
            <Link className="btn btn-ghost" href="/catalog">{t("col_pick_more")}</Link>
            <Link className="btn btn-gold" href="/my#collections">{t("col_done")}</Link>
            <button type="button" className="colp-close" onClick={() => writeActive(null)}>{t("col_close_panel")}</button>
          </div>
        </>
      )}
    </div>
  );
}
