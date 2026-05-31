"use client";
import { useState, useEffect } from "react";

function read() { try { return JSON.parse(localStorage.getItem("bxFav") || "[]"); } catch (e) { return []; } }
function write(arr) { try { localStorage.setItem("bxFav", JSON.stringify(arr)); } catch (e) {} window.dispatchEvent(new Event("bxfav")); }

export default function FavButton({ item, className }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().some((x) => x.slug === item.slug)); }, [item.slug]);
  function toggle(e) {
    e.preventDefault(); e.stopPropagation();
    const arr = read();
    const i = arr.findIndex((x) => x.slug === item.slug);
    if (i >= 0) { arr.splice(i, 1); setOn(false); } else { arr.unshift(item); setOn(true); }
    write(arr);
  }
  return (
    <button type="button" className={"fav" + (on ? " on" : "") + (className ? " " + className : "")} onClick={toggle} aria-label="В избранное" title="В избранное">
      {on ? "♥" : "♡"}
    </button>
  );
}
