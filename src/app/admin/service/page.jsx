import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Сервис — Админ", robots: { index: false, follow: false } };

// «Сервис» (T-20261128-02): служебные разделы, убранные из основного меню (код не удалён):
// импорт сводки, контакты собственников, объекты в управлении, список служебных адресов.
// Служебные адреса показаны ТЕКСТОМ, без ссылок: часть из них при открытии меняет базу.
const API = [
  ["/api/admin/audit", "sv_api_audit"],
  ["/api/admin/wm-scan", "sv_api_wm"],
  ["/api/admin/r2-migrate", "sv_api_r2"],
  ["/api/admin/phone-migrate", "sv_api_phone"],
  ["/api/admin/regeocode", "sv_api_geo"],
  ["/api/admin/rooms-fix", "sv_api_rooms"],
  ["/api/admin/content-check", "sv_api_content"],
];

export default async function AdminServicePage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) redirect("/admin");
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const card = { background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" };

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>{t("sv_h")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 18px" }}>{t("sv_p")}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Link className="btn btn-ghost" href="/admin/reports" style={{ padding: "9px 16px" }}>📊 {t("sv_import")}</Link>
        <Link className="btn btn-ghost" href="/admin/owner-contacts" style={{ padding: "9px 16px" }}>📇 {t("sv_owner")}</Link>
        <Link className="btn btn-ghost" href="/my/objects?tab=managed" style={{ padding: "9px 16px" }}>🏠 {t("sv_managed")}</Link>
      </div>
      <div style={card}>
        <b style={{ color: "var(--navy)" }}>{t("sv_api_h")}</b>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8 }}>
          <tbody>
            {API.map(([p, k]) => (
              <tr key={p}>
                <td style={{ padding: "8px 10px", borderTop: "1px solid var(--line)", whiteSpace: "nowrap" }}><code>{p}</code></td>
                <td style={{ padding: "8px 10px", borderTop: "1px solid var(--line)", color: "var(--ink-soft)" }}>{t(k)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
