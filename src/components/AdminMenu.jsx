"use client";
// Меню админки (T-20261128-02, решение Дмитрия 28.11): строки, как на портале ZOND, в стиле Baylux.
//   РАБОТА   — Мой день, Заявки, CRM (Объекты, Клиенты; Собственники и Показы появятся с CRM), Подборки, Новости
//   АДМИНКА  — Сотрудники и роли, Люди, Аналитика, Журнал Tati, Сервис
//   ОБУЧЕНИЕ — не показываем, пока раздел пуст (кнопок-пустышек быть не должно).
// Какие пункты видит сотрудник, решает сервер (admin/layout.jsx → flags). Скрытие пункта — не защита:
// каждая страница и API проверяют право сами.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/components/LangContext";
import { stripLang } from "@/lib/i18nPath";

export default function AdminMenu({ flags = {}, leadsNew = 0 }) {
  const { t } = useLang();
  const path = stripLang(usePathname() || "");
  const is = (p) => path === p || path.startsWith(p + "/");
  const objectsOn = path === "/admin" || is("/admin/complexes");
  const peopleOn = is("/admin/users") || is("/admin/realtors");

  const work = [
    { href: "/my", label: t("adm_my_day"), show: true, on: false },
    { href: "/admin/leads", label: t("adm_leads"), show: flags.leads, on: is("/admin/leads"), badge: leadsNew },
    { group: t("adm_crm"), show: true },
    { href: flags.moderate ? "/admin" : "/admin/complexes", label: t("adm_objects"), show: flags.moderate || flags.complexes, on: objectsOn, sub: true },
    { href: "/my/clients", label: t("adm_clients"), show: true, on: false, sub: true },
    { href: "/my/collections", label: t("adm_collections"), show: true, on: false },
    { href: "/admin/news", label: t("adm_news"), show: flags.news, on: is("/admin/news") },
  ].filter((x) => x.show);

  const admin = [
    { href: "/admin/staff", label: t("adm_staff"), show: flags.super, on: is("/admin/staff") },
    { href: flags.users ? "/admin/users" : "/admin/realtors", label: t("adm_people"), show: flags.users || flags.realtors, on: peopleOn },
    { href: "/admin/analytics", label: t("adm_analytics"), show: flags.users, on: is("/admin/analytics") },
    { href: "/admin/tati", label: t("adm_tati"), show: flags.super, on: is("/admin/tati") },
    { href: "/admin/service", label: t("adm_service"), show: flags.super, on: is("/admin/service") || is("/admin/reports") || is("/admin/owner-contacts") },
  ].filter((x) => x.show);

  // Вкладки раздела: «Объекты» = объявления + новостройки, «Люди» = пользователи + риелторы.
  let tabs = [];
  if (objectsOn) tabs = [
    { href: "/admin", label: t("adm_tab_listings"), show: flags.moderate, on: path === "/admin" },
    { href: "/admin/complexes", label: t("adm_tab_complexes"), show: flags.complexes, on: is("/admin/complexes") },
  ];
  else if (peopleOn) tabs = [
    { href: "/admin/users", label: t("adm_tab_users"), show: flags.users, on: is("/admin/users") },
    { href: "/admin/realtors", label: t("adm_tab_realtors"), show: flags.realtors, on: is("/admin/realtors") },
  ];
  tabs = tabs.filter((x) => x.show);

  const row = (title, items) => items.length > 0 && (
    <div className="admm-row">
      <span className="admm-ttl">{title}</span>
      <div className="admm-items">
        {items.map((x, i) => x.group
          ? <span key={"g" + i} className="admm-grp">{x.group}:</span>
          : (
            <Link key={x.href + i} href={x.href} className={"admm-a" + (x.on ? " on" : "") + (x.sub ? " sub" : "")}>
              {x.label}{x.badge > 0 ? <b className="admm-bdg">{x.badge}</b> : null}
            </Link>
          ))}
      </div>
    </div>
  );

  return (
    <nav className="admm" aria-label="Admin">
      <div className="wrap">
        {row(t("adm_row_work"), work)}
        {row(t("adm_row_admin"), admin)}
        {tabs.length > 1 && (
          <div className="admm-tabs">
            {tabs.map((x) => <Link key={x.href} href={x.href} className={x.on ? "on" : ""}>{x.label}</Link>)}
          </div>
        )}
      </div>
      <style>{`
        .admm{background:#fff;border-bottom:1px solid var(--line);padding:10px 0 0}
        .admm-row{display:flex;align-items:center;gap:14px;padding:4px 0;flex-wrap:wrap}
        .admm-ttl{flex:none;width:92px;font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--gold-dk,#96690c)}
        .admm-items{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .admm-grp{font-size:12px;font-weight:700;color:var(--ink-soft);margin-left:8px}
        .admm-a{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;font-size:14px;font-weight:600;color:var(--navy);border:1px solid var(--line);background:#fff;white-space:nowrap}
        .admm-a:hover{border-color:var(--gold)}
        .admm-a.on{background:var(--navy);border-color:var(--navy);color:#fff}
        .admm-bdg{background:var(--gold,#c9a24a);color:#fff;border-radius:999px;font-size:11px;padding:1px 7px;font-weight:700}
        .admm-tabs{display:flex;gap:22px;margin-top:8px;border-top:1px solid var(--line);padding-top:10px}
        .admm-tabs a{padding:0 2px 9px;font-size:14px;font-weight:600;color:var(--ink-soft);border-bottom:3px solid transparent}
        .admm-tabs a.on{color:var(--navy);font-weight:800;border-bottom-color:var(--gold)}
        .admm-row:last-of-type{padding-bottom:10px}
        .admm-tabs{margin-bottom:0}
        @media(max-width:640px){.admm-ttl{width:100%}}
      `}</style>
    </nav>
  );
}
