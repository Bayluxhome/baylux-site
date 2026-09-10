"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangContext";

const STAGES = ["new", "contact", "selection", "viewing", "negotiation", "deposit", "contract", "won", "lost"];
const PAGE = 25;

// Список клиентов (задача №06, п.2): таблица, поиск, фильтр по этапу, постранично, создание.
export default function ClientsList({ clients: initial, seesAll }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", tg: "", source: "site" });
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (initial || []).filter((c) => (!stage || c.stage === stage) && (!s || `${c.name} ${c.phone || ""} ${c.tg || ""} ${c.req_city || ""}`.toLowerCase().includes(s)));
  }, [initial, q, stage]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const p = Math.min(page, pages - 1);
  const rows = list.slice(p * PAGE, p * PAGE + PAGE);
  const byStage = useMemo(() => { const m = {}; (initial || []).forEach((c) => { m[c.stage] = (m[c.stage] || 0) + 1; }); return m; }, [initial]);
  const fmt = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };
  const overdue = (iso) => iso && new Date(iso) < new Date();

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) router.push(`/my/clients/${j.item.id}`); else alert(t("cab_err"));
  }
  const inp = { padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14, background: "#fff" };

  return (
    <div>
      <div className="cl-stages">
        {STAGES.map((s) => (
          <button key={s} type="button" className={"cl-stage" + (stage === s ? " on" : "")} onClick={() => { setStage(stage === s ? "" : s); setPage(0); }}>
            <span className={"cl-dot st-" + s} />{t("cl_stage_" + s)}<b>{byStage[s] || 0}</b>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
        <input style={{ ...inp, flex: "1 1 240px" }} placeholder={t("cl_search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <button type="button" className="btn btn-gold" onClick={() => setShowForm(!showForm)}>＋ {t("cl_new")}</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="cab-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <input style={inp} required placeholder={t("cl_f_name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={inp} placeholder={t("cl_f_phone")} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={inp} placeholder={t("cl_f_tg")} value={form.tg} onChange={(e) => setForm({ ...form, tg: e.target.value })} />
            <select style={inp} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {["site", "telegram", "whatsapp", "call", "referral", "other"].map((s) => <option key={s} value={s}>{t("cl_src_" + s)}</option>)}
            </select>
          </div>
          <button className="btn btn-gold" type="submit" disabled={busy} style={{ marginTop: 10 }}>{t("cl_create")}</button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="cab-empty">{initial?.length ? t("cat_empty") : t("cl_empty")}</p>
      ) : (
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead><tr>
              <th>{t("cl_th_client")}</th><th>{t("cl_th_phone")}</th><th>{t("cl_th_req")}</th><th>{t("cl_th_stage")}</th><th>{t("cl_th_next")}</th><th>{t("cl_th_date")}</th>{seesAll && <th>{t("cl_th_owner")}</th>}
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/my/clients/${c.id}`)}>
                  <td><Link href={`/my/clients/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.name}</Link>{c.tg ? <div className="cl-sub">@{c.tg}</div> : null}</td>
                  <td>{c.phone ? <a href={`tel:+${c.phone}`} onClick={(e) => e.stopPropagation()}>+{c.phone}</a> : "—"}</td>
                  <td><div className="cl-sub">{[c.req_deal && t("deal_" + c.req_deal), c.req_type, c.req_city, c.req_budget_max ? `≤ ${c.req_budget_max} ${c.req_currency || "USD"}` : ""].filter(Boolean).join(" · ") || "—"}</div></td>
                  <td><span className={"cl-badge st-" + c.stage}>{t("cl_stage_" + c.stage)}</span></td>
                  <td>{c.next_action || "—"}</td>
                  <td className={overdue(c.next_action_at) && !["won", "lost"].includes(c.stage) ? "cl-overdue" : ""}>{fmt(c.next_action_at)}</td>
                  {seesAll && <td className="cl-sub">{c.owner}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" style={{ marginTop: 12 }}>
          <button type="button" className="pg-arrow" disabled={p === 0} onClick={() => setPage(p - 1)}>‹</button>
          {Array.from({ length: pages }, (_, i) => <button type="button" key={i} className={"pg-num" + (i === p ? " active" : "")} onClick={() => setPage(i)}>{i + 1}</button>)}
          <button type="button" className="pg-arrow" disabled={p === pages - 1} onClick={() => setPage(p + 1)}>›</button>
        </nav>
      )}
    </div>
  );
}
