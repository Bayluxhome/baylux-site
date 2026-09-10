import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { getById, isOwner } from "@/lib/collections";
import { getRole, canCrm } from "@/lib/roles";
import CollectionPicker from "@/components/CollectionPicker";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Экран выбора объектов для подборки. Список объектов и проверка принадлежности —
// на сервере (см. api/collections?pick=), здесь только гейт: чужую подборку не открыть.
export default async function PickPage({ params }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const session = verifySession(cookies().get("bx_session")?.value);
  const c = session && canCrm(await getRole(session)) ? await getById(params.id) : null;
  if (!c || !isOwner(session, c)) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("col_unavailable_h")}</h1>
        <a className="btn btn-gold" href="/my/collections" style={{ display: "inline-flex", marginTop: 18 }}>{t("col_done")}</a>
      </div>
    );
  }
  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px", maxWidth: 980 }}>
      <CollectionPicker id={c.id} />
    </div>
  );
}
