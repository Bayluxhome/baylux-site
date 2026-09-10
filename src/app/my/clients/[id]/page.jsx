import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { getClient, ownsClient, pubClient, seesAll } from "@/lib/clients";
import { getRole, canCrm } from "@/lib/roles";
import { slugify, cleanAddress } from "@/data/sheet";
import ClientCard from "@/components/ClientCard";
import { getLang } from "@/lib/serverLang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Клиент", robots: { index: false, follow: false } };

// Карточка клиента (задача №06, п.3). Данные и право — на сервере; клиент видит только своё.
export default async function ClientPage({ params }) {
  const lang = getLang();
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) redirect("/my");
  if (!canCrm(await getRole(session))) redirect("/my");
  const c = await getClient(params.id);
  if (!c || !ownsClient(session, c)) notFound();

  const { data: notes } = await supa.from("client_notes").select("*").eq("client_id", c.id).order("created_at", { ascending: false }).limit(200);

  // Связанные подборки: по явной привязке или по совпадению телефона/Telegram клиента.
  let cq = supa.from("collections").select("id, token, title, items, enabled, created_at, client_id, client_phone, client_tg");
  const ors = [`client_id.eq.${c.id}`];
  if (c.phone) ors.push(`client_phone.eq.${c.phone}`);
  if (c.tg) ors.push(`client_tg.eq.${c.tg}`);
  const { data: colls } = await cq.or(ors.join(",")).order("created_at", { ascending: false }).limit(50);

  // Связанные обращения: по привязке или телефону (в заявках телефон в свободном формате — сравниваем по цифрам).
  let leads = [];
  if (c.phone) {
    const tail = c.phone.slice(-9);
    const { data } = await supa.from("leads").select("id, created_at, type_key, object_title, listing_id, status, comment, phone, client_id").or(`client_id.eq.${c.id},phone.ilike.%${tail}%`).order("created_at", { ascending: false }).limit(50);
    leads = data || [];
  } else {
    const { data } = await supa.from("leads").select("id, created_at, type_key, object_title, listing_id, status, comment, phone, client_id").eq("client_id", c.id).order("created_at", { ascending: false }).limit(50);
    leads = data || [];
  }
  const ids = [...new Set(leads.map((l) => l.listing_id).filter(Boolean))];
  const slugById = {};
  if (ids.length) {
    const { data: ls } = await supa.from("listings").select("id, building_name, type, price, status").in("id", ids);
    (ls || []).forEach((l) => { if (l.status === "approved") slugById[l.id] = slugify(`${cleanAddress(l.building_name)}-${l.type || ""}-${l.price || ""}`); });
  }

  return (
    <ClientCard
      client={pubClient(c)}
      notes={(notes || []).map((n) => ({ id: n.id, body: n.body, author: n.author, at: n.created_at }))}
      collections={(colls || []).map((x) => ({ id: x.id, token: x.token, title: x.title, count: Array.isArray(x.items) ? x.items.length : 0, enabled: x.enabled, items: (x.items || []).slice(0, 8) }))}
      leads={leads.map((l) => ({ ...l, slug: slugById[l.listing_id] || "" }))}
      canReassign={seesAll(session)}
    />
  );
}
