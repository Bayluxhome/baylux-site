"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/components/LangContext";

const KEY = "bxConsent";
const YEAR = 365 * 24 * 3600;

function save(obj) {
  const val = JSON.stringify({ ...obj, ts: Date.now() });
  try { localStorage.setItem(KEY, val); } catch (e) {}
  try { document.cookie = `cookie_consent=${encodeURIComponent(val)};path=/;max-age=${YEAR};SameSite=Lax`; } catch (e) {}
  if (typeof window !== "undefined") {
    window.bxConsent = obj;
    // Сообщаем аналитике о выборе, чтобы Consent Mode обновился без перезагрузки страницы.
    try { window.dispatchEvent(new CustomEvent("bx:consent", { detail: obj })); } catch (e) {}
  }
}

export default function CookieConsent() {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const [adv, setAdv] = useState(false);
  const [an, setAn] = useState(false);
  const [mk, setMk] = useState(false);

  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    const fresh = saved && saved.ts && Date.now() - saved.ts < YEAR * 1000;
    if (fresh) { window.bxConsent = saved; }
    else setShow(true);
    window.bxOpenCookie = () => { if (saved) { setAn(!!saved.analytics); setMk(!!saved.marketing); } setAdv(true); setShow(true); };
  }, []);

  function decide(analytics, marketing) {
    save({ necessary: true, analytics, marketing });
    setShow(false);
    setAdv(false);
  }

  if (!show) return null;
  return (
    <div className="cookie-bar" role="dialog" aria-label={t("cc_title")}>
      <div className="wrap cookie-inner">
        {!adv ? (
          <>
            <p className="cookie-tx">{t("cc_text")} <Link href="/cookies">{t("cc_title")}</Link></p>
            <div className="cookie-btns">
              <button className="btn btn-ghost" onClick={() => decide(false, false)}>{t("cc_nec")}</button>
              <button className="btn btn-ghost" onClick={() => setAdv(true)}>{t("cc_settings")}</button>
              <button className="btn btn-gold" onClick={() => decide(true, true)}>{t("cc_all")}</button>
            </div>
          </>
        ) : (
          <div className="cookie-adv">
            <div className="cookie-cat"><div><b>{t("cc_cat_nec")}</b><span>{t("cc_cat_nec_d")}</span></div><input type="checkbox" checked disabled /></div>
            <div className="cookie-cat"><div><b>{t("cc_cat_an")}</b><span>{t("cc_cat_an_d")}</span></div><input type="checkbox" checked={an} onChange={(e) => setAn(e.target.checked)} /></div>
            <div className="cookie-cat"><div><b>{t("cc_cat_mk")}</b><span>{t("cc_cat_mk_d")}</span></div><input type="checkbox" checked={mk} onChange={(e) => setMk(e.target.checked)} /></div>
            <div className="cookie-btns">
              <button className="btn btn-ghost" onClick={() => decide(false, false)}>{t("cc_nec")}</button>
              <button className="btn btn-gold" onClick={() => decide(an, mk)}>{t("cc_save")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
