import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import BotLogin from "@/components/BotLogin";
import TelegramLogin from "@/components/TelegramLogin";
import AddListingForm from "@/components/AddListingForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Разместить объявление в Батуми",
  description: "Разместите объявление о продаже или аренде недвижимости в Батуми: данные, точка на карте, фото. После проверки модератором — на сайте.",
};

export default function AddPage() {
  const session = verifySession(cookies().get("bx_session")?.value);

  if (!session) {
    return (
      <div className="wrap" style={{ padding: "48px 0", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>Разместить объявление</h1>
        <p style={{ color: "var(--ink-soft)", margin: "12px 0 22px", lineHeight: 1.6 }}>
          Сначала войдите через Telegram — объявление привяжется к вашему аккаунту, и вы сможете им управлять.
        </p>
        <BotLogin />
        <div style={{ margin: "24px 0 12px", color: "var(--ink-soft)", fontSize: 13 }}>или войдите виджетом Telegram:</div>
        <TelegramLogin />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "30px 0 50px", maxWidth: 760 }}>
      <h1 style={{ color: "var(--navy)" }}>Разместить объявление</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 22px", lineHeight: 1.6 }}>
        Заполните данные, отметьте точку на карте и добавьте фото. После проверки модератором объявление появится на сайте. Статус — в разделе «Мои объявления».
      </p>
      <AddListingForm />
    </div>
  );
}
