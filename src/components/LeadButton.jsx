"use client";

// listingId/source нужны, чтобы заявка привязалась к объявлению и попала в кабинет
// его владельца (риелтора), а не терялась в общем потоке.
// typeKey — машинный тип заявки (viewing / rent / daily / management / complex / cleaning / landing),
// не зависит от языка посетителя; по нему менеджер видит тип по-русски (см. lib/leads.js).
// collectionToken — контекст подборки (№07): заявка уйдёт риелтору-владельцу подборки.
export default function LeadButton({ className = "btn btn-gold", type = "", typeKey = "other", object = "", title = "", listingId = "", source = "", collectionToken = "", children }) {
  function open() {
    window.dispatchEvent(new CustomEvent("baylux:lead", { detail: { type, typeKey, object, title, listingId, source, collectionToken } }));
  }
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
