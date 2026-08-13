import Link from "next/link";
import { notFound } from "next/navigation";
import PropertyCard from "@/components/PropertyCard";
import { getRealtorById, getRealtorUnits } from "@/data/realtors";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Язык страницы зависит от посетителя → рендерим по запросу.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const r = await getRealtorById(params.id);
  if (!r) return { title: "Риелтор не найден", robots: { index: false, follow: false } };
  return {
    title: `${r.name} — риелтор Baylux в Батуми и Грузии`,
    description: (r.bio || `Объекты риелтора ${r.name}: продажа и аренда недвижимости в Батуми и по всей Грузии.`).slice(0, 300),
    alternates: { canonical: `/realtor/${r.id}` },
  };
}

export default async function RealtorPage({ params }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const r = await getRealtorById(params.id);
  if (!r) notFound();
  const units = await getRealtorUnits(r);

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <Link href="/realtors" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>← {t("rl_page_h")}</Link>

      <div className="realtor-hero">
        <div className="realtor-ava realtor-ava-lg">
          {r.photo ? <img src={r.photo} alt={r.name} /> : <span>{(r.name || "B").slice(0, 1).toUpperCase()}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ color: "var(--navy)", margin: 0 }}>{r.name}</h1>
          <div style={{ color: "var(--ink-soft)", marginTop: 4 }}>
            {t("rl_role")}{r.deal_types ? ` · ${r.deal_types}` : ""}
          </div>
          <div style={{ color: "var(--navy)", fontWeight: 600, marginTop: 6 }}>{units.length} {t("w_objects")}</div>
          {r.bio && <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, margin: "10px 0 0", maxWidth: 720 }}>{r.bio}</p>}
          {r.phone && (
            <a className="btn btn-gold" href={`tel:${r.phone}`} style={{ marginTop: 14, padding: "10px 18px", display: "inline-block" }}>
              📞 {r.phone}
            </a>
          )}
        </div>
      </div>

      <h2 style={{ color: "var(--navy)", fontSize: 20, margin: "28px 0 14px" }}>{t("rl_objects_h")}</h2>
      {units.length ? (
        <div className="cards">
          {units.map((u) => <PropertyCard key={u.id || u.slug} unit={u} />)}
        </div>
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>{t("rl_no_objects")}</p>
      )}
    </div>
  );
}
