import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import AdminNews from "@/components/AdminNews";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новости — Админ", robots: { index: false, follow: false } };

export default async function AdminNewsPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isAdmin(session)) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Новости — Админ</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>Доступ только для администраторов.</p>
      </div>
    );
  }

  let rows = [];
  if (supa) {
    const { data } = await supa.from("news").select("*").order("created_at", { ascending: false });
    rows = data || [];
  }

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <h1 style={{ color: "var(--navy)" }}>Управление новостями</h1>
        <a className="btn btn-ghost" href="/admin" style={{ padding: "9px 16px" }}>← Админка</a>
      </div>
      <AdminNews items={rows} />
    </div>
  );
}
