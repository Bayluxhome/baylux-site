import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import AdminRealtors from "@/components/AdminRealtors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Риелторы — Админ", robots: { index: false, follow: false } };

export default async function AdminRealtorsPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "realtors")) redirect("/admin");

  let realtors = [];
  if (supa) {
    const { data } = await supa.from("realtors").select("*").order("created_at", { ascending: false });
    realtors = data || [];
    // Число объявлений на риелтора (по email или Telegram-id владельца)
    const { data: lst } = await supa.from("listings").select("owner_email, tg_user_id");
    const byEmail = {}, byTg = {};
    (lst || []).forEach((l) => {
      if (l.owner_email) { const k = String(l.owner_email).toLowerCase(); byEmail[k] = (byEmail[k] || 0) + 1; }
      if (l.tg_user_id != null) { const k = String(l.tg_user_id); byTg[k] = (byTg[k] || 0) + 1; }
    });
    realtors = realtors.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      bio: r.bio,
      photo: r.photo,
      deal_types: r.deal_types,
      status: r.status,
      created_at: r.created_at,
      account: r.tg_user_id != null ? `tg:${r.tg_user_id}` : (r.email || ""),
      listings: r.tg_user_id != null ? (byTg[String(r.tg_user_id)] || 0) : (byEmail[String(r.email || "").toLowerCase()] || 0),
    }));
  }

  const pending = realtors.filter((r) => r.status === "pending").length;

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="crumbs"><Link href="/admin">← Админ-панель</Link></div>
      <h1 style={{ color: "var(--navy)", marginTop: 8 }}>Риелторы</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>Всего {realtors.length} · на модерации {pending}</p>
      <AdminRealtors realtors={realtors} />
    </div>
  );
}
