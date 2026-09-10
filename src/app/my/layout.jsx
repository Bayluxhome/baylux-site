import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import CabinetShell from "@/components/CabinetShell";

// Общий каркас кабинета (задача №06, этап 1). Без сессии — просто содержимое (экран входа).
export default function MyLayout({ children }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return children;
  return (
    <CabinetShell name={session.name || session.username || session.email || ""} isStaff={isAdmin(session)} adminHref="/admin">
      {children}
    </CabinetShell>
  );
}
