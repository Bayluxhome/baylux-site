"use client";
import { useRef, useState } from "react";
import Image from "next/image";

// Галерея: на десктопе — мозаика-сетка (см. .gallery в CSS), на мобильном — свайп-лента
// со стрелками, счётчиком «1/N» и точками, чтобы было очевидно: фото можно листать.
export default function Gallery({ photos = [], alt = "" }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(0);
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

  return (
    <div className="gallery-wrap">
      <div className="gallery" ref={ref} onScroll={onScroll}>
        {list.map((g, i) => (
          <div key={i}>
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
    </div>
  );
}
