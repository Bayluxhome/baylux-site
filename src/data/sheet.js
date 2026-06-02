// Чтение объектов из опубликованной Google-таблицы (CSV).
// Одна строка = одна квартира/лот. Стройки/дома (ЖК) группируются по building_slug.

// Минимальный CSV-парсер с поддержкой кавычек и запятых внутри значений.
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v && v.trim() !== ""));
}

// Нормализуем адрес/название улицы: убираем markdown-мусор (**, __, # и т.п.),
// чиним пробелы и запятые ("Химшиашвили,1" → "Химшиашвили, 1"), делаем первую букву заглавной.
// Применяется и при импорте, и при чтении — поэтому старые «грязные» записи тоже показываются чисто.
export function cleanAddress(raw) {
  let s = String(raw == null ? "" : raw);
  s = s.replace(/[*_~`#]+/g, " ");      // markdown/спецсимволы → пробел
  s = s.replace(/\s+/g, " ");            // схлопнуть пробелы
  s = s.replace(/\s*,\s*/g, ", ");       // нормализовать запятые
  s = s.replace(/^[\s,.\-–—•]+/, "");    // мусор в начале строки
  s = s.replace(/[\s,]+$/, "");          // мусор в конце
  s = s.trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugify(s) {
  const map = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"," ":"-" };
  return String(s).toLowerCase().split("").map((ch) => map[ch] ?? ch).join("")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "obj";
}

// Заголовки колонок в таблице (рус.) → поля
const COL = {
  "дом": "building_name", "жк/дом": "building_name", "жк": "building_name",
  "тип дома": "kind", "район": "district", "застройщик": "developer", "год": "year",
  "широта": "lat", "долгота": "lng", "фото дома": "building_image",
  "сделка": "deal", "тип": "type", "комнат": "rooms", "площадь": "area",
  "этаж": "floor", "цена": "price", "ед.цены": "per", "единица цены": "per",
  "фото объекта": "unit_image", "описание": "about",
};
const DEAL_MAP = { "продажа": "sale", "аренда": "rent", "посуточно": "daily", sale:"sale", rent:"rent", daily:"daily" };
const KIND_MAP = { "жк": "complex", "новостройка": "complex", "комплекс": "complex", "дом": "house", complex:"complex", house:"house" };

export async function fetchSheet(url) {
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("sheet fetch failed: " + res.status);
  const rows = parseCSV(await res.text());
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => COL[h.trim().toLowerCase()] || h.trim().toLowerCase());
  const items = rows.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
    return o;
  });

  const byBuilding = new Map();
  let n = 0;
  for (const it of items) {
    const bname = it.building_name || "Объект";
    const bslug = slugify(bname);
    if (!byBuilding.has(bslug)) {
      byBuilding.set(bslug, {
        slug: bslug,
        name: bname,
        kind: KIND_MAP[(it.kind || "").toLowerCase()] || "house",
        district: it.district || "Батуми",
        developer: it.developer || "",
        yearBuilt: it.year || "",
        lat: parseFloat(it.lat) || 41.64,
        lng: parseFloat(it.lng) || 41.63,
        image: it.building_image || it.unit_image || "/placeholder-baylux.jpg",
        about: it.about || "",
        units: [],
      });
    }
    const b = byBuilding.get(bslug);
    const uslug = slugify(bname + "-" + (it.type || "") + "-" + (it.price || ++n));
    b.units.push({
      id: bslug + "-" + b.units.length,
      slug: uslug,
      deal: DEAL_MAP[(it.deal || "").toLowerCase()] || "sale",
      type: it.type || "Квартира",
      rooms: it.rooms ? parseInt(it.rooms, 10) : 0,
      area: it.area ? parseInt(it.area, 10) : 0,
      floor: it.floor || "—",
      price: it.price || "—",
      per: it.per || "",
      unit_image: it.unit_image || "",
    });
  }
  return Array.from(byBuilding.values()).filter((b) => b.units.length > 0);
}
