"use client";
import Script from "next/script";
import { useEffect } from "react";
import { GA_ID, CLARITY_ID } from "@/config";

// Аналитика подключается ТОЛЬКО при согласии на cookies (Consent Mode v2):
// по умолчанию analytics_storage=denied, после согласия — update на granted.
// Это требование нашей же политики cookies и GDPR/грузинского регулирования.
function hasAnalyticsConsent() {
  try {
    const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
    if (!m) return false; // выбор ещё не сделан — до согласия не грузим
    const c = JSON.parse(decodeURIComponent(m[1]));
    return !!(c && c.analytics);
  } catch (e) {
    return false;
  }
}

export default function GoogleAnalytics() {
  // Реагируем на выбор в баннере cookies без перезагрузки страницы.
  useEffect(() => {
    const apply = () => {
      if (typeof window.gtag !== "function") return;
      const granted = hasAnalyticsConsent();
      window.gtag("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    };
    apply();
    window.addEventListener("bx:consent", apply);
    return () => window.removeEventListener("bx:consent", apply);
  }, []);

  if (!GA_ID) return null; // ID не задан — ничего не грузим

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">{`
        window.dataLayer=window.dataLayer||[];
        function gtag(){dataLayer.push(arguments);}
        window.gtag=gtag;
        gtag('consent','default',{
          analytics_storage:'denied', ad_storage:'denied',
          ad_user_data:'denied', ad_personalization:'denied', wait_for_update:500
        });
      `}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { anonymize_ip: true });
      `}</Script>
      {CLARITY_ID && (
        <Script id="clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `}</Script>
      )}
    </>
  );
}
