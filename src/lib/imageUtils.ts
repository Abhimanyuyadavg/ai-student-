export interface CompressedImageResult {
  dataUrl: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  fileName: string;
}

const ALLOWED_MIME_SET = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXT_RE = /\.(jpe?g|png|webp)$/i;

export function isSupportedImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_MIME_SET.has(mime)) return true;
  return ALLOWED_EXT_RE.test(file.name || '');
}

function estimateBase64Bytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(',');
  if (idx < 0) return 0;
  const b64 = dataUrl.slice(idx + 1);
  return Math.floor((b64.length * 3) / 4);
}

export async function validateAndCompressImageFile(
  file: File,
  options?: {
    maxDimension?: number;
    maxBytes?: number;
    initialQuality?: number;
  }
): Promise<CompressedImageResult> {
  if (!isSupportedImageFile(file)) {
    throw new Error('Unsupported file format. Please choose a JPG, JPEG, PNG, or WEBP image.');
  }
  if (file.size === 0) {
    throw new Error('The selected image file is empty. Please choose a valid photo.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image file is too large (max 15 MB before compression). Please pick a smaller file.');
  }

  const maxDimension = options?.maxDimension ?? 1600;
  const maxBytes = options?.maxBytes ?? 1_200_000;
  const initialQuality = options?.initialQuality ?? 0.86;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the selected image file.'));
    };
    reader.onerror = () => reject(new Error('Failed to read the image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid or corrupted image file. Please try another photo.'));
    el.src = rawDataUrl;
  });

  const origW = img.naturalWidth || img.width || 1;
  const origH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxDimension / Math.max(origW, origH));
  let targetW = Math.max(1, Math.round(origW * scale));
  let targetH = Math.max(1, Math.round(origH * scale));

  // If raw file is already PNG/JPEG/WEBP, within dimensions & size ceiling, keep crisp original
  const rawMime = (file.type || '').toLowerCase() === 'image/png'
    ? 'image/png'
    : (file.type || '').toLowerCase() === 'image/webp'
    ? 'image/webp'
    : 'image/jpeg';

  if (scale === 1 && estimateBase64Bytes(rawDataUrl) <= maxBytes) {
    return {
      dataUrl: rawDataUrl,
      mimeType: rawMime,
      width: origW,
      height: origH,
      originalSize: file.size,
      compressedSize: estimateBase64Bytes(rawDataUrl),
      fileName: file.name || 'image.png',
    };
  }

  // Draw to canvas and encode adaptively within maxBytes
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas unavailable for image processing.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Preserve PNG transparency/crispness if PNG fits, otherwise encode crisp JPEG/WEBP
  let chosenMime: 'image/jpeg' | 'image/png' | 'image/webp' =
    rawMime === 'image/png' ? 'image/png' : rawMime === 'image/webp' ? 'image/webp' : 'image/jpeg';

  let outUrl = canvas.toDataURL(chosenMime, initialQuality);
  let outBytes = estimateBase64Bytes(outUrl);

  if (outBytes > maxBytes && chosenMime === 'image/png') {
    chosenMime = 'image/jpeg';
    outUrl = canvas.toDataURL(chosenMime, initialQuality);
    outBytes = estimateBase64Bytes(outUrl);
  }

  let quality = initialQuality;
  while (outBytes > maxBytes && quality > 0.45) {
    quality -= 0.1;
    outUrl = canvas.toDataURL(chosenMime, quality);
    outBytes = estimateBase64Bytes(outUrl);
  }

  if (outBytes > maxBytes) {
    targetW = Math.max(320, Math.round(targetW * 0.72));
    targetH = Math.max(320, Math.round(targetH * 0.72));
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    outUrl = canvas.toDataURL('image/jpeg', 0.76);
    outBytes = estimateBase64Bytes(outUrl);
    chosenMime = 'image/jpeg';
  }

  if (outBytes > maxBytes) {
    throw new Error('Processed image is still too large. Please pick a clearer, smaller crop.');
  }

  return {
    dataUrl: outUrl,
    mimeType: chosenMime,
    width: targetW,
    height: targetH,
    originalSize: file.size,
    compressedSize: outBytes,
    fileName: file.name || 'photo.jpg',
  };
}
