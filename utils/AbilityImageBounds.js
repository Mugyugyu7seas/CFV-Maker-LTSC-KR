/** Cache per decoded image and canvas size. Never scan on each keystroke. */
const imageBoundsCache = new WeakMap();

export function sameAbilityImageBounds(a, b) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.top === b.top && a.bottom === b.bottom &&
    a.canvasWidth === b.canvasWidth && a.canvasHeight === b.canvasHeight;
}

/** Find the first/last nontransparent rows, including antialiased borders. */
export function findAbilityAlphaBounds(imageData) {
  const { data, width, height } = imageData || {};
  if (!data || !Number.isInteger(width) || !Number.isInteger(height) ||
      width <= 0 || height <= 0 || data.length < width * height * 4) return null;
  const occupied = (y) => {
    const end = (y + 1) * width * 4;
    for (let i = y * width * 4 + 3; i < end; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  };
  let top = 0;
  while (top < height && !occupied(top)) top++;
  if (top === height) return null;
  let bottom = height;
  while (bottom > top && !occupied(bottom - 1)) bottom--;
  return { top, bottom, canvasWidth: width, canvasHeight: height };
}

/** Read the shape at its logical display size, before tint/opacity filters. */
export function measureAbilityImageBounds(image, width, height) {
  if (!image || typeof image !== 'object' || typeof document === 'undefined' ||
      !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const canvasWidth = Math.ceil(width);
  const canvasHeight = Math.ceil(height);
  const key = `${canvasWidth}x${canvasHeight}`;
  let cached = imageBoundsCache.get(image);
  if (cached?.has(key)) return cached.get(key);
  if (!cached) {
    cached = new Map();
    imageBoundsCache.set(image, cached);
  }
  let bounds = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
      bounds = findAbilityAlphaBounds(context.getImageData(0, 0, canvasWidth, canvasHeight));
    }
  } catch (error) {
    // A cross-origin/unreadable asset must not break the editor. The layout
    // continues with its documented estimate; log once for this image/size.
    console.warn('[Ability layout] Background bounds could not be read; using estimated bounds.', error);
  }
  cached.set(key, bounds);
  return bounds;
}
