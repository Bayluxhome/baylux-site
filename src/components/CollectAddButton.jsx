"use client";
import { useState } from "react";
import { useActiveCollection, toggleItem } from "@/components/CollectionActive";
import { useLang } from "@/components/LangContext";

// Кнопка «в подборку» на карточке объекта. Видна только пока у риелтора есть активная подборка
// (выбрана в кабинете). Личное избранное (♡) не трогает — это разные вещи.
export default function CollectAddButton({ listingId }) {
  const active = useActiveCollection();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  if (!active) return null;
  const on = (active.items || []).some((i) => i.id === String(listingId));
  async function click(e) {
    e.preventDefault(); e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const j = await toggleItem(active, listingId);
    if (!j.ok) alert(j.error === "limit" ? t("col_limit") : t("cab_err"));
    setBusy(false);
  }
  return (
    <button type="button" className={"col-add" + (on ? " on" : "")} onClick={click} disabled={busy}
      title={on ? t("col_remove") : t("col_add")} aria-label={on ? t("col_remove") : t("col_add")}>
      {on ? "✓" : "＋"}
    </button>
  );
}
