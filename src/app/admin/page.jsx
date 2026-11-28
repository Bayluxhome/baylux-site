import { cookies } from "next/headers";
import { verifySession, isAdmin, can } from "@/lib/session";
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

  // Контакты собственника видит только сотрудник с правом модерации объявлений.
  const canSeeOwner = can(session, "moderate");
  // 06.11: в браузер уходит только первая страница (100 шт.); счётчики/дубли считает сервер.
  const data = await loadAdminListings({ offset: 0, limit: 100, canSeeOwner });
  const counts = data.counts;

  // Кнопки разделов переехали в общее меню админки (admin/layout.jsx → AdminMenu), 28.11.2026.

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>Объявления</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 20px" }}>
        Всего {data.totalAll} · одобрено {counts.approved || 0} · на модерации {counts.pending || 0} · снято {counts.rejected || 0}
      </p>
      {can(session, "moderate") ? (
        <AdminListings initial={data} />
      ) : (
        <p style={{ color: "var(--ink-soft)" }}>У вас нет права на модерацию объявлений. Доступные разделы — в меню выше.</p>
      )}
    </div>
  );
}
