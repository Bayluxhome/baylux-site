import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import CabinetTabs from "@/components/CabinetTabs";
import { loadCabinet } from "@/data/cabinetLoad";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои объекты", robots: { index: false, follow: false } };

export default async function MyObjectsPage() {
  const lang = getLang();
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) redirect("/my");
  const d = await loadCabinet(session, lang, { withDashboard: false });
  return (
    <div>
      <div className="cabsh-head"><div><h1>{tr(lang, "cab_nav_objects")}</h1></div></div>
      <CabinetTabs listings={d.ownItems} managed={d.managedItems} adminView={d.canMng} />
    </div>
  );
}
