"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const read = () => { try { setItems(JSON.parse(localStorage.getItem("bxFav") || "[]")); } catch (e) { setItems([]); } };
    read();
    window.addEventListener("bxfav", read);
    return () => window.removeEventListener("bxfav", read);
  }, []);
  function remove(slug) {
    const arr = items.filter((x) => x.slug !== slug);
    try { localStorage.setItem("bxFav", JSON.stringify(arr)); } catch (e) {}
    setItems(arr);
    window.dispatchEvent(new Event("bxfav"));
  }
  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>Избранное</h1>
      {items.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
          Пока пусто. Нажимайте ♡ на карточках объектов — они появятся здесь.<br />
          <Link href="/catalog" style={{ color: "var(--navy)", fontWeight: 600 }}>Открыть каталог →</Link>
        </p>
      ) : (
        <div className="cards" style={{ marginTop: 18 }}>
          {items.map((it) => (
            <div className="card" key={it.slug}>
              <Link href={it.href} className="ph" style={{ display: "block" }}>
                {it.img ? <Image src={it.img} alt={it.title} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} /> : null}
              </Link>
              <div className="body">
                <div className="price">{it.price}</div>
                <div className="ctitle">{it.title}</div>
                <div className="cdistrict">{it.sub}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link className="btn btn-gold" href={it.href} style={{ flex: 1, textAlign: "center", padding: "9px 0" }}>Открыть</Link>
                  <button className="btn btn-ghost" onClick={() => remove(it.slug)} style={{ padding: "9px 14px" }}>Убрать</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
