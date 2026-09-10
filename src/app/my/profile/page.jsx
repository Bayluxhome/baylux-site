import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
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
  if (!session) redirect("/my");
  const d = await loadCabinet(session, lang, { withDashboard: false });
  return (
    <div>
      <div className="cabsh-head"><div><h1>{tr(lang, "cab_nav_profile")}</h1></div></div>
      <RealtorPanel initial={d.realtor} />
      <DataRights />
    </div>
  );
}
