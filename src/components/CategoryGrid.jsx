"use client";
import Link from "next/link";
import { useState } from "react";

// Названия = подпункты верхнего меню. Ссылки = фильтры каталога.
const CATS = [
  // Продажа
  ["Продажа квартир", "/catalog?deal=sale&type=Квартира", "🛋️"],
  ["Продажа домов", "/catalog?deal=sale&type=Дом", "🏠"],
  ["Продажа коммерческой недвижимости", "/catalog?deal=sale&type=Коммерция", "🏬"],
  ["Продажа офисов", "/catalog?deal=sale&type=Офис", "🏢"],
  ["Продажа складов", "/catalog?deal=sale&type=Склад", "📦"],
  ["Продажа участков", "/catalog?deal=sale&type=Участок", "🌳"],
  ["Продажа гаражей и паркингов", "/catalog?deal=sale&type=Гараж", "🚗"],
  // Аренда
  ["Аренда квартир", "/catalog?deal=rent&type=Квартира", "🛏️"],
  ["Аренда домов", "/catalog?deal=rent&type=Дом", "🏡"],
  ["Аренда коммерческой недвижимости", "/catalog?deal=rent&type=Коммерция", "🏪"],
  ["Аренда офисов", "/catalog?deal=rent&type=Офис", "💼"],
  ["Аренда складов", "/catalog?deal=rent&type=Склад", "🚛"],
  ["Аренда гаражей и паркингов", "/catalog?deal=rent&type=Гараж", "🅿️"],
  // Новостройки
  ["Жилые комплексы", "/catalog?type=new", "🏙️"],
  ["Коттеджи", "/catalog?deal=sale&type=Дом", "🏘️"],
  // Посуточно
  ["Посуточно — квартиры", "/catalog?deal=daily&type=Квартира", "🏖️"],
  ["Посуточно — дома", "/catalog?deal=daily&type=Дом", "🏝️"],
  // Услуги
  ["Управление недвижимостью", "/#services", "🔑"],
  ["Клининг", "/#services", "🧹"],
  ["Риелторы", "/#services", "🤝"],
];

export default function CategoryGrid() {
  const [all, setAll] = useState(false);
  const list = all ? CATS : CATS.slice(0, 8);
  return (
    <section className="cats wrap">
      <div className="sec-head">
        <div>
          <h2>Категории недвижимости</h2>
          <p>Быстрый переход к нужному разделу — продажа, аренда, посуточно и услуги.</p>
        </div>
      </div>
      <div className="cat-grid">
        {list.map(([t, h, ic]) => (
          <Link key={t} href={h} className="cat">
            <span className="cat-t">{t}</span>
            <span className="cat-badge" aria-hidden="true">{ic}</span>
          </Link>
        ))}
      </div>
      <button className="cat-more" onClick={() => setAll((v) => !v)}>
        <span className="cm-ic">{all ? "−" : "+"}</span>{all ? "Свернуть" : "Показать все"}
      </button>
    </section>
  );
}
