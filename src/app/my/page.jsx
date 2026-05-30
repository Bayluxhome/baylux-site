import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { DEAL_LABEL } from "@/data/data";
import { slugify } from "@/data/sheet";
import TelegramLogin from "@/components/TelegramLogin";
import BotLogin from "@/components/BotLogin";
import MyListings from "@/components/MyListings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Личный кабинет" };

const STATUS = { pending: "На модерации", approved: "Опубликовано", rejected: "Снято / отклонено" };

export default async function MyPage() {
  const token = cookies().get("bx_session")?.value;
  const session = verifySession(token);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 0", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Личный кабинет</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>
          Войдите через Telegram — увидите свои объявления, поданные через бота, и их статусы.
        </p>
        <BotLogin />
        <div style={{ margin: "24px 0 12px", color: "var(--ink-soft)", fontSize: 13 }}>или войдите виджетом Telegram:</div>
        <TelegramLogin />
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 20 }}>
          Объявления добавляются в боте <b>@baylux_leads_bot</b> (команда /start или меню).
        </p>
      </div>
    );
  }

  let rows = [];
  if (supa) {
    const { data } = await supa.from("listings").select("*").eq("tg_user_id", session.id).order("created_at", { ascending: false });
    rows = data || [];
  }

  const items = rows.map((r) => ({
    id: r.id,
    title: `${DEAL_LABEL[r.deal] || r.deal} · ${r.type}`,
    sub: `${r.building_name} · ${r.price}${r.area ? ` · ${r.area} м²` : ""}`,
    status: r.status,
    photo: (Array.isArray(r.photos) && r.photos[0]) || "/placeholder-baylux.jpg",
    slug: r.status === "approved" ? slugify(`${r.building_name}-${r.type || ""}-${r.price || ""}`) : null,
  }));

  return (
    <div className="wrap" style={{ padding: "30px 0 50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ color: "var(--navy)" }}>Мои объявления</h1>
        <a className="btn btn-ghost" href="/api/tg-logout" style={{ padding: "9px 16px" }}>Выйти</a>
      </div>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>
        {session.name ? session.name + ", в" : "В"}аши объекты ({rows.length}). Добавить новый — в боте <b>@baylux_leads_bot</b> (/start).
      </p>
      <MyListings items={items} />
    </div>
  );
}
