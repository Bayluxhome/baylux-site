import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { title: "Журнал Tati — Админ", robots: { index: false, follow: false } };

// Журнал помощника Tati (T-20261128-02): диалоги из chat_logs по дням (время Тбилиси).
// Персональные данные замаскированы ещё при записи (lib/chat/guard.js). Только супер-админ.
const PERIODS = [1, 7, 30];
const MAX_ROWS = 3000;
const TZ = "Asia/Tbilisi";
const LOCALE = { ru: "ru-RU", en: "en-GB", ka: "ka-GE" };

async function loadLogs(sinceIso) {
  if (!supa) return [];
  const PAGE = 1000;
  const run = async (cols) => {
    const all = [];
    for (let p = 0; p * PAGE < MAX_ROWS; p++) {
      const { data, error } = await supa.from("chat_logs").select(cols).gte("created_at", sinceIso)
        .order("created_at", { ascending: false }).range(p * PAGE, p * PAGE + PAGE - 1);
      if (error) return null;
      all.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return all;
  };
  // Колонки test и ms добавляет sql/035; если его не выполняли — читаем без них.
  return (await run("id, conversation_id, lang, user_text, reply, tools, error, created_at, test, ms"))
    || (await run("id, conversation_id, lang, user_text, reply, tools, error, created_at")) || [];
}

const toolNames = (tools) => (Array.isArray(tools) ? tools : []).map((x) => (typeof x === "string" ? x : (x && (x.name || x.tool)) || "")).filter(Boolean);

export default async function AdminTatiPage({ searchParams }) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) redirect("/admin");
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const loc = LOCALE[lang] || "ru-RU";

  const days = PERIODS.includes(parseInt(searchParams?.days, 10)) ? parseInt(searchParams.days, 10) : 7;
  const showTest = searchParams?.test === "1";
  const rows = await loadLogs(new Date(Date.now() - days * 864e5).toISOString());

  // Диалоги: по conversation_id, сообщения по времени; диалог относится к дню своего последнего сообщения.
  const conv = new Map();
  for (const r of rows) {
    const names = toolNames(r.tools);
    const test = r.test === true || names.includes("test");
    if (test && !showTest) continue;
    const key = r.conversation_id || "row" + r.id;
    if (!conv.has(key)) conv.set(key, { key, msgs: [], test: false, lead: false, err: false, last: r.created_at, lang: r.lang || "" });
    const c = conv.get(key);
    c.msgs.push(r);
    c.test = c.test || test; c.lead = c.lead || names.includes("create_lead"); c.err = c.err || !!r.error;
    if (r.created_at > c.last) c.last = r.created_at;
  }
  const dayOf = (iso) => new Date(iso).toLocaleDateString(loc, { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
  const timeOf = (iso) => new Date(iso).toLocaleTimeString(loc, { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const list = [...conv.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  list.forEach((c) => c.msgs.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)));
  const byDay = [];
  for (const c of list) {
    const d = dayOf(c.last);
    if (!byDay.length || byDay[byDay.length - 1].day !== d) byDay.push({ day: d, items: [] });
    byDay[byDay.length - 1].items.push(c);
  }
  const msgTotal = list.reduce((s, c) => s + c.msgs.length, 0);

  const tag = (text, bg, fg) => <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{text}</span>;
  const q = (d, ts) => `?days=${d}${ts ? "&test=1" : ""}`;

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>{t("tj_h")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "6px 0 14px", maxWidth: 760 }}>{t("tj_p")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        {PERIODS.map((p) => <Link key={p} href={q(p, showTest)} className={p === days ? "btn btn-navy" : "btn btn-ghost"} style={{ padding: "7px 14px" }}>{p} {t("tj_days")}</Link>)}
        <Link href={q(days, !showTest)} className="btn btn-ghost" style={{ padding: "7px 14px" }}>{showTest ? t("tj_hide_test") : t("tj_show_test")}</Link>
        <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{list.length} {t("tj_dialogs")} · {msgTotal} {t("tj_msgs")}</span>
      </div>

      {byDay.length === 0 ? <p style={{ color: "var(--ink-soft)" }}>{t("tj_empty")}</p> : byDay.map((g) => (
        <section key={g.day} style={{ marginBottom: 22 }}>
          <h3 style={{ color: "var(--navy)", margin: "0 0 8px" }}>{g.day} · {g.items.length}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {g.items.map((c) => (
              <details key={c.key} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
                <summary style={{ cursor: "pointer", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
                  <b style={{ color: "var(--navy)" }}>{timeOf(c.msgs[0].created_at)}</b>
                  {c.lang && tag(c.lang.toUpperCase(), "#eef2f7", "#4a5b70")}
                  <span style={{ color: "var(--ink-soft)" }}>{c.msgs.length} {t("tj_msgs")}</span>
                  {c.lead && tag("✓ " + t("tj_lead"), "#E6F4EC", "#1A7F37")}
                  {c.err && tag(t("tj_err"), "#FDEDE4", "#B4441B")}
                  {c.test && tag(t("tj_test"), "#F1ECF8", "#5B3E96")}
                  <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 520 }}>{String(c.msgs[0].user_text || "").slice(0, 120)}</span>
                </summary>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {c.msgs.map((m) => (
                    <div key={m.id} style={{ display: "grid", gap: 6 }}>
                      {m.user_text && (
                        <div style={{ justifySelf: "end", maxWidth: "85%", background: "var(--navy)", color: "#fff", borderRadius: "12px 12px 2px 12px", padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>{t("tj_client")} · {timeOf(m.created_at)}</div>{m.user_text}
                        </div>
                      )}
                      {(m.reply || m.error) && (
                        <div style={{ justifySelf: "start", maxWidth: "85%", background: "#f5efe2", color: "var(--ink)", borderRadius: "12px 12px 12px 2px", padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Tati{toolNames(m.tools).filter((n) => n !== "test").length ? " · " + toolNames(m.tools).filter((n) => n !== "test").join(", ") : ""}{m.ms ? ` · ${(m.ms / 1000).toFixed(1)} s` : ""}</div>
                          {m.reply}{m.error ? <div style={{ color: "#9a2b2b", fontSize: 12 }}>{t("tj_err")}: {String(m.error).slice(0, 300)}</div> : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
