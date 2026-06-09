// Браузерное сжатие изображения до целевого размера в КБ.
// Сначала ужимаем по стороне maxDim, затем снижаем качество JPEG, пока не попадём в targetKB
// (но не ниже minQuality). Если всё ещё крупно — дополнительно уменьшаем разрешение.
// При watermark:true впекаем полупрозрачный логотип Baylux по центру (защита фото).

const LOGO_AR = 910 / 345.5; // ширина/высота логотипа — фолбэк, если браузер не отдаёт naturalWidth у SVG
let logoPromise;
function loadLogo() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!logoPromise) {
    logoPromise = new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = "/baylux_watermark.svg";
    });
  }
  return logoPromise;
}

export async function compressImage(file, { maxDim = 1600, targetKB = 400, minQuality = 0.4, watermark = false } = {}) {
  try {
    if (!file || (file.type && !file.type.startsWith("image/"))) return file;
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const logo = watermark ? await loadLogo() : null;
    let w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) { if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; } else { w = Math.round((w * maxDim) / h); h = maxDim; } }
    const c = document.createElement("canvas");
    // Рисуем кадр и, если нужно, водяной знак — заново при каждом перерисовывании (downscale-цикл тоже).
    const render = (cw, ch) => {
      c.width = cw; c.height = ch;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      if (logo) {
        const ar = logo.naturalWidth ? logo.naturalWidth / logo.naturalHeight : LOGO_AR;
        const lw = cw * 0.30; // не слишком крупно
        const lh = lw / ar;
        ctx.save();
        ctx.globalAlpha = 0.30;
        ctx.shadowColor = "rgba(0,0,0,0.45)"; // тень, чтобы белый логотип был виден и на светлых фото
        ctx.shadowBlur = Math.max(4, Math.round(cw * 0.012));
        ctx.drawImage(logo, (cw - lw) / 2, (ch - lh) / 2, lw, lh);
        ctx.restore();
      }
    };
    render(w, h);
    const toBlob = (q) => new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", q));
    const target = targetKB * 1024;

    let q = 0.82;
    let blob = await toBlob(q);
    while (blob && blob.size > target && q > minQuality) { q = Math.max(minQuality, q - 0.12); blob = await toBlob(q); }

    // Если всё ещё больше цели — уменьшаем разрешение шагами по 0.8 и снова жмём.
    let guard = 0;
    while (blob && blob.size > target && Math.max(c.width, c.height) > 700 && guard < 4) {
      render(Math.round(c.width * 0.8), Math.round(c.height * 0.8));
      blob = await toBlob(Math.max(minQuality, q));
      guard++;
    }
    URL.revokeObjectURL(url);
    return blob || file;
  } catch (e) {
    return file;
  }
}
