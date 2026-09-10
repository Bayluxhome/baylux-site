import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import CollectionsList from "@/components/CollectionsList";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Подборки", robots: { index: false, follow: false } };

export default function MyCollectionsPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) redirect("/my");
  return (
    <div>
      <div className="cabsh-head"><div><h1>{tr(getLang(), "cab_nav_collections")}</h1></div></div>
      <CollectionsList />
    </div>
  );
}
