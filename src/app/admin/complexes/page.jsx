import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { adminListComplexes } from "@/lib/complexes";
import AdminComplexList from "@/components/AdminComplexList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новостройки — Админ", robots: { index: false, follow: false } };

// Раздел «Новостройки» в админке: список ЖК, которые вносят менеджеры (только объекты с договором).
// Право — галочка «Новостройки (ЖК и планировки)» у сотрудника.
export default async function AdminComplexesPage() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "complexes")) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Новостройки — Админ</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>Нет права «Новостройки». Попросите администратора включить его в разделе «Сотрудники».</p>
      </div>
    );
  }
  const items = await adminListComplexes();
  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ color: "var(--navy)" }}>Новостройки</h1>
          <p style={{ color: "var(--ink-soft)", margin: "6px 0 0" }}>Жилые комплексы с договором на комиссию. На сайте видны только со статусом «Опубликован».</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn btn-ghost" href="/admin" style={{ padding: "9px 16px" }}>← Админка</a>
          <a className="btn btn-gold" href="/admin/complexes/new" style={{ padding: "9px 16px" }}>＋ Добавить ЖК</a>
        </div>
      </div>
      <AdminComplexList items={items} />
    </div>
  );
}
