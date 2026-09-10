"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/components/LangContext";

// Каркас кабинета (задача №06, этап 1): тёмно-синее боковое меню, светлая рабочая область.
// На узких экранах меню сворачивается в кнопку. Разделы, которых ещё нет (сделки, задачи,
// календарь), в меню не показываем — кнопок-имитаций быть не должно.
// crm: true — пункты для риелтора/сотрудника (клиенты, подборки). Обычному пользователю они
// не показываются; сами страницы и API проверяют роль на сервере независимо от меню.
const NAV = [
  ["/my", "cab_nav_dash", "▦", false],
  ["/my/objects", "cab_nav_objects", "▤", false],
  ["/my/clients", "cab_nav_clients", "☺", true],
  ["/my/leads", "cab_nav_leads", "✉", false],
  ["/my/collections", "cab_nav_collections", "🗂", true],
  ["/my/profile", "cab_nav_profile", "◉", false],
];

export default function CabinetShell({ children, name, role = "user", crm = false, adminHref }) {
  const { t } = useLang();
  const path = usePathname() || "";
  const [open, setOpen] = useState(false);
  const active = (href) => (href === "/my" ? path === "/my" : path.startsWith(href));
  const nav = NAV.filter(([, , , needCrm]) => !needCrm || crm);

  return (
    <div className="cabsh">
      <button type="button" className="cabsh-burger" onClick={() => setOpen(!open)} aria-label={t("cab_nav_menu")}>☰ {t("cab_nav_menu")}</button>
      <aside className={"cabsh-side" + (open ? " open" : "")}>
        <div className="cabsh-brand">BAYLUX<span>HOME</span></div>
        <div className="cabsh-user">{name || ""}<div className="cabsh-role">{t("cab_role_" + role)}</div></div>
        <nav className="cabsh-nav">
          {nav.map(([href, key, ic]) => (
            <Link key={href} href={href} className={active(href) ? "on" : ""} onClick={() => setOpen(false)}>
              <span className="cabsh-ic">{ic}</span>{t(key)}
            </Link>
          ))}
          {role === "staff" && adminHref && <Link href={adminHref} className="cabsh-admin">⚙️ {t("cab_nav_admin")}</Link>}
        </nav>
        <div className="cabsh-foot">
          <Link className="btn btn-gold" href="/add">＋ {t("cab_nav_add")}</Link>
          <a href="/api/tg-logout">{t("my_logout")}</a>
        </div>
      </aside>
      <main className="cabsh-main">{children}</main>
    </div>
  );
}
