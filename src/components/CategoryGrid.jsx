"use client";
import Link from "next/link";
import { useState } from "react";

// Названия = подпункты верхнего меню. Ссылки = фильтры каталога.
const CATS = [
  // Продажа
  ["Продажа квартир", "/catalog?deal=sale&cat=apartment", "🛋️"],
  ["Продажа домов", "/catalog?deal=sale&cat=house", "🏠"],
  ["Продажа коммерческой недвижимости", "/catalog?deal=sale&cat=commercial", "🏬"],
  ["Продажа офисов", "/catalog?deal=sale&cat=office", "🏢"],
  ["Продажа складов", "/catalog?deal=sale&cat=warehouse", "📦"],
  ["Продажа участков", "/catalog?deal=sale&cat=land", "🌳"],
  ["Продажа гаражей и паркингов", "/catalog?deal=sale&cat=garage", "🚗"],
  // Аренда
  ["Аренда квартир", "/catalog?deal=rent&cat=apartment", "🛏️"],
  ["Аренда домов", "/catalog?deal=rent&cat=house", "🏡"],
  ["Аренда коммерческой недвижимости", "/catalog?deal=rent&cat=commercial", "🏪"],
  ["Аренда офисов", "/catalog?deal=rent&cat=office", "💼"],
  ["Аренда складов", "/catalog?deal=rent&cat=warehouse", "🚛"],
  ["Аренда гаражей и паркингов", "/catalog?deal=rent&cat=garage", "🅿️"],
  // Новостройки
  ["Жилые комплексы", "/catalog?new=1", "🏙️"],
  ["Коттеджи", "/catalog?cat=house&new=1", "🏘️"],
  // Посуточно
  ["Посуточно — квартиры", "/catalog?deal=daily&cat=apartment", "🏖️"],
  ["Посуточно — дома", "/catalog?deal=daily&cat=house", "🏝️"],
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
