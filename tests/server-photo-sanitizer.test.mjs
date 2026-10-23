import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeServerPhoto } from '../api/listing-photos.ts';
import fixture from './fixtures/photo-metadata.json' with { type: 'json' };
import sharp from 'sharp';

const bytes = name => Buffer.from(fixture.find(item => item.name === name).data, 'base64');

test('accepts JPEG and strips private EXIF metadata on a fresh re-encode', async () => {
  const output = await sanitizeServerPhoto(bytes('private-test.jpeg'));
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.iptc, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.width, 48);
  assert.equal(metadata.height, 32);
});

test('rejects valid non-JPEG formats even when they contain image metadata', async () => {
  await assert.rejects(() => sanitizeServerPhoto(bytes('private-test.png')), /valid JPEG/);
  await assert.rejects(() => sanitizeServerPhoto(bytes('private-test.webp')), /valid JPEG/);
});

test('rejects malformed, empty, and oversized input bytes', async () => {
  await assert.rejects(() => sanitizeServerPhoto(Buffer.from('not an image')), /valid JPEG/);
  await assert.rejects(() => sanitizeServerPhoto(Buffer.alloc(0)), /under 3 MB/);
  await assert.rejects(() => sanitizeServerPhoto(Buffer.alloc(3 * 1024 * 1024 + 1)), /under 3 MB/);
});
