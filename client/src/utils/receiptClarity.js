/**
 * Client-side receipt image processing + clarity check.
 *
 * 1. Resizes the photo (camera shots can be 12 MP+) to a manageable width so
 *    OCR on the server is fast and accurate, and produces a JPEG blob for upload.
 * 2. Runs a quick on-device quality check (Laplacian blur score + brightness)
 *    so we can warn the user *before* uploading when a receipt is too blurry
 *    or too dark to read.
 */

const MAX_DIMENSION = 1400;

// Experimental thresholds tuned for receipt text: Laplacian variance below
// ~40 usually means the image is out-of-focus; mean grayscale below ~35 is very dark.
const BLUR_THRESHOLD = 40;
const DARK_THRESHOLD = 35;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then(resolve)
        .catch(() => {
          // Fall back to <img> for formats ImageBitmap can't read
          loadViaImage(file).then(resolve).catch(reject);
        });
    } else {
      loadViaImage(file).then(resolve).catch(reject);
    }
  });

const loadViaImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unsupported image format. Please use JPG or PNG.'));
    };
    img.src = url;
  });

/**
 * Compute Laplacian variance (a standard blur metric) + mean brightness from
 * image pixel data. Lower Laplacian variance ⇒ blurrier image.
 */
const computeClarity = (imageData) => {
  const { data, width, height } = imageData;
  // 1) Grayscale
  const gray = new Uint8Array(width * height);
  let brightnessSum = 0;
  for (let i = 0; i < width * height; i += 1) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    brightnessSum += lum;
  }
  const meanBrightness = brightnessSum / gray.length;

  // 2) 3x3 Laplacian → measure how much local contrast (edges) exists
  let lapSum = 0;
  let lapSumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const center = gray[idx];
      const laplacian =
        -4 * center +
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - width] +
        gray[idx + width];
      lapSum += laplacian;
      lapSumSq += laplacian * laplacian;
      count += 1;
    }
  }
  const mean = lapSum / Math.max(1, count);
  const variance = lapSumSq / Math.max(1, count) - mean * mean;

  return { blurScore: Math.max(0, variance), brightness: meanBrightness };
};

const buildWarnings = (clarity) => {
  const warnings = [];
  if (clarity.blurScore > 0 && clarity.blurScore < BLUR_THRESHOLD) {
    warnings.push(
      'Receipt looks blurry — hold the camera steady, avoid zoom, and make sure the text is in focus.'
    );
  }
  if (clarity.brightness > 0 && clarity.brightness < DARK_THRESHOLD) {
    warnings.push('Receipt looks too dark — move to brighter lighting or turn the flash on.');
  }
  return warnings;
};

/**
 * Load + resize a receipt image and return everything the scanner needs.
 * @param {File} file
 * @returns {Promise<{ blob: Blob, previewUrl: string, clarity: {blurScore, brightness, warnings}, fileName: string }>}
 */
export const processReceiptImage = async (file) => {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const clarityRaw = computeClarity(imageData);
  const clarity = { ...clarityRaw, warnings: buildWarnings(clarityRaw) };

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the image'))), 'image/jpeg', 0.85)
  );

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    clarity,
    fileName: file.name || 'receipt.jpg',
  };
};