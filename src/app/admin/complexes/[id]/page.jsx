import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { adminGetComplex } from "@/lib/complexes";
import { GE_CITIES } from "@/data/data";
import ComplexForm from "@/components/ComplexForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "ЖК — Админ", robots: { index: false, follow: false } };

// Создание (/admin/complexes/new) и редактирование (/admin/complexes/<id>) жилого комплекса.
export default async function AdminComplexEditPage({ params }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "complexes")) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Новостройки — Админ</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>Нет права «Новостройки».</p>
      </div>
    );
  }
  const isNew = params.id === "new";
  const item = isNew ? null : await adminGetComplex(params.id);
  if (!isNew && !item) {
    return <div className="wrap" style={{ padding: "48px 24px" }}><h1 style={{ color: "var(--navy)" }}>ЖК не найден</h1><a href="/admin/complexes">← К списку</a></div>;
  }
  // Эксперты для блока «Поможем подобрать» — одобренные риелторы (публичные поля).
  let realtors = [];
  if (supa) {
    const { data } = await supa.from("realtors").select("id, name, photo").eq("status", "approved").order("name");
    realtors = data || [];
  }
  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <h1 style={{ color: "var(--navy)" }}>{isNew ? "Новый ЖК" : item.name}</h1>
        <a className="btn btn-ghost" href="/admin/complexes" style={{ padding: "9px 16px" }}>← К списку</a>
      </div>
      <ComplexForm initial={item} realtors={realtors} cities={GE_CITIES.map((c) => c.name)} />
    </div>
  );
}
