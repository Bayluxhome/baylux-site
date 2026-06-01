import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { slugify } from "@/data/sheet";
import LoginBlock from "@/components/LoginBlock";
import MyListings from "@/components/MyListings";
import DataRights from "@/components/DataRights";
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

  let rows = [];
  if (supa) {
    let q = supa.from("listings").select("*");
    q = session.id != null ? q.eq("tg_user_id", session.id) : q.eq("owner_email", session.email);
    const { data } = await q.order("created_at", { ascending: false });
    rows = data || [];
  }

  const items = rows.map((r) => ({
    id: r.id,
    title: `${t("deal_" + r.deal)} · ${typeLabel(lang, r.type)}`,
    sub: `${r.building_name} · ${r.price}${r.area ? ` · ${r.area} м²` : ""}`,
    status: r.status,
    photo: (Array.isArray(r.photos) && r.photos[0]) || "/placeholder-baylux.jpg",
    slug: r.status === "approved" ? slugify(`${r.building_name}-${r.type || ""}-${r.price || ""}`) : null,
  }));

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ color: "var(--navy)" }}>{t("my_title")}</h1>
        <a className="btn btn-ghost" href="/api/tg-logout" style={{ padding: "9px 16px" }}>{t("my_logout")}</a>
      </div>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>
        {session.name ? session.name + " — " : ""}{t("cab_objs")} ({rows.length}). {t("cab_addnew")}
      </p>
      <MyListings items={items} />
      <DataRights />
    </div>
  );
}
