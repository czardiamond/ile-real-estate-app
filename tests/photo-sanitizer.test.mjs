import assert from 'node:assert/strict';
import test from 'node:test';
import { PhotoSanitizationError, sanitizePropertyPhoto, validatePropertyPhotoInput } from '../services/photoSanitizer.ts';

test('accepts only JPEG, PNG, and WebP inputs within the size limit', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.doesNotThrow(() => validatePropertyPhotoInput({ type, size: 1024 }));
  }
  assert.doesNotThrow(() => validatePropertyPhotoInput({ type: 'IMAGE/PNG; charset=binary', size: 10 * 1024 * 1024 }));
});

test('fails closed for AVIF, HEIC, GIF, spoofed MIME, empty, and oversized inputs', () => {
  for (const type of ['image/avif', 'image/heic', 'image/heif', 'image/gif', 'application/octet-stream', '', 'IMAGE/SVG+XML']) {
    assert.throws(() => validatePropertyPhotoInput({ type, size: 1024 }), PhotoSanitizationError);
  }
  assert.throws(() => validatePropertyPhotoInput({ type: 'image/jpeg', size: 0 }), /under 10 MB/);
  assert.throws(() => validatePropertyPhotoInput({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }), /under 10 MB/);
  assert.throws(() => validatePropertyPhotoInput({ type: 'image/jpeg', size: 1.5 }), PhotoSanitizationError);
});

test('decodes and re-encodes through canvas as a JPEG', async () => {
  const originalBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  let drawn = false;
  const bitmap = { width: 640, height: 480, close() {} };
  globalThis.createImageBitmap = async () => bitmap;
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillRect: () => {}, drawImage: () => { drawn = true; } }),
      toBlob: callback => callback(new Blob(['re-encoded'], { type: 'image/jpeg' })),
    }),
  };
  try {
    const output = await sanitizePropertyPhoto(new File(['input'], 'listing.png', { type: 'image/png' }));
    assert.equal(output.type, 'image/jpeg');
    assert.equal(output.name, 'listing.jpg');
    assert.equal(await output.text(), 're-encoded');
    assert.equal(drawn, true);
  } finally {
    globalThis.createImageBitmap = originalBitmap;
    globalThis.document = originalDocument;
  }
});

test('rejects when browser decoding fails', async () => {
  const originalBitmap = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => { throw new Error('invalid image'); };
  try {
    await assert.rejects(
      sanitizePropertyPhoto(new File(['not-an-image'], 'listing.webp', { type: 'image/webp' })),
      PhotoSanitizationError,
    );
  } finally {
    globalThis.createImageBitmap = originalBitmap;
  }
});
