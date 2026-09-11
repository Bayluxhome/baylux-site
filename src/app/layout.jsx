import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LeadModal from "@/components/LeadModal";
import CookieConsent from "@/components/CookieConsent";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import VisitTracker from "@/components/VisitTracker";
import CurrencyManager from "@/components/CurrencyManager";
import { FilterProvider } from "@/components/FilterContext";
import { LangProvider } from "@/components/LangContext";
import { getUsdGel } from "@/lib/rate";
import { getCityCounts } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { SITE_URL } from "@/config";
import { orgJsonLd, serializeJsonLd } from "@/lib/jsonld";

// Метаданные зависят от языка посетителя (getLang: cookie/домен/гео), поэтому это функция,
// а не статический объект. Иначе грузинский посетитель видел бы грузинский сайт, но русский
// заголовок во вкладке и в поиске — нарушение правила «без хардкода одного языка».
const OG_LOCALE = { ru: "ru_RU", en: "en_US", ka: "ka_GE" };

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("meta_home_t"), template: "%s — Baylux" },
    description: t("meta_home_d"),
    alternates: { canonical: "/" },
    openGraph: {
      title: t("meta_og_t"),
      description: t("meta_og_d"),
      type: "website",
      locale: OG_LOCALE[lang] || "ka_GE",
      siteName: "Baylux Home",
      url: SITE_URL,
      images: [{ url: "/hero-batumi.jpg", width: 1200, height: 630, alt: t("meta_og_t") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta_og_t"),
      description: t("meta_og_d"),
      images: ["/hero-batumi.jpg"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function RootLayout({ children }) {
  const rate = await getUsdGel();
  const cityCounts = await getCityCounts();
  // Язык по умолчанию по домену/рынку (.ge→ka, .com→en, Грузия→ka) + уважение cookie.
  const initialLang = getLang();
  return (
    <html lang={initialLang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Организация: одна сущность с @id (переиспользуется в JSON-LD объектов); areaServed — Грузия, address — офис в Батуми */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgJsonLd(initialLang)) }} />
        <LangProvider initial={initialLang}>
          <FilterProvider>
            <CurrencyManager rate={rate} />
            <Header cityCounts={cityCounts} />
            <main>{children}</main>
            <Footer />
            <LeadModal />
            <CookieConsent />
            <AnalyticsConsent />
            <GoogleAnalytics />
            <VisitTracker />
          </FilterProvider>
        </LangProvider>
      </body>
    </html>
  );
}
