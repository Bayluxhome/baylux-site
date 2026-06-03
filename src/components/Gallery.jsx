"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";

// Галерея: на десктопе — мозаика-сетка (см. .gallery в CSS), на мобильном — свайп-лента
// со стрелками, счётчиком «1/N» и точками. Клик по фото открывает полноэкранный просмотр (лайтбокс).
export default function Gallery({ photos = [], alt = "" }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
  const [lb, setLb] = useState(-1); // индекс открытого фото в лайтбоксе; -1 — закрыт
  const list = photos.length ? photos : ["/placeholder-baylux.jpg"];
  const n = list.length;

  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    setIdx(Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / el.clientWidth))));
  };
  const go = (dir) => {
    const el = ref.current;
    if (!el) return;
    const target = Math.max(0, Math.min(n - 1, idx + dir));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  const lbGo = (dir) => setLb((p) => (p + dir + n) % n);

  useEffect(() => {
    if (lb < 0) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLb(-1);
      else if (e.key === "ArrowLeft") lbGo(-1);
      else if (e.key === "ArrowRight") lbGo(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [lb, n]);

  return (
    <div className="gallery-wrap">
      <div className="gallery" ref={ref} onScroll={onScroll}>
        {list.map((g, i) => (
          <div key={i} onClick={() => setLb(i)} style={{ cursor: "zoom-in" }}>
            <Image src={g} alt={`${alt} — фото ${i + 1}`} fill sizes="(max-width:560px) 100vw, 50vw" style={{ objectFit: "cover" }} />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button type="button" className="gal-arrow gal-prev" aria-label="Предыдущее фото" onClick={() => go(-1)}>‹</button>
          <button type="button" className="gal-arrow gal-next" aria-label="Следующее фото" onClick={() => go(1)}>›</button>
          <div className="gal-count">{idx + 1}/{n}</div>
          {n <= 7 && (
            <div className="gal-dots">
              {list.map((_, i) => <span key={i} className={"gal-dot" + (i === idx ? " on" : "")} />)}
            </div>
          )}
        </>
      )}

      {lb >= 0 && (
        <div className="lightbox" onClick={() => setLb(-1)} role="dialog" aria-label="Просмотр фото">
          <button type="button" className="lb-close" aria-label="Закрыть" onClick={(e) => { e.stopPropagation(); setLb(-1); }}>✕</button>
          {n > 1 && <button type="button" className="lb-arrow lb-prev" aria-label="Предыдущее" onClick={(e) => { e.stopPropagation(); lbGo(-1); }}>‹</button>}
          {n > 1 && <button type="button" className="lb-arrow lb-next" aria-label="Следующее" onClick={(e) => { e.stopPropagation(); lbGo(1); }}>›</button>}
          <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
            <Image src={list[lb]} alt={`${alt} — фото ${lb + 1}`} fill sizes="100vw" style={{ objectFit: "contain" }} priority />
          </div>
          {n > 1 && <div className="lb-count">{lb + 1} / {n}</div>}
        </div>
      )}
    </div>
  );
}
