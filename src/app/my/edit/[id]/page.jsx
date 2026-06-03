import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import AddListingForm from "@/components/AddListingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Редактирование объявления" };

export default async function EditListingPage({ params }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) redirect("/my");
  const { data: r } = await supa.from("listings").select("*").eq("id", params.id).single();
  // Владелец — по tg_user_id; админ может редактировать любое объявление.
  if (!r || (String(r.tg_user_id) !== String(session.id) && !isAdmin(session))) redirect("/my");

  const initial = {
    f: {
      country: "Грузия",
      city: r.district || "Батуми",
      deal: r.deal || "sale",
      type: r.type || "Квартира",
      complex: r.complex || "",
      address: r.building_name || "",
      price: r.price_num != null ? String(r.price_num) : (String(r.price || "").replace(/[^\d]/g, "") || ""),
      currency: r.currency === "GEL" ? "GEL" : "USD",
      area: r.area ? String(r.area) : "",
      rooms: r.rooms ? String(r.rooms) : "",
      bathrooms: r.bathrooms ? String(r.bathrooms) : "",
      floor: r.floor && r.floor !== "—" ? r.floor : "",
      year: r.year ? String(r.year) : "",
      about: r.about || "",
      contact: r.phone || r.contact || "",
      tg: r.tg_username || "",
      noCommission: !!r.no_commission,
    },
    amenities: typeof r.amenities === "string" && r.amenities ? r.amenities.split(",").map((s) => s.trim()).filter(Boolean) : [],
    geo: r.lat && r.lng ? { lat: Number(r.lat), lng: Number(r.lng) } : null,
    photos: Array.isArray(r.photos) ? r.photos : [],
  };

  return (
    <div className="wrap" style={{ paddingBlock: "26px 50px" }}>
      <div className="crumbs"><Link href="/my">← Мои объявления</Link></div>
      <h1 style={{ color: "var(--navy)", marginBottom: 6 }}>Редактирование объявления</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 14 }}>{isAdmin(session) ? "Изменения публикуются сразу — без модерации." : "После сохранения объявление снова уйдёт на модерацию и временно скроется с сайта."}</p>
      <AddListingForm initial={initial} editId={r.id} />
    </div>
  );
}
