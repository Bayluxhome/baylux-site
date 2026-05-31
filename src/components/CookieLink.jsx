"use client";
import { useLang } from "@/components/LangContext";

export default function CookieLink() {
  const { t } = useLang();
  return (
    <button type="button" className="cookie-link" onClick={() => { if (typeof window !== "undefined" && window.bxOpenCookie) window.bxOpenCookie(); }}>
      {t("foot_cookies")}
    </button>
  );
}
