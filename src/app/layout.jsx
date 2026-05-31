import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LeadModal from "@/components/LeadModal";
import CurrencyManager from "@/components/CurrencyManager";
import { getUsdGel } from "@/lib/rate";

export const metadata = {
  metadataBase: new URL("https://bayluxhome.com"),
  title: {
    default: "Baylux — недвижимость в Батуми: купить, продать, снять, сдать",
    template: "%s — Baylux",
  },
  description:
    "Проверенные квартиры, дома и апартаменты в Батуми у моря. Купить, продать, снять или сдать недвижимость — прозрачные цены и помощь местной команды Baylux.",
  openGraph: {
    title: "Baylux — недвижимость в Батуми",
    description: "Купить, продать, снять или сдать недвижимость в Батуми у моря.",
    type: "website",
    locale: "ru_RU",
  },
};

export default async function RootLayout({ children }) {
  const rate = await getUsdGel();
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CurrencyManager rate={rate} />
        <Header />
        <main>{children}</main>
        <Footer />
        <LeadModal />
      </body>
    </html>
  );
}
