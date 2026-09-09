import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import OwnerContactsImport from "@/components/OwnerContactsImport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Контакты собственников", robots: { index: false, follow: false } };

export default function OwnerContactsPage() {
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!isSuperAdmin(session)) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Контакты собственников</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>Раздел доступен только супер-администратору.</p>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px", maxWidth: 860 }}>
      <a className="btn btn-ghost" href="/admin" style={{ padding: "8px 14px" }}>← Админ-панель</a>
      <h1 style={{ color: "var(--navy)", marginTop: 18 }}>Контакты собственников</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.7 }}>
        Разовый перенос контактов из файла парсинга в уже опубликованные объявления.
        Объявление находится по отпечаткам фотографий, поэтому совпадение точное.
        Контакты остаются служебными: их видят только сотрудники с правами, на сайте
        по-прежнему публикуется номер Baylux.
      </p>

      <div style={{ background: "#fbfaf7", border: "1px solid #eee5d5", borderRadius: 12, padding: "14px 18px", marginTop: 18, lineHeight: 1.8, color: "var(--ink-soft)" }}>
        <b style={{ color: "var(--navy)" }}>Как получить файл</b>
        <div>1. Открыть папку <code>C:\Cloude\Baylux\Baylux</code></div>
        <div>2. Выполнить <code>python make_owner_contacts.py</code></div>
        <div>3. Появится <code>results\owner_contacts.csv</code> — загрузить его ниже</div>
      </div>

      <OwnerContactsImport />

      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 18, lineHeight: 1.7 }}>
        Сначала «Предпросмотр» — он только считает совпадения и ничего не меняет.
        Запись заполняет лишь пустые поля: контакты, внесённые вручную, не затираются.
      </p>
    </div>
  );
}
