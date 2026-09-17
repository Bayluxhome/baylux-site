import Link from "next/link";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { COMPANY, fmtPhone } from "@/config";

// «Обложка» режима презентации: публичная подборка /c/<token> и открытая из неё карточка
// объекта (/property/<slug>?c=<token>). Глобальные Header/Footer на этих адресах отключает
// root layout по заголовку x-bx-layout от middleware — то есть меню нет уже в серверном HTML.
//
// SHOW_BRAND = false (решение от 17.09.2026): подборка выглядит как личная подборка риелтора,
// без фирменной шапки и контактов компании. Ссылка на политику остаётся — на странице есть
// форма заявки, то есть сбор персональных данных. Чтобы вернуть брендирование — true.
const SHOW_BRAND = false;

// backHref — «Вернуться к подборке» на странице объекта.
export default function PresShell({ backHref = "", children }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  // Верхняя полоса нужна только ради возврата к подборке; без бренда и без ссылки она пустая.
  const showBar = SHOW_BRAND || !!backHref;
  return (
    <div className="pres">
      {showBar && (
        <div className="pres-bar">
          <div className="wrap pres-bar-in">
            {SHOW_BRAND && <img className="pres-logo" src="/baylux_logo.svg" alt="Baylux" width="120" height="30" />}
            {backHref && <Link className="pres-back" href={backHref}>← {t("col_back")}</Link>}
          </div>
        </div>
      )}

      {/* <main> даёт root layout — здесь только контейнер, чтобы не вкладывать main в main */}
      <div id="pres-content">{children}</div>

      <div className="pres-foot">
        <div className="wrap pres-foot-in">
          {SHOW_BRAND && (
            <>
              <span className="pres-foot-brand">{COMPANY.publicName}</span>
              <a href={"tel:+" + COMPANY.phone}>{fmtPhone(COMPANY.phone)}</a>
            </>
          )}
          <Link href="/privacy">{t("foot_privacy")}</Link>
          {SHOW_BRAND && <Link href="/" className="pres-foot-site">{t("col_to_site")}</Link>}
        </div>
      </div>
    </div>
  );
}
