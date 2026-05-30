import { WA_PHONE, waLink } from "@/config";

export const metadata = {
  title: "Контакты",
  description: "Связаться с Baylux: WhatsApp, Telegram, e-mail. Недвижимость в Батуми — продажа, аренда, управление.",
};

export default function ContactsPage() {
  return (
    <div className="wrap cms">
      <h1>Контакты</h1>
      <p>Ответим за 5 минут. Пишите удобным способом — на русском, английском или грузинском.</p>

      <div className="contact-row">
        <a href={waLink("Здравствуйте! Пишу с сайта Baylux.")} target="_blank" rel="noopener">💬 WhatsApp: +{WA_PHONE}</a>
        <a href="https://t.me/baylux_leads_bot" target="_blank" rel="noopener">✈️ Telegram: @baylux_leads_bot</a>
        <a href="mailto:bayluxhome@yahoo.com">✉️ E-mail: bayluxhome@yahoo.com</a>
      </div>

      <h2>Где мы</h2>
      <p>📍 Батуми, Грузия. Работаем по всему городу и пригородам (Гонио, Махинджаури, Чакви).</p>

      <h2>Разместить объект</h2>
      <p>Сдать или продать недвижимость можно прямо на сайте — кнопка «Сдать / продать», или через нашего Telegram-бота @baylux_leads_bot.</p>

      <p className="muted" style={{ marginTop: 18 }}>Baylux · недвижимость в Батуми, Грузия.</p>
    </div>
  );
}
