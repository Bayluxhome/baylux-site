import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import LeadsList from "@/components/LeadsList";
import { loadCabinet } from "@/data/cabinetLoad";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заявки", robots: { index: false, follow: false } };

export default async function MyLeadsPage() {
  const lang = getLang();
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) redirect("/my");
  const d = await loadCabinet(session, lang);
  return (
    <div>
      <div className="cabsh-head"><div><h1>{tr(lang, "cab_nav_leads")}</h1><p>{tr(lang, "cab_leads_p")}</p></div></div>
      <LeadsList leads={d.leads} />
    </div>
  );
}
