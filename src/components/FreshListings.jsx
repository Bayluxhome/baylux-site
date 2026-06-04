"use client";
import { useState } from "react";
import PropertyCard from "@/components/PropertyCard";

// Свежие объекты на главной с постраничным листанием (без перезагрузки страницы).
export default function FreshListings({ units = [], perPage = 6 }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(units.length / perPage));
  const p = Math.min(page, pages - 1);
  const slice = units.slice(p * perPage, p * perPage + perPage);
  return (
    <>
      <div className="cards three">
        {slice.map((u) => <PropertyCard key={u.id} unit={u} />)}
      </div>
      {pages > 1 && (
        <nav className="pager" aria-label="Свежие объекты — страницы">
          <button type="button" className="pg-arrow" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label="Назад">‹</button>
          {Array.from({ length: pages }, (_, i) => (
            <button type="button" key={i} className={"pg-num" + (i === p ? " active" : "")} onClick={() => setPage(i)} aria-current={i === p ? "page" : undefined}>{i + 1}</button>
          ))}
          <button type="button" className="pg-arrow" disabled={p === pages - 1} onClick={() => setPage(p + 1)} aria-label="Вперёд">›</button>
        </nav>
      )}
    </>
  );
}
