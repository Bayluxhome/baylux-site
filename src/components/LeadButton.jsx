"use client";

// listingId/source нужны, чтобы заявка привязалась к объявлению и попала в кабинет
// его владельца (риелтора), а не терялась в общем потоке.
export default function LeadButton({ className = "btn btn-gold", type = "", object = "", title = "", listingId = "", source = "", children }) {
  function open() {
    window.dispatchEvent(new CustomEvent("baylux:lead", { detail: { type, object, title, listingId, source } }));
  }
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
