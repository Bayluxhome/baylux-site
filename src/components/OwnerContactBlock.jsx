"use client";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

// Служебный блок «Контакт собственника/арендодателя» (задача №02).
// Показывается ТОЛЬКО там, где сервер уже отфильтровал данные по правам — сам компонент
// прав не проверяет, он просто ничего не рисует, если полей нет.
// Действия появляются только для тех данных, что есть: позвонить, скопировать,
// открыть Telegram, открыть исходное объявление. Нет контакта → явное сообщение + источник.
export default function OwnerContactBlock({ name, phone, tg, email, sourceRef, sourceUrl, className = "my-owner" }) {
  const { t } = useLang();
  const [copied, setCopied] = useState("");
  const has = name || phone || tg || email;
  if (!has && !sourceUrl && !sourceRef) return null;

  async function copy(v) {
    try { await navigator.clipboard.writeText(v); setCopied(v); setTimeout(() => setCopied(""), 1500); } catch { /* буфер недоступен */ }
  }
  const Copy = ({ v }) => (
    <button type="button" className="oc-copy" title={t("oc_copy")} onClick={() => copy(v)} aria-label={t("oc_copy")}>
      {copied === v ? "✓" : "⧉"}
    </button>
  );

  return (
    <div className={className}>
      <span className={className + "-lb"}>{t("mg_owner_contact")}:</span>
      {has ? (
        <>
          {name && <span>{name}</span>}
          {phone && <span className="oc-item"><a href={`tel:${phone}`}>📞 {phone}</a><Copy v={phone} /></span>}
          {tg && <span className="oc-item"><a href={`https://t.me/${tg}`} target="_blank" rel="noopener">✈️ @{tg}</a><Copy v={"@" + tg} /></span>}
          {email && <span className="oc-item"><a href={`mailto:${email}`}>✉️ {email}</a><Copy v={email} /></span>}
        </>
      ) : (
        <span className="oc-none">{t("oc_none")}</span>
      )}
      {sourceUrl && <a className="oc-src" href={sourceUrl} target="_blank" rel="noopener">↗ {t("oc_source")}</a>}
      {sourceRef && <span className={className + "-ref"}>#{sourceRef}</span>}
    </div>
  );
}
