import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, createHmac } from 'node:crypto';
import { createPhotoUploadUrl, getR2Configuration, isOwnedListingPhotoKey, validatePhotoMetadata } from '../api/listing-photos.ts';

const validR2Environment = {
  R2_ACCOUNT_ID: '1234567890abcdef',
  R2_BUCKET_NAME: 'ile-listing-photos',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_PUBLIC_BASE_URL: 'https://images.example.com/',
};

test('accepts supported photo MIME types and normalizes the content type', () => {
  assert.deepEqual(validatePhotoMetadata('IMAGE/JPEG; charset=binary', 1024), {
    contentType: 'image/jpeg',
    size: 1024,
  });
  assert.equal(validatePhotoMetadata('image/webp', 10 * 1024 * 1024).size, 10 * 1024 * 1024);
});

test('rejects unsupported file types and invalid photo sizes', () => {
  assert.throws(() => validatePhotoMetadata('image/svg+xml', 1024), /JPEG, PNG, WebP, AVIF, or GIF/);
  assert.throws(() => validatePhotoMetadata('image/jpeg', 0), /under 10 MB/);
  assert.throws(() => validatePhotoMetadata('image/jpeg', 10 * 1024 * 1024 + 1), /under 10 MB/);
  assert.throws(() => validatePhotoMetadata('image/jpeg', '1024'), /under 10 MB/);
});

test('requires complete, HTTPS R2 configuration and normalizes the public base URL', () => {
  assert.equal(getR2Configuration({}), null);
  assert.deepEqual(getR2Configuration(validR2Environment), {
    accountId: '1234567890abcdef',
    jurisdiction: 'default',
    bucketName: 'ile-listing-photos',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    publicBaseUrl: 'https://images.example.com',
  });
  assert.equal(getR2Configuration({ ...validR2Environment, R2_PUBLIC_BASE_URL: 'http://images.example.com' }), null);
  assert.equal(getR2Configuration({ ...validR2Environment, R2_BUCKET_NAME: 'x' }), null);
  assert.equal(getR2Configuration({ ...validR2Environment, R2_JURISDICTION: 'unknown' }), null);
  assert.equal(getR2Configuration({ ...validR2Environment, R2_JURISDICTION: 'eu' })?.jurisdiction, 'eu');
});

test('allows cleanup only for generated photo keys belonging to the authenticated owner', () => {
  const uid = 'firebase-user_123';
  const ownKey = `listing-assets/${uid}/images/550e8400-e29b-41d4-a716-446655440000.jpg`;
  assert.equal(isOwnedListingPhotoKey(uid, ownKey), true);
  assert.equal(isOwnedListingPhotoKey('other-user', ownKey), false);
  assert.equal(isOwnedListingPhotoKey(uid, `listing-assets/${uid}/images/../../private.jpg`), false);
  assert.equal(isOwnedListingPhotoKey(uid, `listing-assets/${uid}/videos/550e8400-e29b-41d4-a716-446655440000.jpg`), false);
});

// Independent SigV4 recomputation: no fetch, SDK send(), credentials provider,
// Firebase authentication, or R2 request. All credentials below are dummy data.
function signatureFor(url, contentType, size, secret) {
  const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  const hash = text => createHash('sha256').update(text).digest('hex');
  const hmac = (key, text) => createHmac('sha256', key).update(text).digest();
  const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders');
  const headers = { host: url.host, 'content-type': contentType, 'content-length': String(size) };
  const canonicalHeaders = signedHeaders.split(';').map(name => `${name}:${headers[name]}\n`).join('');
  const query = [...url.searchParams].filter(([key]) => key !== 'X-Amz-Signature')
    .map(([key, value]) => `${encode(key)}=${encode(value)}`).sort().join('&');
  const canonical = ['PUT', url.pathname, query, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const [, date, region, service, terminator] = url.searchParams.get('X-Amz-Credential').split('/');
  const scope = [date, region, service, terminator].join('/');
  const toSign = ['AWS4-HMAC-SHA256', url.searchParams.get('X-Amz-Date'), scope, hash(canonical)].join('\n');
  const key = [date, region, service, terminator].reduce((key, value) => hmac(key, value), `AWS4${secret}`);
  return createHmac('sha256', key).update(toSign).digest('hex');
}

test('non-empty photo presigns omit synthetic checksum parameters for every allowed MIME type', async () => {
  const config = getR2Configuration(validR2Environment);
  for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']) {
    const url = new URL(await createPhotoUploadUrl(config, 'listing-assets/test/images/photo.jpg', contentType, 1024));
    assert.equal(url.searchParams.get('X-Amz-Content-Sha256'), 'UNSIGNED-PAYLOAD');
    assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
    assert.deepEqual([...url.searchParams.keys()].filter(key => /checksum/i.test(key)), []);
    assert.ok(url.searchParams.get('X-Amz-SignedHeaders').split(';').includes('content-length'));
  }
});

test('presigned Content-Type and byte length are cryptographically bound; tampering changes the signature', async () => {
  const config = getR2Configuration(validR2Environment);
  const url = new URL(await createPhotoUploadUrl(config, 'listing-assets/test/images/photo.jpg', 'IMAGE/JPEG; charset=binary', 1024));
  assert.ok(url.searchParams.get('X-Amz-SignedHeaders').split(';').includes('content-type'));
  const signature = url.searchParams.get('X-Amz-Signature');
  assert.equal(signatureFor(url, 'image/jpeg', 1024, config.secretAccessKey), signature);
  assert.notEqual(signatureFor(url, 'text/html', 1024, config.secretAccessKey), signature);
  assert.notEqual(signatureFor(url, 'image/png', 1024, config.secretAccessKey), signature);
  assert.notEqual(signatureFor(url, 'image/jpeg', 1025, config.secretAccessKey), signature);
});

test('production presigner rejects unsupported types and empty or oversized bodies before signing', async () => {
  const config = getR2Configuration(validR2Environment);
  await assert.rejects(createPhotoUploadUrl(config, 'photo.jpg', 'text/html', 1024), /JPEG, PNG, WebP, AVIF, or GIF/);
  await assert.rejects(createPhotoUploadUrl(config, 'photo.jpg', 'image/jpeg', 0), /under 10 MB/);
  await assert.rejects(createPhotoUploadUrl(config, 'photo.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1), /under 10 MB/);
});
