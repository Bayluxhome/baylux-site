import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import BotLogin from "@/components/BotLogin";
import TelegramLogin from "@/components/TelegramLogin";
import EmailLogin from "@/components/EmailLogin";
import AddListingForm from "@/components/AddListingForm";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Разместить объявление в Батуми",
  description: "Разместите объявление о продаже или аренде недвижимости в Батуми: данные, точка на карте, фото. После проверки модератором — на сайте.",
};

export default function AddPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 0", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("add_title")}</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>
          {t("add_login_p")}
        </p>
        <BotLogin />
        <div style={{ margin: "24px 0 12px", color: "var(--ink-soft)", fontSize: 13 }}>{t("cab_or")}</div>
        <TelegramLogin />
        <div style={{ margin: "22px 0 0", color: "var(--ink-soft)", fontSize: 13 }}>{t("el_or")}</div>
        <EmailLogin />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "30px 0 50px", maxWidth: 760 }}>
      <h1 style={{ color: "var(--navy)" }}>{t("add_title")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 22px", lineHeight: 1.6 }}>
        {t("add_intro")}
      </p>
      <AddListingForm />
    </div>
  );
}
