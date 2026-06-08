import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession, isAdmin, can, isResponsible } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { slugify, cleanAddress } from "@/data/sheet";
import LoginBlock from "@/components/LoginBlock";
import CabinetTabs from "@/components/CabinetTabs";
import DataRights from "@/components/DataRights";
import RealtorPanel from "@/components/RealtorPanel";
import { getLang } from "@/lib/serverLang";
import { t as tr, typeLabel } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Личный кабинет" };

export default async function MyPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const token = cookies().get("bx_session")?.value;
  const session = verifySession(token);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("cab_title")}</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>
          {t("cab_login_p")}
        </p>
        <LoginBlock />
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 22 }}>
          {t("cab_bot_a")} <b>@baylux_leads_bot</b> {t("cab_bot_b")}
        </p>
      </div>
    );
  }

  const admin = isAdmin(session);
  const canMng = can(session, "managed"); // право «Объекты в управлении» — видеть все
  let rows = [];
  let realtor = null;
  let managedRows = [];
  let msgsByListing = {};
  if (supa) {
    let q = supa.from("listings").select("*");
    q = session.id != null ? q.eq("tg_user_id", session.id) : q.eq("owner_email", session.email);
    const { data } = await q.order("created_at", { ascending: false });
    rows = data || [];

    let rq = supa.from("realtors").select("*");
    rq = session.id != null ? rq.eq("tg_user_id", session.id) : rq.eq("email", session.email);
    const { data: rd } = await rq.maybeSingle();
    realtor = rd || null;

    // Объекты в управлении: право managed видит ВСЕ; ответственный — назначенные ему; владелец — свои.
    if (canMng) {
      const { data: md } = await supa.from("listings").select("*").eq("managed_by_baylux", true).order("created_at", { ascending: false });
      managedRows = md || [];
    } else {
      const ownManaged = rows.filter((r) => r.managed_by_baylux);
      let mq = supa.from("listings").select("*").eq("managed_by_baylux", true);
      mq = session.id != null ? mq.eq("responsible_tg", session.id) : mq.eq("responsible_email", session.email);
      const { data: rdm } = await mq;
      const seen = new Set(ownManaged.map((r) => r.id));
      managedRows = [...ownManaged, ...(rdm || []).filter((r) => !seen.has(r.id))];
    }
    // Сообщения собственнику по управляемым объектам.
    if (managedRows.length) {
      const ids = managedRows.map((r) => String(r.id));
      const { data: msgs } = await supa.from("owner_messages").select("*").in("listing_id", ids).order("created_at", { ascending: false });
      (msgs || []).forEach((m) => { (msgsByListing[m.listing_id] = msgsByListing[m.listing_id] || []).push({ id: m.id, body: m.body, at: m.created_at }); });
    }
  }

  const mapItem = (r) => {
    const bn = cleanAddress(r.building_name);
    return {
      id: r.id,
      title: `${t("deal_" + r.deal)} · ${typeLabel(lang, r.type)}`,
      sub: `${bn} · ${r.price}${r.area ? ` · ${r.area} м²` : ""}`,
      status: r.status,
      photo: (Array.isArray(r.photos) && r.photos[0]) || "/placeholder-baylux.jpg",
      slug: r.status === "approved" ? slugify(`${bn}-${r.type || ""}-${r.price || ""}`) : null,
      managed: !!r.managed_by_baylux,
      contract: r.contract_url || "",
      owner: r.owner_email || (r.tg_username ? "@" + r.tg_username : (r.tg_user_id != null ? "tg:" + r.tg_user_id : "")),
      responsible: r.responsible_email || (r.responsible_tg != null ? "tg:" + r.responsible_tg : ""),
      ownerName: r.owner_name || "",
      ownerPhone: r.owner_phone || "",
      ownerEmail: r.owner_contact_email || r.owner_email || "",
      internalNo: r.internal_no || "",
      canManage: canMng || isResponsible(session, r),
      messages: msgsByListing[String(r.id)] || [],
    };
  };
  const ownItems = rows.map(mapItem).filter((x) => !x.managed);
  const managedItems = managedRows.map(mapItem);

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ color: "var(--navy)" }}>{t("my_title")}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn btn-gold" href="/add-holiday" style={{ padding: "9px 16px" }}>🏠 {t("cab_hh_btn")}</a>
          <a className="btn btn-ghost" href="/my/bulk" style={{ padding: "9px 16px" }}>{t("cab_bulk")}</a>
          {isAdmin(session) && <a className="btn btn-gold" href="/admin" style={{ padding: "9px 16px" }}>⚙️ Админка</a>}
          <a className="btn btn-ghost" href="/api/tg-logout" style={{ padding: "9px 16px" }}>{t("my_logout")}</a>
        </div>
      </div>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>
        {session.name ? session.name + " — " : ""}{t("cab_objs")} ({rows.length}). {t("cab_addnew")}
      </p>
      <CabinetTabs listings={ownItems} managed={managedItems} adminView={canMng} />
      <RealtorPanel initial={realtor} />
      <DataRights />
    </div>
  );
}
