import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import LoginBlock from "@/components/LoginBlock";
import AddListingForm from "@/components/AddListingForm";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Сдать квартиру в управление Baylux",
  description: "Заведите квартиру в управление Baylux: посуточная и долгосрочная аренда под ключ. Гости, заселение, уборка и отчёты — на нас.",
  robots: { index: false, follow: false },
};

export default function AddHolidayPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("hs_title")}</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>{t("hs_intro")}</p>
        <LoginBlock />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "30px 0 50px", maxWidth: 760 }}>
      <h1 style={{ color: "var(--navy)" }}>{t("hs_title")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 22px", lineHeight: 1.6 }}>{t("hs_intro")}</p>
      {/* managed:true — объект попадёт в «Жильё под управлением Baylux» и (при deal=daily) в посуточную аренду */}
      <AddListingForm initial={{ f: { deal: "daily", type: "Квартира", managed: true } }} />
    </div>
  );
}
