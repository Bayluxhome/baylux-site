"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangContext";

// Поиск по объектам под управлением Baylux. Без даты (онлайн-бронирование — позже).
// Ведёт в каталог с managed=1 + выбранные фильтры.
const CITIES = ["Батуми", "Тбилиси"];
const HTYPES = [["", "hh_any_type"], ["studio", "ht_studio"], ["1", "ht_1"]]; // позже: 2, 3, виллы
const GUESTS = ["", "1", "2", "3", "4", "5"];

export default function HolidaySearch() {
  const { t } = useLang();
  const router = useRouter();
  const [city, setCity] = useState("");
  const [htype, setHtype] = useState("");
  const [guests, setGuests] = useState("");

  function go() {
    const p = new URLSearchParams();
    p.set("managed", "1");
    if (city) p.set("city", city);
    if (htype === "studio") p.set("rooms", "0");
    else if (htype) p.set("rooms", htype);
    router.push("/catalog?" + p.toString());
  }

  const field = { display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 0, textAlign: "left" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--navy)" };
  const ctrl = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 15, fontFamily: "inherit", color: "var(--navy)", background: "#fff", width: "100%" };

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", background: "#fff", borderRadius: 16, padding: "16px 16px", boxShadow: "0 10px 40px rgba(1,29,60,.18)", maxWidth: 820, margin: "0 auto" }}>
      <label style={field}>
        <span style={lbl}>{t("hh_city")}</span>
        <select style={ctrl} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">{t("hh_any_city")}</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={field}>
        <span style={lbl}>{t("hh_htype")}</span>
        <select style={ctrl} value={htype} onChange={(e) => setHtype(e.target.value)}>
          {HTYPES.map(([k, lk]) => <option key={k} value={k}>{t(lk)}</option>)}
        </select>
      </label>
      <label style={field}>
        <span style={lbl}>{t("hh_guests")}</span>
        <select style={ctrl} value={guests} onChange={(e) => setGuests(e.target.value)}>
          <option value="">—</option>
          {GUESTS.filter(Boolean).map((g) => <option key={g} value={g}>{g}+</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-gold" style={{ flex: "1 1 160px", height: 44 }} onClick={go}>{t("hh_search")}</button>
    </div>
  );
}
