import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr, cityLabel } from "@/lib/dict";
import { complexTags } from "@/lib/complexes";

const TAG_ORDER = ["sea", "installment", "investment", "renovated", "premium", "eco", "completed"];
const TAG_ICON = { sea: "🌊", installment: "％", investment: "📈", renovated: "🖌", premium: "💎", eco: "🌿", completed: "✓", building: "🏗" };

export function fmtDone(c, t) {
  if (c.completed) return t("nb_done_ok");
  if (!c.completion_year) return "—";
  // {Q} — римская цифра (RU/KA: «IV кв. 2026»), {q} — арабская (EN: «Q4 2026»)
  const Q = ["", "I", "II", "III", "IV"];
  return c.completion_q ? t("nb_done_q").replace("{Q}", Q[c.completion_q]).replace("{q}", c.completion_q).replace("{y}", c.completion_year) : String(c.completion_year);
}
export const fmtNum = (n) => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Карточка ЖК в списке. featured=true — крупная карточка «Рекомендуем» с описанием.
export default function ComplexCard({ c, featured = false }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const cover = c.cover || (Array.isArray(c.photos) && c.photos[0]) || "/placeholder-baylux.jpg";
  const tags = complexTags(c);
  const shown = TAG_ORDER.filter((k) => tags[k]).slice(0, featured ? 3 : 2);
  const href = `/novostroyki/${c.slug}`;
  const desc = c["desc_" + lang] || c.desc_ru || "";
  const place = `${cityLabel(lang, c.city)}${c.district ? `, ${c.district}` : ""}`;

  const stats = (
    <div className="nb-stats">
      <div><b>{c.area_from ? t("nb_area_from").replace("{n}", fmtNum(c.area_from)) : "—"}</b><span>{t("nb_lbl_area")}</span></div>
      <div><b>{c.price_from ? t("nb_price_from").replace("{n}", fmtNum(c.price_from)) : "—"}</b><span>{t("nb_lbl_price")}</span></div>
      <div><b>{fmtDone(c, t)}</b><span>{t("nb_lbl_done")}</span></div>
      {featured && <div><b>{tags.installment ? t("nb_inst_months").replace("{n}", c.installment_months) : "—"}</b><span>{t("nb_lbl_inst")}</span></div>}
    </div>
  );

  if (featured) {
    return (
      <article className="nb-featured">
        <Link href={href} className="nb-featured-img" aria-label={c.name}>
          <img src={cover} alt={c.name} />
          <span className="nb-badge-rec">★ {t("nb_featured")}</span>
        </Link>
        <div className="nb-featured-body">
          <h3><Link href={href}>{c.name}</Link></h3>
          <div className="nb-place">📍 {place}</div>
          {desc && <p className="nb-desc">{desc.length > 220 ? desc.slice(0, 220).trim() + "…" : desc}</p>}
          <div className="nb-tags">{shown.map((k) => <span key={k}>{TAG_ICON[k]} {t("nb_tag_" + k)}</span>)}</div>
          {stats}
          <Link className="btn btn-navy" href={href}>{t("nb_view")} →</Link>
        </div>
      </article>
    );
  }

  return (
    <article className="nb-card">
      <Link href={href} className="nb-card-img" aria-label={c.name}>
        <img src={cover} alt={c.name} loading="lazy" />
      </Link>
      <div className="nb-card-body">
        <h3><Link href={href}>{c.name}</Link></h3>
        <div className="nb-place">📍 {place}</div>
        {shown.length > 0 && <div className="nb-tags">{shown.map((k) => <span key={k}>{TAG_ICON[k]} {t("nb_tag_" + k)}</span>)}</div>}
        {stats}
        <Link className="btn btn-ghost nb-btn" href={href}>{t("nb_view")} →</Link>
      </div>
    </article>
  );
}
