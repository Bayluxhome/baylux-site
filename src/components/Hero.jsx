"use client";
import HeroSearch from "./HeroSearch";
import { useFilter } from "./FilterContext";

const CITY_IMG = { "Батуми": "/hero-batumi.jpg", "Тбилиси": "/hero-tbilisi.jpg" };

export default function Hero() {
  const { f } = useFilter();
  const city = f.city;
  const img = CITY_IMG[city] || "/hero-georgia.jpg";
  const place = city || "Грузии";
  return (
    <section className="hero">
      <div
        className="hero-photo"
        style={{ backgroundImage: `linear-gradient(100deg, rgba(1,29,60,.94) 0%, rgba(1,29,60,.72) 46%, rgba(1,39,80,.46) 100%), url(${img})` }}
      />
      <div className="wrap hero-inner">
        <h1>Недвижимость в <span className="accent">{place}</span> —<br />купить, продать, снять или сдать</h1>
        <p>
          Проверенные квартиры, дома и апартаменты по всей Грузии — без дублей и фейков. Прозрачные цены,
          честные условия и помощь местной команды на каждом шаге сделки.
        </p>
        <HeroSearch />
        <div className="stat-row">
          <div className="stat"><b>100%</b><span>проверенные объекты</span></div>
          <div className="stat"><b>0%</b><span>скрытых комиссий</span></div>
          <div className="stat"><b>24/7</b><span>ответ в WhatsApp</span></div>
          <div className="stat"><b>3</b><span>языка: RU · EN · GE</span></div>
        </div>
      </div>
    </section>
  );
}
