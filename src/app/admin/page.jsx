import { cookies } from "next/headers";
import { verifySession, isAdmin, isSuperAdmin, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { loadAdminListings } from "@/lib/adminListings";
import AdminListings from "@/components/AdminListings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ-панель", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!isAdmin(session)) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Админ-панель</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
          Доступ только для администраторов. Войдите под админ-аккаунтом на странице <a href="/my" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>«Войти»</a>.
        </p>
      </div>
    );
  }

  let realtorPending = 0;
  let usersCount = 0;
  // Контакты собственника видит только сотрудник с правом модерации объявлений.
  const canSeeOwner = can(session, "moderate");
  // 06.11: в браузер уходит только первая страница (100 шт.); счётчики/дубли считает сервер.
  const data = await loadAdminListings({ offset: 0, limit: 100, canSeeOwner });
  if (supa) {
    const { count } = await supa.from("realtors").select("id", { count: "exact", head: true }).eq("status", "pending");
    realtorPending = count || 0;
    const { count: uc } = await supa.from("site_users").select("id", { count: "exact", head: true });
    usersCount = uc || 0;
  }
  const counts = data.counts;

  // Кнопки разделов панели. navBefore — до фильтра статуса (…«Импорт сводки»),
  // navAfter — после него («Сотрудники» для супер-админа). Фильтр вставляется между ними.
  const navBefore = (
    <>
      {can(session, "news") && <a className="btn btn-ghost" href="/admin/news" style={{ padding: "9px 16px" }}>📰 Управление новостями</a>}
      {can(session, "complexes") && <a className="btn btn-ghost" href="/admin/complexes" style={{ padding: "9px 16px" }}>🏗️ Новостройки</a>}
      {can(session, "realtors") && <a className="btn btn-ghost" href="/admin/realtors" style={{ padding: "9px 16px" }}>👤 Риелторы{realtorPending ? ` · ${realtorPending} новых` : ""}</a>}
      {can(session, "users") && <a className="btn btn-ghost" href="/admin/analytics" style={{ padding: "9px 16px" }}>📊 Аналитика</a>}
      {can(session, "users") && <a className="btn btn-ghost" href="/admin/users" style={{ padding: "9px 16px" }}>👥 Пользователи{usersCount ? ` · ${usersCount}` : ""}</a>}
      {can(session, "managed") && <a className="btn btn-ghost" href="/admin/reports" style={{ padding: "9px 16px" }}>📊 Импорт сводки</a>}
    </>
  );
  const navAfter = (
    <>
      {isSuperAdmin(session) && <a className="btn btn-ghost" href="/admin/owner-contacts" style={{ padding: "9px 16px" }}>📇 Контакты собственников</a>}
      {isSuperAdmin(session) && <a className="btn btn-gold" href="/admin/staff" style={{ padding: "9px 16px" }}>🛡️ Сотрудники</a>}
    </>
  );

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>Админ-панель</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>
        Всего {data.totalAll} · одобрено {counts.approved || 0} · на модерации {counts.pending || 0} · снято {counts.rejected || 0}
      </p>
      {can(session, "moderate") ? (
        // Кнопки панели передаём в AdminListings, чтобы фильтр по статусу встал в один ряд
        // с ними (справа от «Импорт сводки») и при этом управлял тем же списком.
        <AdminListings initial={data} navBefore={navBefore} navAfter={navAfter} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>{navBefore}{navAfter}</div>
          <p style={{ color: "var(--ink-soft)" }}>У вас нет права на модерацию объявлений. Доступные разделы — выше.</p>
        </>
      )}
    </div>
  );
}
