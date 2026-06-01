import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import LoginBlock from "@/components/LoginBlock";
import BulkUpload from "@/components/BulkUpload";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Массовая загрузка объявлений" };

export default function BulkPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("bulk_title")}</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>{t("cab_login_p")}</p>
        <LoginBlock />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px", maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ color: "var(--navy)" }}>{t("bulk_title")}</h1>
        <a className="btn btn-ghost" href="/my" style={{ padding: "9px 16px" }}>← {t("af_my")}</a>
      </div>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px", lineHeight: 1.6 }}>{t("bulk_desc")}</p>
      <BulkUpload />
    </div>
  );
}
