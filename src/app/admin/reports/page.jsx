import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, can } from "@/lib/session";
import ReportsUpload from "@/components/ReportsUpload";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Импорт сводки — Админ", robots: { index: false, follow: false } };

export default function ReportsImportPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "managed")) redirect("/admin");
  const lang = getLang();
  const t = (k) => tr(lang, k);

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="crumbs"><Link href="/admin">← Админ-панель</Link></div>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>{t("rep_title")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 18px", maxWidth: 720, lineHeight: 1.6 }}>{t("rep_page_p")}</p>
      <ReportsUpload />
    </div>
  );
}
