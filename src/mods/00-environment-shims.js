/* ===== Bayou Protocol mod: sandbox-safe environment shims ===== */
function __gp() {
  try {
    return navigator.getGamepads ? navigator.getGamepads() || [] : [];
  } catch (e) {
    return [];
  }
}
const __blobMap = new Map();
function __dataLoad(loader, A, i, B) {
  loader.manager.itemStart(A);
  setTimeout(() => {
    try {
      const meta = A.slice(5, A.indexOf(',')),
        raw = A.slice(A.indexOf(',') + 1),
        buf = /;base64/.test(meta) ? __b64buf(A) : new TextEncoder().encode(decodeURIComponent(raw)).buffer,
        rt = loader.responseType;
      let r;
      if (rt === 'arraybuffer') r = buf;
      else if (rt === 'blob') r = new Blob([buf], { type: meta.split(';')[0] });
      else {
        const s = new TextDecoder().decode(buf);
        r =
          rt === 'json'
            ? JSON.parse(s)
            : rt === 'document'
              ? new DOMParser().parseFromString(s, loader.mimeType || 'text/html')
              : s;
      }
      i && i(r);
    } catch (e) {
      (B && B(e), loader.manager.itemError(A));
    }
    loader.manager.itemEnd(A);
  }, 0);
}
function __bbFind(A) {
  if (typeof A != 'string' || !__blobMap.size) return null;
  let b = __blobMap.get(A);
  if (b) return [A, b];
  for (const [k, v] of __blobMap) if (A.endsWith(k)) return [k, v];
  return null;
}
function __blobToImg(blob, ok, err) {
  const fr = new FileReader();
  fr.onload = () => {
    const im = document.createElement('img');
    im.onload = () => ok(im);
    im.onerror = err;
    im.src = fr.result;
  };
  fr.onerror = err;
  fr.readAsDataURL(blob);
}
