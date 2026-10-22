"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID } from "@/config";

// Meta Pixel (22.10.2026) — тот же код, что прислал подрядчик по рекламе, но:
//  • грузится ТОЛЬКО после согласия на маркетинговые cookies (баннер cookies, категория «маркетинг») —
//    так требует наша политика cookies; до согласия к Facebook не уходит ничего;
//  • PageView отправляется и при переходах внутри сайта (Next.js не перезагружает страницу).
// <noscript>-картинку из оригинального кода не ставим: её нельзя привязать к согласию.
function hasMarketingConsent() {
  try {
    const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
    if (!m) return false;
    const c = JSON.parse(decodeURIComponent(m[1]));
    return !!(c && c.marketing);
  } catch { return false; }
}

function loadPixel(id) {
  if (window.fbq) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq("init", id);
}

export default function MetaPixel() {
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const lastPath = useRef("");

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    const apply = () => {
      const ok = hasMarketingConsent();
      if (ok) loadPixel(META_PIXEL_ID);
      if (window.fbq) window.fbq("consent", ok ? "grant" : "revoke");
      setOn(ok);
    };
    apply();
    window.addEventListener("bx:consent", apply);
    return () => window.removeEventListener("bx:consent", apply);
  }, []);

  useEffect(() => {
    if (!on || !window.fbq || lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.fbq("track", "PageView");
  }, [on, pathname]);

  return null;
}
