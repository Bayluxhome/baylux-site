import Link from "next/link";
import MapView from "@/components/MapView";
import ComplexCard from "@/components/ComplexCard";
import ComplexExpert from "@/components/ComplexExpert";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import { getPublishedComplexes, filterComplexes, districtsOf, COMPLEX_KINDS } from "@/lib/complexes";
import { supa } from "@/lib/supabase";
import { GE_CITIES } from "@/data/data";
import { CITY_CENTER } from "@/lib/geo";
import { SITE_URL } from "@/config";
import { getLang } from "@/lib/serverLang";
import { altFor } from "@/lib/i18nPath";
import { t as tr, cityLabel } from "@/lib/dict";

// Раздел «Новостройки»: собственная база ЖК от менеджеров (только объекты с договором).
// Фильтры — GET-параметры (ссылки можно отправлять клиенту), список и карта — из одной выборки.
export const dynamic = "force-dynamic";

const TAGS = ["sea", "installment", "completed", "building", "investment", "renovated"];
const SORTS = ["popular", "price_asc", "price_desc", "roi", "soon", "new"];

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: { absolute: t("nb_meta_t") },
    description: t("nb_meta_d"),
    alternates: altFor(lang, "/novostroyki"),
    openGraph: { title: t("nb_meta_t"), description: t("nb_meta_d"), type: "website", url: `${SITE_URL}/${lang}/novostroyki`, images: ["/hero-batumi.jpg"] },
  };
}

