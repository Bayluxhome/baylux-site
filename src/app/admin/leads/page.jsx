import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, can } from "@/lib/session";
import { supa, fetchAll } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { leadKind, leadOrigin } from "@/lib/leadKind";
import { slugify, cleanAddress } from "@/data/sheet";
import AdminLeads from "@/components/AdminLeads";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заявки — Админ", robots: { index: false, follow: false } };

// Раздел «Заявки» (T-20261128-02): ВСЕ заявки — формы сайта, чат Tati, подборки, ЖК.
// Статус новая / в работе / закрыта, ответственный, комментарий, фильтры. Ничего не удаляется.
// Право — «Заявки клиентов» (leads).
export default async function AdminLeadsPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "leads")) redirect("/admin");
  const lang = getLang();
  const t = (k) => tr(lang, k);

  const rows = await fetchAll("leads", "*", (q) => q.order("created_at", { ascending: false }), 5);
  // Ссылки на карточки объектов (только опубликованные).
  const ids = [...new Set(rows.map((l) => l.listing_id).filter(Boolean))].slice(0, 300);
  const slugById = {};
  if (supa && ids.length) {
    const { data: ls } = await supa.from("listings").select("id, building_name, type, price, status").in("id", ids);
    (ls || []).forEach((l) => { if (l.status === "approved") slugById[l.id] = slugify(`${cleanAddress(l.building_name)}-${l.type || ""}-${l.price || ""}`); });
  }
  // sql/038 выполнен? — у строки есть ключ manager (select * отдаёт все колонки таблицы).
  const sqlReady = rows.length === 0 || Object.prototype.hasOwnProperty.call(rows[0], "manager");

  const leads = rows.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    name: l.name || "",
    phone: l.phone || "",
    comment: l.comment || "",
    type: l.type || "",
    type_key: l.type_key || "other",
    kind: leadKind(l),
    origin: leadOrigin(l),
    source: l.source || "",
    object_title: l.object_title || "",
    slug: slugById[l.listing_id] || "",
    status: l.status || "new",
    manager: l.manager || "",
    note: l.staff_note || "",
    delivered: !!l.notified_at,
    notify_error: !l.notified_at && !!l.notify_error,
    handled_by: l.handled_by || "",
    handled_at: l.handled_at || "",
  }));

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>{t("al_h")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 18px" }}>{t("al_p")}</p>
      <AdminLeads leads={leads} sqlReady={sqlReady} />
    </div>
  );
}
