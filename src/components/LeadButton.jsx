"use client";

export default function LeadButton({ className = "btn btn-gold", type = "", object = "", title = "", children }) {
  function open() {
    window.dispatchEvent(new CustomEvent("baylux:lead", { detail: { type, object, title } }));
  }
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
