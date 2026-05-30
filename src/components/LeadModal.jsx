"use client";
import { useState, useEffect } from "react";

export default function LeadModal() {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState({ type: "", object: "", title: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", comment: "" });

  useEffect(() => {
    const h = (e) => {
      setCtx(e.detail || {});
      setSent(false);
      setForm({ name: "", phone: "", comment: "" });
      setOpen(true);
    };
    window.addEventListener("baylux:lead", h);
    return () => window.removeEventListener("baylux:lead", h);
  }, []);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (!form.phone.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: ctx.type, object: ctx.object }),
      });
    } catch (_) {}
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="lead-overlay" onClick={() => setOpen(false)}>
      <div className="lead-box" onClick={(e) => e.stopPropagation()}>
        <button className="lead-close" onClick={() => setOpen(false)} aria-label="Закрыть">✕</button>
        {sent ? (
          <div className="lead-done">
            <div className="lead-check">✓</div>
            <h3>Заявка отправлена</h3>
            <p>Свяжемся с вами в ближайшее время — обычно в течение нескольких минут.</p>
            <button className="btn btn-gold" onClick={() => setOpen(false)}>Закрыть</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>{ctx.title || "Оставить заявку"}</h3>
            {ctx.object ? <p className="lead-obj">📍 {ctx.object}</p> : null}
            <input required placeholder="Ваше имя" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required placeholder="Телефон или WhatsApp" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <textarea placeholder="Комментарий (необязательно)" rows={3} value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            <button className="btn btn-gold" type="submit" disabled={loading}>
              {loading ? "Отправляю…" : "Отправить заявку"}
            </button>
            <p className="lead-note">Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
          </form>
        )}
      </div>
    </div>
  );
}
