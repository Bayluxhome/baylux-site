import sharp from "sharp";
import { WATERMARK_PNG_B64, WATERMARK_AR } from "@/lib/watermarkLogo";

const LOGO = Buffer.from(WATERMARK_PNG_B64, "base64");

// Серверный водяной знак (для фото из Telegram-бота).
// Ресайз ≤ maxDim, белый логотип по центру (30% ширины кадра, прозрачность 0.3),
// вывод JPEG под targetKB. При любой ошибке возвращаем исходный буфер —
// заливка фото не должна падать из-за обработки.
export async function watermarkBuffer(input, { maxDim = 1600, targetKB = 200 } = {}) {
  try {
    const resizedBuf = await sharp(input)
      .rotate() // учёт EXIF-ориентации
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const meta = await sharp(resizedBuf).metadata();
    const W = meta.width || maxDim;
    const lw = Math.round(W * 0.30); // не слишком крупно
    const logoResized = await sharp(LOGO).resize({ width: lw }).toBuffer();
    // Прозрачность 0.3 — умножаем альфу логотипа через blend "dest-in" с равномерной альфа-плиткой.
    const faded = await sharp(logoResized).ensureAlpha()
      .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * 0.30)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
      .png().toBuffer();

    let q = 78, jpg;
    do {
      jpg = await sharp(resizedBuf).composite([{ input: faded, gravity: "center" }]).jpeg({ quality: q, mozjpeg: true }).toBuffer();
      q -= 10;
    } while (jpg.length > targetKB * 1024 && q >= 40);
    return jpg;
  } catch (e) {
    console.error("watermark:", e?.message);
    return input;
  }
}

// Ширина/высота логотипа экспортируется для возможных будущих раскладок.
export { WATERMARK_AR };
