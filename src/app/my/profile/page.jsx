import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import LoginBlock from "@/components/LoginBlock";
import RealtorPanel from "@/components/RealtorPanel";
import DataRights from "@/components/DataRights";
import { loadCabinet } from "@/data/cabinetLoad";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Профиль", robots: { index: false, follow: false } };

export default async function MyProfilePage() {
  const lang = getLang();
  const session = verifySession(cookies().get("bx_session")?.value);
  // Без входа — форма входа прямо здесь (а не редирект на /my): после входа страница
  // перезагружается и человек остаётся в профиле. Сюда ведёт пункт меню «Стать риелтором».
  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{tr(lang, "rp_become")}</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>{tr(lang, "rp_login_p")}</p>
        <LoginBlock />
      </div>
    );
  }
  const d = await loadCabinet(session, lang, { withDashboard: false });
  return (
    <div>
      <div className="cabsh-head"><div><h1>{tr(lang, "cab_nav_profile")}</h1></div></div>
      <RealtorPanel initial={d.realtor} />
      <DataRights />
    </div>
  );
}