// «Найдено 24 комплекса» — русские формы числительных; в en/ka формы совпадают.
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default async function NovostroykiPage({ searchParams }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const sp = searchParams || {};
  const f = {
    city: sp.city || "", district: sp.district || "", kind: COMPLEX_KINDS.includes(sp.kind) ? sp.kind : "",
    pmin: sp.pmin || "", pmax: sp.pmax || "", year: sp.year || "", installment: sp.installment || "", sea: sp.sea || "",
    tag: Array.isArray(sp.tag) ? sp.tag.filter((x) => TAGS.includes(x)) : TAGS.includes(sp.tag) ? [sp.tag] : [],
    sort: SORTS.includes(sp.sort) ? sp.sort : "popular", q: sp.q || "",
  };

  const all = await getPublishedComplexes();
  const list = filterComplexes(all, f);
  // «Рекомендуем» закрепляем сверху только при сортировке по умолчанию: если клиент выбрал
  // «дешевле» или «по доходности», порядок должен быть честным, без закреплённой карточки.
  const featured = f.sort === "popular" ? list.find((c) => c.featured) || null : null;
  const rest = featured ? list.filter((c) => c.id !== featured.id) : list;

  // Эксперт для блока «Поможем подобрать»: у «рекомендуемого» ЖК, иначе первый назначенный.
  let expert = null;
  const expertId = (featured && featured.expert_id) || (all.find((c) => c.expert_id) || {}).expert_id;
  if (expertId && supa) {
    const { data } = await supa.from("realtors").select("id, name, photo").eq("id", expertId).eq("status", "approved").maybeSingle();
    expert = data || null;
  }

  // Справочники фильтров — только из реальных данных.
  const cities = GE_CITIES.map((c) => c.name).filter((n) => all.some((c) => c.city === n));
  const districts = districtsOf(all, f.city);
  const years = [...new Set(all.filter((c) => !c.completed && c.completion_year).map((c) => Number(c.completion_year)))].sort();

  // Ссылка с изменённым параметром (для тегов и сброса).
  const qs = (patch) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...patch })) {
      if (Array.isArray(v)) v.forEach((x) => p.append(k, x)); else if (v && !(k === "sort" && v === "popular")) p.set(k, v);
    }
    const s = p.toString(); return "/novostroyki" + (s ? "?" + s : "");
  };
  const toggleTag = (tag) => qs({ tag: f.tag.includes(tag) ? f.tag.filter((x) => x !== tag) : [...f.tag, tag] });
  const hasFilters = Object.entries(f).some(([k, v]) => k !== "sort" && (Array.isArray(v) ? v.length : v));

  const mapBuildings = list.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)).map((c) => ({
    slug: c.slug, name: c.name, district: cityLabel(lang, c.city) + (c.district ? `, ${c.district}` : ""), kind: "complex",
    lat: c.lat, lng: c.lng, priceFrom: c.price_from ? `$${c.price_from}` : "", units: [],
    href: `/novostroyki/${c.slug}`, linkLabel: t("nb_view") + " →",
  }));
  const center = (f.city && CITY_CENTER[f.city]) || (mapBuildings[0] ? [mapBuildings[0].lat, mapBuildings[0].lng] : CITY_CENTER["Батуми"]);

  const hidden = Object.entries(f).flatMap(([k, v]) => (k === "sort" ? [] : (Array.isArray(v) ? v : v ? [v] : []).map((x, i) => <input key={k + i} type="hidden" name={k} value={x} />)));

  return (
    <div className="wrap nb">
      <div className="crumbs"><Link href="/">{t("crumb_home")}</Link> · <span>{t("nb_crumb")}</span></div>

      <section className="nb-hero">
        <div className="nb-kicker">{t("nb_kicker")}</div>
        <h1>{t("nb_title")}</h1>
        <p>{t("nb_sub")}</p>
      </section>

      <form className="nb-filters" method="get" action="/novostroyki">
        <label><span>{t("nb_f_city")}</span>
          <select name="city" defaultValue={f.city}><option value="">{t("nb_any")}</option>{cities.map((c) => <option key={c} value={c}>{cityLabel(lang, c)}</option>)}</select></label>
        <label><span>{t("nb_f_district")}</span>
          <select name="district" defaultValue={f.district}><option value="">{t("nb_any")}</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <label><span>{t("nb_f_kind")}</span>
          <select name="kind" defaultValue={f.kind}><option value="">{t("nb_kind_all")}</option>{COMPLEX_KINDS.map((k) => <option key={k} value={k}>{t("nb_kind_" + k)}</option>)}</select></label>
        <label className="nb-f-range"><span>{t("nb_f_price")}</span>
          <div><input name="pmin" type="number" inputMode="numeric" placeholder="500" defaultValue={f.pmin} /><i>–</i><input name="pmax" type="number" inputMode="numeric" placeholder="5000" defaultValue={f.pmax} /><em>$</em></div></label>
        <label><span>{t("nb_f_done")}</span>
          <select name="year" defaultValue={f.year}><option value="">{t("nb_any")}</option><option value="done">{t("nb_done_done")}</option>{years.map((y) => <option key={y} value={y}>{t("nb_done_by").replace("{y}", y)}</option>)}</select></label>
        <label><span>{t("nb_f_inst")}</span>
          <select name="installment" defaultValue={f.installment}><option value="">{t("nb_na")}</option><option value="1">{t("nb_inst_yes")}</option></select></label>
        <label><span>{t("nb_f_sea")}</span>
          <select name="sea" defaultValue={f.sea}><option value="">{t("nb_na")}</option><option value="1">{t("nb_sea_yes")}</option></select></label>
        {f.tag.map((x) => <input key={x} type="hidden" name="tag" value={x} />)}
        {f.sort !== "popular" && <input type="hidden" name="sort" value={f.sort} />}
        <div className="nb-f-actions">
          <button className="btn btn-navy" type="submit">{t("nb_show")}</button>
          <a className="btn btn-ghost" href="#nb-map">🗺 {t("nb_on_map")}</a>
          {hasFilters && <Link className="nb-reset" href="/novostroyki">{t("nb_reset")}</Link>}
        </div>
      </form>

      <div className="nb-quick">
        {TAGS.map((tag) => <Link key={tag} href={toggleTag(tag)} className={"nb-chip" + (f.tag.includes(tag) ? " on" : "")}>{t("nb_tag_" + tag)}</Link>)}
      </div>

      {all.length === 0 ? (
        <p className="nb-empty">{t("nb_none")}</p>
      ) : (
        <div className="nb-layout">
          <div className="nb-main">
            {featured && <ComplexCard c={featured} featured />}

            <div className="nb-list-head">
              <h2>{t("nb_all_h")}</h2>
              <div className="nb-list-meta">
                <span>{t("nb_found").replace("{n}", list.length)} {plural(list.length, t("nb_found_one"), t("nb_found_few"), t("nb_found_many"))}</span>
                <form method="get" action="/novostroyki" className="nb-sort">
                  {hidden}
                  <AutoSubmitSelect name="sort" defaultValue={f.sort} aria-label={t("nb_sort")}>
                    {SORTS.map((s) => <option key={s} value={s}>{t("nb_sort_" + s)}</option>)}
                  </AutoSubmitSelect>
                </form>
              </div>
            </div>

            {list.length === 0 ? (
              <p className="nb-empty">{t("nb_empty")} <Link href="/novostroyki">{t("nb_reset")}</Link></p>
            ) : (
              <div className="nb-grid">{rest.map((c) => <ComplexCard key={c.id} c={c} />)}</div>
            )}
          </div>

          <aside className="nb-side">
            <div className="nb-map-card" id="nb-map">
              <MapView buildings={mapBuildings} className="nb-map" center={center} zoom={mapBuildings.length ? 11 : 10} fit={mapBuildings.length > 1} />
              <a className="btn btn-ghost nb-map-all" href="/map">{t("nb_all_map")}</a>
            </div>
            <ComplexExpert expert={expert} complexId={featured?.id || ""} />
          </aside>
        </div>
      )}

      <section className="nb-why">
        <h2>{t("nb_why_h")}</h2>
        <div className="nb-why-grid">
          {[["🛡", "1"], ["📄", "2"], ["🏷", "3"], ["🌐", "4"]].map(([ic, n]) => (
            <div key={n}><span className="nb-why-ic">{ic}</span><b>{t(`nb_why${n}_h`)}</b><p>{t(`nb_why${n}_p`)}</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}
