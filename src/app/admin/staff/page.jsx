import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import StaffTable from "@/components/StaffTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Сотрудники — Админ", robots: { index: false, follow: false } };

export default async function StaffPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) redirect("/admin");

  let users = [];
  if (supa) {
    const { data } = await supa
      .from("site_users")
      .select("tg_user_id, email, name, username, is_admin")
      .order("is_admin", { ascending: false })
      .order("created_at", { ascending: false });
    users = (data || []).map((u) => ({
      key: u.email || (u.tg_user_id != null ? "tg:" + u.tg_user_id : Math.random().toString(36)),
      tg_user_id: u.tg_user_id ?? null,
      email: u.email || "",
      name: u.name || "",
      username: u.username || "",
      is_admin: !!u.is_admin,
    }));
  }

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="crumbs"><Link href="/admin">← Админ-панель</Link></div>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>Сотрудники и права</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 18px", maxWidth: 720, lineHeight: 1.6 }}>
        Выдавайте админ-права сотрудникам. Главный админ задан в конфигурации и всегда имеет доступ — его права здесь не меняются.
        Новые права вступают в силу при следующем входе сотрудника.
      </p>
      <StaffTable users={users} />
    </div>
  );
}
