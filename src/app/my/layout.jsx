import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { getRole, canCrm } from "@/lib/roles";
import CabinetShell from "@/components/CabinetShell";

// Общий каркас кабинета для всех ролей. Различие — в наборе разделов (по роли с сервера):
// обычный пользователь: Главная, Мои объекты, Обращения, Профиль;
// риелтор / сотрудник: + Клиенты, Подборки (+ Админка у сотрудников).
// Скрытие пункта меню — не защита: страницы и API проверяют роль сами.
export default async function MyLayout({ children }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return children;
  const role = await getRole(session);
  return (
    <CabinetShell name={session.name || session.username || session.email || ""} role={role} crm={canCrm(role)} adminHref="/admin">
      {children}
    </CabinetShell>
  );
}
