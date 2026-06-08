// Браузерное сжатие изображения до целевого размера в КБ.
// Сначала ужимаем по стороне maxDim, затем снижаем качество JPEG, пока не попадём в targetKB
// (но не ниже minQuality). Если всё ещё крупно — дополнительно уменьшаем разрешение.
export async function compressImage(file, { maxDim = 1600, targetKB = 400, minQuality = 0.4 } = {}) {
  try {
    if (!file || (file.type && !file.type.startsWith("image/"))) return file;
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    let w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) { if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; } else { w = Math.round((w * maxDim) / h); h = maxDim; } }
    const c = document.createElement("canvas");
    const draw = (cw, ch) => { c.width = cw; c.height = ch; c.getContext("2d").drawImage(img, 0, 0, cw, ch); };
    draw(w, h);
    const toBlob = (q) => new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", q));
    const target = targetKB * 1024;

    let q = 0.82;
    let blob = await toBlob(q);
    while (blob && blob.size > target && q > minQuality) { q = Math.max(minQuality, q - 0.12); blob = await toBlob(q); }

    // Если всё ещё больше цели — уменьшаем разрешение шагами по 0.8 и снова жмём.
    let guard = 0;
    while (blob && blob.size > target && Math.max(c.width, c.height) > 700 && guard < 4) {
      draw(Math.round(c.width * 0.8), Math.round(c.height * 0.8));
      blob = await toBlob(Math.max(minQuality, q));
      guard++;
    }
    URL.revokeObjectURL(url);
    return blob || file;
  } catch (e) {
    return file;
  }
}
