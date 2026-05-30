// Единая точка доступа к данным: Google-таблица (если задан SHEET_CSV_URL), иначе локальные данные.
import { BUILDINGS as LOCAL } from "./data";
import { fetchSheet } from "./sheet";

async function getBuildings() {
  const url = process.env.SHEET_CSV_URL;
  if (url) {
    try {
      const b = await fetchSheet(url);
      if (b && b.length) return b;
    } catch (e) {
      console.error("Sheet load failed, fallback to local data:", e.message);
    }
  }
  return LOCAL;
}

export async function getBuildingsList() {
  return getBuildings();
}

export async function getAllUnits() {
  const bs = await getBuildings();
  return bs.flatMap((b) => b.units.map((u) => ({ ...u, building: b, img: u.unit_image || b.image })));
}

export async function findBuilding(slug) {
  const bs = await getBuildings();
  return bs.find((b) => b.slug === slug) || null;
}

export async function findUnit(slug) {
  const bs = await getBuildings();
  for (const b of bs) {
    const u = b.units.find((x) => x.slug === slug);
    if (u) return { ...u, building: b, img: u.unit_image || b.image };
  }
  return null;
}
