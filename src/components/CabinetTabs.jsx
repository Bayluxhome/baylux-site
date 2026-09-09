"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/components/LangContext";
import MyListings from "@/components/MyListings";
import ManagedPanel from "@/components/ManagedPanel";
import CollectionsList from "@/components/CollectionsList";

export default function CabinetTabs({ listings, managed, adminView }) {
  const { t } = useLang();
  const [tab, setTab] = useState("mine");
  // #collections в адресе — сразу открыть вкладку подборок (сюда ведёт панель выбора).
  // В useEffect, а не в начальном состоянии: иначе серверный и клиентский HTML разошлись бы.
  useEffect(() => { if (window.location.hash === "#collections") setTab("collections"); }, []);

  const TABS = [
    ["mine", t("cab_tab_mine"), listings.length],
    ["managed", t("cab_tab_managed"), managed.length],
    ["collections", t("cab_tab_collections"), 0],
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--line)", margin: "0 0 20px", flexWrap: "wrap" }}>
        {TABS.map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 15, fontWeight: tab === k ? 800 : 600,
              color: tab === k ? "var(--navy)" : "var(--ink-soft)",
              padding: "0 2px 12px", marginBottom: -1,
              borderBottom: `3px solid ${tab === k ? "var(--gold)" : "transparent"}`,
            }}
          >
            {k === "managed" ? "🏠 " : k === "collections" ? "🗂 " : ""}{label}{n ? ` · ${n}` : ""}
          </button>
        ))}
      </div>
      {tab === "mine" ? <MyListings items={listings} /> : tab === "collections" ? <CollectionsList /> : <ManagedPanel items={managed} adminView={adminView} />}
    </div>
  );
}
