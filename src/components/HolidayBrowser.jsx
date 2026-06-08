"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";
import { cityLabel } from "@/lib/dict";
import { fmtMoney } from "@/data/data";

// Витрина жилья под управлением Baylux (стиль Deluxe): табы по типу + карточки.
// Пока типов два — Студия и 1 спальня. Карточки-заглушки; реальные заводятся
// через личный кабинет владельца и попадают сюда и в раздел «Посуточно».
const TABS = [["studio", "ht_studio"], ["1", "ht_1"]];

// TODO: заменить на реальные объекты под управлением (deal=daily, managed=true).
const MOCK = [
  { id: "m1", rooms: 0, area: 30, priceNum: 45, photo: "/hero-holiday.jpg", area_name: "Новый Бульвар" },
  { id: "m2", rooms: 0, area: 28, priceNum: 40, photo: "/hero-batumi.webp", area_name: "Старый Бульвар" },
  { id: "m3", rooms: 0, area: 34, priceNum: 50, photo: "/hero-georgia.webp", area_name: "Махинджаури" },
  { id: "m4", rooms: 1, area: 48, priceNum: 65, photo: "/hero-tbilisi.webp", area_name: "Новый Бульвар" },
  { id: "m5", rooms: 1, area: 52, priceNum: 70, photo: "/hero-holiday.jpg", area_name: "Гонио" },
  { id: "m6", rooms: 1, area: 45, priceNum: 60, photo: "/hero-batumi.webp", area_name: "Старый Бульвар" },
];

export default function HolidayBrowser({ items }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState("studio");
  const data = items && items.length ? items : MOCK;
  const isMock = !(items && items.length);

  const filtered = useMemo(() => data.filter((u) => (tab === "studio" ? u.rooms === 0 : u.rooms === 1)), [data, tab]);

  return (
    <div>
      <div id="hh-list" style={{ textAlign: "center", marginBottom: 8, scrollMarginTop: 80 }}>
        <div style={{ color: "var(--gold-dk)", letterSpacing: 2, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Baylux Holiday Homes</div>
        <h2 style={{ color: "var(--navy)", margin: "6px 0 0", fontSize: "clamp(22px,3vw,30px)" }}>{t("hh_list_h")}</h2>
      </div>

      {/* Табы */}
      <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", borderBottom: "1px solid var(--line)", margin: "20px 0 28px" }}>
        {TABS.map(([k, lk]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 16, fontWeight: tab === k ? 800 : 600,
              color: tab === k ? "var(--navy)" : "var(--ink-soft)",
              padding: "0 2px 12px", marginBottom: -1,
              borderBottom: `3px solid ${tab === k ? "var(--gold)" : "transparent"}`,
            }}
          >
            {t(lk)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", textAlign: "center" }}>{t("hh_empty")}</p>
      ) : (
        <div className="hh-grid">
          {filtered.map((it) => {
            const tyL = it.rooms === 0 ? t("ht_studio") : t("ht_1");
            const desc = it.desc || `${tyL}, ${it.area} ${t("sqm")} — ${t("hh_tag")}`;
            const loc = it.bname || it.area_name || "";
            const Wrap = isMock ? "div" : Link;
            const wp = isMock ? {} : { href: `/property/${it.slug}` };
            return (
              <Wrap key={it.id} className="hh-card" {...wp}>
                <div className="hh-ph">
                  <img src={it.photo} alt={desc} loading="lazy" />
                  <span className="managed-badge">🏠 {t("managed_badge")}</span>
                </div>
                <div style={{ padding: "10px 2px 2px" }}>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 18 }}>
                    <span className="bx-price" data-num={it.priceNum} data-cur={it.currency || "USD"}>{fmtMoney(it.priceNum, it.currency || "USD")}</span>{t("hh_night")}
                  </div>
                  <div className="hh-desc">{desc}</div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>📍 {cityLabel(lang, "Батуми")}{loc ? ` · ${loc}` : ""}</div>
                </div>
              </Wrap>
            );
          })}
        </div>
      )}
    </div>
  );
}
