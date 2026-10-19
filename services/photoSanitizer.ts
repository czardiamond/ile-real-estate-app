export const MAX_PROPERTY_PHOTO_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_PROPERTY_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_PROPERTY_PHOTO_PIXELS = 40_000_000;
export const MAX_PROPERTY_PHOTO_DIMENSION = 12_000;
export const ACCEPTED_PROPERTY_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedPropertyPhotoType = typeof ACCEPTED_PROPERTY_PHOTO_TYPES[number];

const ACCEPTED_TYPES = new Set<string>(ACCEPTED_PROPERTY_PHOTO_TYPES);

export class PhotoSanitizationError extends Error {
  constructor(message = 'This photo could not be safely processed. Choose a JPEG, PNG, or WebP image.') {
    super(message);
    this.name = 'PhotoSanitizationError';
  }
}

export function validatePropertyPhotoInput(file: Pick<File, 'type' | 'size'>): void {
  const type = file.type.trim().toLowerCase().split(';', 1)[0];
  if (!ACCEPTED_TYPES.has(type)) {
    throw new PhotoSanitizationError('Choose a JPEG, PNG, or WebP photo. AVIF, HEIC, GIF, and unsupported formats are not accepted.');
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_PROPERTY_PHOTO_INPUT_BYTES) {
    throw new PhotoSanitizationError('Each property photo must be under 10 MB.');
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new PhotoSanitizationError()), 'image/jpeg', 0.92);
  });
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof globalThis.createImageBitmap === 'function') {
    try {
      return await globalThis.createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to HTMLImageElement; both paths remain fail-closed.
    }
  }
  if (typeof Image === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    throw new PhotoSanitizationError('This browser cannot safely process photos.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new PhotoSanitizationError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode and draw the image into a new canvas, then return a metadata-free JPEG. */
export async function sanitizePropertyPhoto(file: File): Promise<File> {
  validatePropertyPhotoInput(file);
  const decoded = await decodeImage(file);
  const width = decoded.width;
  const height = decoded.height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > MAX_PROPERTY_PHOTO_DIMENSION || height > MAX_PROPERTY_PHOTO_DIMENSION ||
      width * height > MAX_PROPERTY_PHOTO_PIXELS) {
    if ('close' in decoded && typeof decoded.close === 'function') decoded.close();
    throw new PhotoSanitizationError('This photo is too large to process safely.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    if ('close' in decoded && typeof decoded.close === 'function') decoded.close();
    throw new PhotoSanitizationError('This browser cannot safely process photos.');
  }
  try {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    if (blob.type !== 'image/jpeg' || blob.size < 1 || blob.size > MAX_PROPERTY_PHOTO_BYTES) {
      throw new PhotoSanitizationError('The processed photo is invalid or too large.');
    }
    return new File([blob], `${file.name.replace(/\.[^.]*$/, '') || 'property-photo'}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    if (error instanceof PhotoSanitizationError) throw error;
    throw new PhotoSanitizationError();
  } finally {
    if ('close' in decoded && typeof decoded.close === 'function') decoded.close();
    canvas.width = 1;
    canvas.height = 1;
  }
}
