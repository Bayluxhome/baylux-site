import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { slugify } from "@/data/sheet";
import AdminListings from "@/components/AdminListings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ-панель", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!isAdmin(session)) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Админ-панель</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
          Доступ только для администраторов. Войдите под админ-аккаунтом на странице <a href="/my" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>«Войти»</a>.
        </p>
      </div>
    );
  }

  let rows = [];
  if (supa) {
    const { data } = await supa.from("listings").select("*").order("created_at", { ascending: false });
    rows = data || [];
  }

  // Поиск дублей: по совпадению фото-хэшей ИЛИ по адрес+площадь+комнаты+цена.
  const hashOwners = new Map();
  const fbOwners = new Map();
  const fbKey = (r) => {
    const bn = String(r.building_name || "").toLowerCase().trim();
    if (!bn || !(r.area > 0)) return null;
    return [bn, r.area, r.rooms || 0, String(r.price || "")].join("|");
  };
  rows.forEach((r) => {
    (Array.isArray(r.photo_hashes) ? r.photo_hashes : []).forEach((h) => {
      if (!h) return; if (!hashOwners.has(h)) hashOwners.set(h, []); hashOwners.get(h).push(r.id);
    });
    const k = fbKey(r); if (k) { if (!fbOwners.has(k)) fbOwners.set(k, []); fbOwners.get(k).push(r.id); }
  });
  const dupesOf = (r) => {
    const set = new Set();
    (Array.isArray(r.photo_hashes) ? r.photo_hashes : []).forEach((h) => (hashOwners.get(h) || []).forEach((id) => { if (id !== r.id) set.add(id); }));
    const k = fbKey(r); if (k) (fbOwners.get(k) || []).forEach((id) => { if (id !== r.id) set.add(id); });
    return [...set];
  };

  const items = rows.map((r) => ({
    id: r.id,
    title: `${r.deal} · ${r.type}`,
    sub: `${r.building_name} · ${r.price}${r.area ? ` · ${r.area} м²` : ""}`,
    status: r.status,
    owner: r.owner_email || (r.tg_user_id ? `tg:${r.tg_user_id}` : ""),
    photo: (Array.isArray(r.photos) && r.photos[0]) || "/placeholder-baylux.jpg",
    slug: r.status === "approved" ? slugify(`${r.building_name}-${r.type || ""}-${r.price || ""}`) : null,
    dupes: dupesOf(r),
  }));

  const counts = rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>Админ-панель</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>
        Всего {rows.length} · одобрено {counts.approved || 0} · на модерации {counts.pending || 0} · снято {counts.rejected || 0}
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <a className="btn btn-ghost" href="/admin/news" style={{ padding: "9px 16px" }}>📰 Управление новостями</a>
      </div>
      <h2 style={{ color: "var(--navy)", fontSize: 18, marginBottom: 12 }}>Все объявления</h2>
      <AdminListings items={items} />
    </div>
  );
}
