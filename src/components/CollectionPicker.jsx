"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangContext";
import { typeLabel, cityLabel, translitAddress } from "@/lib/dict";
import { fmtMoney } from "@/data/data";

// Экран выбора объектов для подборки — в стиле «Мои объявления»: чекбоксы, «Выбрать все»,
// поиск, фильтры, кнопка «Добавить выбранные (N)». Список приходит с сервера уже отфильтрованным
// по принадлежности; при сохранении сервер проверяет каждый id ещё раз.
export default function CollectionPicker({ id }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [state, setState] = useState("loading"); // loading | ready | error | saving
  const [coll, setColl] = useState(null);
  const [units, setUnits] = useState([]);
  const [sel, setSel] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [deal, setDeal] = useState("");
  const [type, setType] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setState("loading");
    try {
      const j = await fetch(`/api/collections?pick=${encodeURIComponent(id)}`).then((r) => r.json());
      if (!j.ok) throw new Error(j.error);
      setColl(j.collection); setUnits(j.units); setState("ready");
    } catch { setState("error"); }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const types = useMemo(() => [...new Set(units.map((u) => u.type).filter(Boolean))], [units]);
  // Фильтры применяются к списку с сервера; «Выбрать все» действует на ВЕСЬ отфильтрованный
  // список (пагинации нет — список свой, не общий каталог), счётчик всегда точный.
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return units.filter((u) => !u.added
      && (!deal || u.deal === deal)
      && (!type || u.type === type)
      && (!s || `${u.address} ${u.city} ${u.type} ${u.price}`.toLowerCase().includes(s)));
  }, [units, q, deal, type]);
  const added = useMemo(() => units.filter((u) => u.added), [units]);
  const allSel = filtered.length > 0 && filtered.every((u) => sel.has(u.id));

  const toggle = (uid) => setSel((s) => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allSel) filtered.forEach((u) => n.delete(u.id)); else filtered.forEach((u) => n.add(u.id)); return n; });

  async function save() {
    if (!sel.size || state === "saving") return;
    setState("saving"); setMsg("");
    try {
      const r = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addMany", id, listingIds: [...sel] }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      if (j.rejected) setMsg(t("col_pick_rejected").replace("{n}", j.rejected));
      router.push("/my#collections");
    } catch {
      // Выбор не теряется: остаёмся на экране с теми же галочками.
      setState("ready"); setMsg(t("col_pick_save_err"));
    }
  }

  const sqm = t("sqm");
  const price = (u) => (u.priceNum ? fmtMoney(u.priceNum, u.currency) : u.price) + (u.deal === "rent" ? t("ps_rent") : u.deal === "daily" ? t("ps_daily") : "");
  const inp = { padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14, background: "#fff" };

  return (
    <div>
      <a href="/my#collections" className="btn btn-ghost" style={{ padding: "8px 14px" }}>← {t("col_done")}</a>
      <h1 style={{ color: "var(--navy)", margin: "16px 0 4px" }}>{t("col_pick_h")}</h1>
      {coll && <p style={{ color: "var(--ink-soft)", margin: "0 0 16px" }}>{coll.title || t("col_untitled")}{coll.client_name ? ` · ${coll.client_name}` : ""}{added.length ? ` · ${t("col_pick_already").replace("{n}", added.length)}` : ""}</p>}

      {state === "loading" && <p className="cab-empty">…</p>}
      {state === "error" && <p className="af-err">{t("col_pick_load_err")} <button type="button" className="btn btn-ghost" onClick={load}>{t("lead_retry")}</button></p>}

      {(state === "ready" || state === "saving") && (
        units.length === 0 ? (
          <p className="cab-empty">{t("col_pick_none")}</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <input style={{ ...inp, flex: "1 1 220px" }} placeholder={t("col_pick_search")} value={q} onChange={(e) => setQ(e.target.value)} />
              <select style={inp} value={deal} onChange={(e) => setDeal(e.target.value)}>
                <option value="">{t("f_anyDeal")}</option>
                <option value="sale">{t("deal_sale")}</option><option value="rent">{t("deal_rent")}</option><option value="daily">{t("deal_daily")}</option>
              </select>
              <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{t("f_anyType")}</option>
                {types.map((ty) => <option key={ty} value={ty}>{typeLabel(lang, ty)}</option>)}
              </select>
            </div>

            <div className="pick-bar">
              <label className="pick-all"><input type="checkbox" checked={allSel} onChange={toggleAll} disabled={!filtered.length} /> {t("col_pick_all")} ({filtered.length})</label>
              <button type="button" className="btn btn-gold" disabled={!sel.size || state === "saving"} onClick={save}>
                {state === "saving" ? t("bulk_working") : t("col_pick_add").replace("{n}", sel.size)}
              </button>
            </div>
            {msg && <p className="af-err" style={{ marginTop: 8 }}>{msg}</p>}

            {filtered.length === 0 ? (
              <p className="cab-empty">{t("cat_empty")}</p>
            ) : (
              <div className="pick-list">
                {filtered.map((u) => {
                  const on = sel.has(u.id);
                  const addr = translitAddress(u.address, lang);
                  return (
                    <label key={u.id} className={"pick-row" + (on ? " on" : "")}>
                      <input type="checkbox" checked={on} onChange={() => toggle(u.id)} />
                      <img src={u.img || "/placeholder-baylux.jpg"} alt="" loading="lazy" />
                      <div className="pick-body">
                        <div className="pick-title">{t("deal_" + u.deal)} · {typeLabel(lang, u.type)}{u.rooms ? `, ${u.rooms} ${t("rooms_short")}` : ""}</div>
                        <div className="pick-sub">{addr}{u.city ? ` · ${cityLabel(lang, u.city)}` : ""}</div>
                        <div className="pick-meta"><b>{price(u)}</b>{u.area ? ` · ${u.area} ${sqm}` : ""}</div>
                      </div>
                      <a className="pick-view" href={`/property/${u.slug}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{t("my_view")}</a>
                    </label>
                  );
                })}
              </div>
            )}

            {added.length > 0 && (
              <details style={{ marginTop: 18 }}>
                <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>{t("col_pick_already").replace("{n}", added.length)}</summary>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-soft)", lineHeight: 1.7 }}>
                  {added.map((u) => <li key={u.id}>{typeLabel(lang, u.type)}{u.area ? `, ${u.area} ${sqm}` : ""} — {translitAddress(u.address, lang)}</li>)}
                </ul>
              </details>
            )}
          </>
        )
      )}
    </div>
  );
}
