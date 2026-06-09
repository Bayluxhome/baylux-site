import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = ["внутренний номер", "месяц", "доход", "комиссия", "коммуналка", "расходы", "выплачено владельцу", "заметка"];
const SAMPLE = [
  ["A-101", "2026-06", 1200, 360, 80, 30, 730, "всё в порядке"],
  ["A-102", "2026-06", 1500, 450, 90, 0, 960, ""],
];
const COL_W = [18, 12, 12, 12, 13, 12, 20, 30];
const HELP = [
  ["Как заполнять сводку Baylux"],
  [""],
  ["внутренний номер", "Внутренний номер объекта из его карточки. По нему строка привязывается к квартире. Обязательно."],
  ["месяц", "Месяц отчёта в формате ГГГГ-ММ, например 2026-06. Обязательно."],
  ["доход", "Общая выручка за месяц, число (без знака валюты)."],
  ["комиссия", "Комиссия Baylux."],
  ["коммуналка", "Коммунальные платежи."],
  ["расходы", "Прочие расходы (ремонт, расходники и т.п.)."],
  ["выплачено владельцу", "Остаток к выплате собственнику (доход минус комиссия, коммуналка и расходы)."],
  ["заметка", "Комментарий для собственника (необязательно)."],
  [""],
  ["Одна строка = один объект за один месяц. Файл можно вести один на все месяцы — данные группируются по месяцу."],
];

// Отдаёт XLSX-шаблон сводки. Генерация на сервере — без подвисаний в браузере.
export async function GET() {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!s) return Response.json({ ok: false, error: "auth" }, { status: 401 });

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE]);
  ws["!cols"] = COL_W.map((w) => ({ wch: w }));
  const help = XLSX.utils.aoa_to_sheet(HELP);
  help["!cols"] = [{ wch: 22 }, { wch: 70 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Сводка");
  XLSX.utils.book_append_sheet(wb, help, "Инструкция");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="baylux_svodka_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
