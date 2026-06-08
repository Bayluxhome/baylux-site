import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, can, isResponsible } from "@/lib/session";
import { supa } from "@/lib/supabase";
import ReportsUpload from "@/components/ReportsUpload";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Импорт сводки — Админ", robots: { index: false, follow: false } };

export default async function ReportsImportPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  const canMng = can(session, "managed");
  // Доступ: управляющий (managed) ИЛИ ответственный хотя бы за один объект в управлении.
  let allowed = canMng;
  if (!allowed && session && supa) {
    const { data: lst } = await supa.from("listings")
      .select("id, responsible_tg, responsible_email")
      .eq("managed_by_baylux", true);
    allowed = (lst || []).some((l) => isResponsible(session, l));
  }
  if (!allowed) redirect("/my");
  const lang = getLang();
  const t = (k) => tr(lang, k);

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="crumbs"><Link href={canMng ? "/admin" : "/my"}>← {canMng ? "Админ-панель" : t("my_title")}</Link></div>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>{t("rep_title")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 18px", maxWidth: 720, lineHeight: 1.6 }}>{t("rep_page_p")}</p>
      <ReportsUpload />
    </div>
  );
}
