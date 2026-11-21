// Awtomatikong pinaliliit ang malalaking litrato (halimbawa galing sa phone) bago i-upload.
// Ang backend ay tumatanggap lang ng hanggang 1MB, kaya dito natin sinisiguro na pasok ang file.

const MAX_BYTES = 950 * 1024; // may kaunting palugit sa 1MB na limit ng server
const MAX_DIMENSION = 1600;   // sapat ang linaw para sa equipment card at detail page
const MIN_QUALITY = 0.5;

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // babagsak sa Image() sa ibaba
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unable to read this image.')); };
    img.src = url;
  });
}

function toBlob(canvas, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Ibinabalik ang File na hindi lalagpas sa ~950KB.
 * - Kung pasok na ang orihinal, hindi ito ginagalaw (walang nawawalang quality).
 * - Kung lalagpas, ginagawang JPEG at pinaliliit hanggang pumasok.
 * Nagtatapon ng Error kung hindi mabasa o hindi mapaliit ang image.
 */
export async function compressImage(file) {
  if (file.size <= MAX_BYTES) return file;

  const bitmap = await loadBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;

  let scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  let result = null;

  for (let attempt = 0; attempt < 6 && !result; attempt += 1) {
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Puting background para hindi maging itim ang transparent na parte ng PNG/WEBP.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    for (let quality = 0.85; quality >= MIN_QUALITY - 0.001; quality -= 0.1) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_BYTES) {
        result = blob;
        break;
      }
    }

    scale *= 0.8;
  }

  if (typeof bitmap.close === 'function') bitmap.close();

  if (!result) {
    throw new Error('Unable to reduce this image enough. Please choose a smaller photo.');
  }

  const baseName = (file.name || 'equipment').replace(/\.[^.]+$/, '');
  return new File([result], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
