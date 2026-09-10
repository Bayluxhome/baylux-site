// Загрузка данных кабинета (объекты, обращения, метрики) — общая для всех разделов кабинета:
// рабочий стол, «Мои объекты», «Заявки». Раньше это жило внутри страницы /my.
import { supa, fetchAll } from "@/lib/supabase";
import { isAdmin, can, isResponsible } from "@/lib/session";
import { slugify, cleanAddress } from "@/data/sheet";
import { getLeadsFor, getViewsFor, buildSeries } from "@/data/cabinet";
import { t as tr, typeLabel } from "@/lib/dict";

const ARCHIVE_DAYS = 60;

export async function loadCabinet(session, lang, { withDashboard = true } = {}) {
  const t = (k) => tr(lang, k);
  const admin = isAdmin(session);
  const canMng = can(session, "managed");
  let rows = [], realtor = null, managedRows = [];
  const msgsByListing = {}, reportsByListing = {}, summaryByListing = {}, mgrByEmail = {}, mgrByTg = {};

  if (supa) {
    rows = await fetchAll("listings", "*", (q) =>
      (session.id != null ? q.eq("tg_user_id", session.id) : q.eq("owner_email", session.email)).order("created_at", { ascending: false }));
    let rq = supa.from("realtors").select("*");
    rq = session.id != null ? rq.eq("tg_user_id", session.id) : rq.eq("email", session.email);
    realtor = (await rq.maybeSingle()).data || null;

    if (canMng) {
      managedRows = await fetchAll("listings", "*", (q) => q.eq("managed_by_baylux", true).order("created_at", { ascending: false }));
    } else {
      const ownManaged = rows.filter((r) => r.managed_by_baylux);
      let mq = supa.from("listings").select("*").eq("managed_by_baylux", true);
      mq = session.id != null ? mq.eq("responsible_tg", session.id) : mq.eq("responsible_email", session.email);
      const { data: rdm } = await mq;
      const seen = new Set(ownManaged.map((r) => r.id));
      managedRows = [...ownManaged, ...(rdm || []).filter((r) => !seen.has(r.id))];
    }
    if (managedRows.length) {
      const emails = [...new Set(managedRows.map((r) => r.responsible_email).filter(Boolean).map((e) => e.toLowerCase()))];
      const tgs = [...new Set(managedRows.map((r) => r.responsible_tg).filter((v) => v != null).map(Number))];
      const collect = (arr) => (arr || []).forEach((u) => { if (u.email) mgrByEmail[u.email.toLowerCase()] = u; if (u.tg_user_id != null) mgrByTg[Number(u.tg_user_id)] = u; });
      if (emails.length) collect((await supa.from("site_users").select("name, phone, email, username, tg_user_id").in("email", emails)).data);
      if (tgs.length) collect((await supa.from("site_users").select("name, phone, email, username, tg_user_id").in("tg_user_id", tgs)).data);
      const ids = managedRows.map((r) => String(r.id));
      const { data: msgs } = await supa.from("owner_messages").select("*").in("listing_id", ids).order("created_at", { ascending: false });
      (msgs || []).forEach((m) => { (msgsByListing[m.listing_id] = msgsByListing[m.listing_id] || []).push({ id: m.id, body: m.body, at: m.created_at }); });
      const { data: reps } = await supa.from("photo_reports").select("*").in("listing_id", ids).order("created_at", { ascending: false });
      (reps || []).forEach((p) => { (reportsByListing[p.listing_id] = reportsByListing[p.listing_id] || []).push({ id: p.id, photos: Array.isArray(p.photos) ? p.photos : [], note: p.note || "", at: p.created_at }); });
      const { data: sum } = await supa.from("management_reports").select("*").in("listing_id", ids).order("period", { ascending: false });
      (sum || []).forEach((m) => {
        const d = (summaryByListing[m.listing_id] = summaryByListing[m.listing_id] || { data: {}, periods: [] });
        d.data[m.period] = { income: m.income, payout: m.payout, commission: m.commission, utilities: m.utilities, expenses: m.expenses, note: m.note };
        if (!d.periods.includes(m.period)) d.periods.push(m.period);
      });
    }
  }

  // Контакты собственника и email — только админу / праву «управление». Фильтр на сервере.
  const canSeeOwner = admin || canMng;
  const mapItem = (r) => {
    const bn = cleanAddress(r.building_name);
    const ageDays = (Date.now() - new Date(r.bumped_at || r.created_at || Date.now()).getTime()) / 864e5;
    const archived = !r.managed_by_baylux && r.status === "approved" && ageDays >= ARCHIVE_DAYS;
    const daysLeft = (r.managed_by_baylux || r.status !== "approved") ? null : Math.max(0, Math.ceil(ARCHIVE_DAYS - ageDays));
    const mgr = (r.responsible_email && mgrByEmail[String(r.responsible_email).toLowerCase()]) || (r.responsible_tg != null && mgrByTg[Number(r.responsible_tg)]) || null;
    return {
      id: r.id, archived, daysLeft,
      title: `${t("deal_" + r.deal)} · ${typeLabel(lang, r.type)}`,
      sub: `${bn} · ${r.price}${r.area ? ` · ${r.area} м²` : ""}`,
      status: r.status,
      photo: (Array.isArray(r.photos) && r.photos[0]) || "/placeholder-baylux.jpg",
      slug: r.status === "approved" ? slugify(`${bn}-${r.type || ""}-${r.price || ""}`) : null,
      managed: !!r.managed_by_baylux, contract: r.contract_url || "",
      owner: canSeeOwner ? (r.owner_email || (r.tg_username ? "@" + r.tg_username : (r.tg_user_id != null ? "tg:" + r.tg_user_id : ""))) : "",
      responsible: canSeeOwner ? (r.responsible_email || (r.responsible_tg != null ? "tg:" + r.responsible_tg : "")) : "",
      ownerName: canSeeOwner ? (r.owner_name || "") : "", ownerPhone: canSeeOwner ? (r.owner_phone || "") : "",
      ownerEmail: canSeeOwner ? (r.owner_contact_email || r.owner_email || "") : "", ownerTg: canSeeOwner ? (r.owner_tg_username || "") : "",
      sourceRef: canSeeOwner ? (r.source_ref || "") : "", sourceUrl: canSeeOwner ? (r.source_url || "") : "", internalNo: canSeeOwner ? (r.internal_no || "") : "",
      managerName: mgr?.name || "", managerPhone: mgr?.phone || "", managerEmail: mgr?.email || r.responsible_email || "", managerTg: mgr?.username ? "@" + mgr.username : "",
      canManage: canMng || isResponsible(session, r),
      messages: msgsByListing[String(r.id)] || [], reports: reportsByListing[String(r.id)] || [],
      reportData: (summaryByListing[String(r.id)] || {}).data || {}, periods: (summaryByListing[String(r.id)] || {}).periods || [],
    };
  };
  const ownItems = rows.map(mapItem).filter((x) => !x.managed);
  const managedItems = managedRows.map(mapItem);
  const base = { admin, canMng, rows, realtor, ownItems, managedItems };
  if (!withDashboard) return base;

  const allItems = [...ownItems, ...managedItems];
  const leadsRaw = await getLeadsFor(session);
  const leadIds = [...new Set(leadsRaw.map((l) => l.listing_id).filter(Boolean))];
  const slugById = {};
  if (supa && leadIds.length) {
    const { data: ls } = await supa.from("listings").select("id, building_name, type, price, status").in("id", leadIds.slice(0, 200));
    (ls || []).forEach((l) => { if (l.status === "approved") slugById[l.id] = slugify(`${cleanAddress(l.building_name)}-${l.type || ""}-${l.price || ""}`); });
  }
  const leads = leadsRaw.map((l) => ({ ...l, listing_slug: slugById[l.listing_id] || "" }));
  const views = await getViewsFor(allItems.map((x) => String(x.id)));
  const series = buildSeries(views.byDay, leads);
  const stale = allItems.filter((x) => x.status === "approved" && x.daysLeft != null && x.daysLeft <= 20)
    .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5)
    .map((x) => ({ id: x.id, title: x.title, sub: x.sub, photo: x.photo, daysLeft: x.daysLeft }));
  const dashStats = {
    active: allItems.filter((x) => x.status === "approved" && !x.archived).length,
    stale: allItems.filter((x) => x.status === "approved" && x.daysLeft != null && x.daysLeft <= 20).length,
    views: views.total, leadsNew: leads.filter((l) => l.status === "new").length, leadsTotal: leads.length,
  };
  return { ...base, leads, series, stale, dashStats };
}
