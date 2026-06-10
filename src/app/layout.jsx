import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LeadModal from "@/components/LeadModal";
import CookieConsent from "@/components/CookieConsent";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import CurrencyManager from "@/components/CurrencyManager";
import { FilterProvider } from "@/components/FilterContext";
import { LangProvider } from "@/components/LangContext";
import { getUsdGel } from "@/lib/rate";
import { getCityCounts } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { PHONE_DISPLAY, SOCIAL } from "@/config";

export const metadata = {
  metadataBase: new URL("https://bayluxhome.com"),
  title: {
    default: "Недвижимость в Грузии и Батуми — купить и снять квартиру у моря | Baylux",
    template: "%s — Baylux",
  },
  description:
    "Проверенные квартиры и апартаменты в Грузии и Батуми у моря. Купить, продать, снять или сдать недвижимость — прозрачные цены и помощь местной команды Baylux.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Baylux — недвижимость в Грузии и Батуми",
    description: "Купить, продать, снять или сдать квартиру в Грузии и Батуми у моря.",
    type: "website",
    locale: "ru_RU",
    siteName: "Baylux Home",
    url: "https://bayluxhome.com",
    images: [
      { url: "/hero-batumi.jpg", width: 1200, height: 630, alt: "Baylux — недвижимость в Батуми" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Baylux — недвижимость в Грузии и Батуми",
    description: "Купить, продать, снять или сдать квартиру в Грузии и Батуми у моря.",
    images: ["/hero-batumi.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "RealEstateAgent",
              name: "Baylux",
              alternateName: ["Baylux Home", "bayluxhome", "bayluxhome.com"],
              url: "https://bayluxhome.com",
              sameAs: [SOCIAL.instagram, SOCIAL.facebook].filter(Boolean),
              logo: "https://bayluxhome.com/baylux_logo.svg",
              image: "https://bayluxhome.com/hero-batumi.jpg",
              description:
                "Агентство недвижимости в Батуми: продажа, аренда, посуточная аренда, управление и клининг.",
              areaServed: { "@type": "City", name: "Batumi", address: { "@type": "PostalAddress", addressCountry: "GE" } },
              address: { "@type": "PostalAddress", addressLocality: "Батуми", addressCountry: "GE" },
              telephone: PHONE_DISPLAY,
              email: "bayluxhome@gmail.com",
            }),
          }}
        />
        <LangProvider initial={initialLang}>
          <FilterProvider>
            <CurrencyManager rate={rate} />
            <Header cityCounts={cityCounts} />
            <main>{children}</main>
            <Footer />
            <LeadModal />
            <CookieConsent />
            <AnalyticsConsent />
          </FilterProvider>
        </LangProvider>
      </body>
    </html>
  );
}
