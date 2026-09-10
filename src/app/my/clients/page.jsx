import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import ClientsList from "@/components/ClientsList";
import { listClients, pubClient, seesAll } from "@/lib/clients";
import { getRole, canCrm } from "@/lib/roles";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Клиенты", robots: { index: false, follow: false } };

export default async function ClientsPage() {
  const lang = getLang();
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) redirect("/my");
  if (!canCrm(await getRole(session))) redirect("/my"); // CRM-раздел — только риелтор/сотрудник
  const clients = (await listClients(session)).map(pubClient);
  return (
    <div>
      <div className="cabsh-head"><div><h1>{tr(lang, "cab_nav_clients")}</h1><p>{tr(lang, "cl_page_p")}</p></div></div>
      <ClientsList clients={clients} seesAll={seesAll(session)} />
    </div>
  );
}
