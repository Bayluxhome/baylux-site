import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LeadModal from "@/components/LeadModal";
import CookieConsent from "@/components/CookieConsent";
import { headers } from "next/headers";
import CurrencyManager from "@/components/CurrencyManager";
import { FilterProvider } from "@/components/FilterContext";
import { LangProvider } from "@/components/LangContext";
import { getUsdGel } from "@/lib/rate";

export const metadata = {
  metadataBase: new URL("https://bayluxhome.com"),
  title: {
    default: "Baylux — недвижимость в Батуми: купить, продать, снять, сдать",
    template: "%s — Baylux",
  },
  description:
    "Проверенные квартиры, дома и апартаменты в Батуми у моря. Купить, продать, снять или сдать недвижимость — прозрачные цены и помощь местной команды Baylux.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Baylux — недвижимость в Батуми",
    description: "Купить, продать, снять или сдать недвижимость в Батуми у моря.",
    type: "website",
    locale: "ru_RU",
    siteName: "Baylux",
    url: "https://bayluxhome.com",
    images: [
      { url: "/hero-batumi.jpg", width: 1200, height: 630, alt: "Baylux — недвижимость в Батуми" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Baylux — недвижимость в Батуми",
    description: "Купить, продать, снять или сдать недвижимость в Батуми у моря.",
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
  const country = headers().get("x-vercel-ip-country") || "";
  const initialLang = country === "GE" ? "ka" : "ru";
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
              url: "https://bayluxhome.com",
              logo: "https://bayluxhome.com/baylux_logo.svg",
              image: "https://bayluxhome.com/hero-batumi.jpg",
              description:
                "Агентство недвижимости в Батуми: продажа, аренда, посуточная аренда, управление и клининг.",
              areaServed: { "@type": "City", name: "Batumi", address: { "@type": "PostalAddress", addressCountry: "GE" } },
              address: { "@type": "PostalAddress", addressLocality: "Батуми", addressCountry: "GE" },
              telephone: "+995 511 12 47 81",
              email: "bayluxhome@yahoo.com",
            }),
          }}
        />
        <LangProvider initial={initialLang}>
          <FilterProvider>
            <CurrencyManager rate={rate} />
            <Header />
            <main>{children}</main>
            <Footer />
            <LeadModal />
            <CookieConsent />
          </FilterProvider>
        </LangProvider>
      </body>
    </html>
  );
}
