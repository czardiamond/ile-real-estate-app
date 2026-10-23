import assert from 'node:assert/strict';
import test from 'node:test';
import { getR2Configuration, isOwnedListingPhotoKey, MAX_PHOTO_BYTES } from '../api/listing-photos.ts';

const validR2Environment = {
  R2_ACCOUNT_ID: '1234567890abcdef', R2_BUCKET_NAME: 'ile-listing-photos', R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key', R2_PUBLIC_BASE_URL: 'https://images.example.com/',
};

test('requires complete, HTTPS R2 configuration and normalizes the public base URL', () => {
  assert.equal(getR2Configuration({}), null);
  assert.deepEqual(getR2Configuration(validR2Environment), { accountId: '1234567890abcdef', jurisdiction: 'default', bucketName: 'ile-listing-photos', accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key', publicBaseUrl: 'https://images.example.com' });
  assert.equal(getR2Configuration({ ...validR2Environment, R2_PUBLIC_BASE_URL: 'http://images.example.com' }), null);
  assert.equal(getR2Configuration({ ...validR2Environment, R2_BUCKET_NAME: 'x' }), null);
  assert.equal(getR2Configuration({ ...validR2Environment, R2_JURISDICTION: 'unknown' }), null);
});

test('allows cleanup for generated current and legacy photo extensions only', () => {
  const uid = 'firebase-user_123';
  for (const extension of ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']) assert.equal(isOwnedListingPhotoKey(uid, `listing-assets/${uid}/images/550e8400-e29b-41d4-a716-446655440000.${extension}`), true);
  assert.equal(isOwnedListingPhotoKey('other-user', `listing-assets/${uid}/images/550e8400-e29b-41d4-a716-446655440000.jpg`), false);
  assert.equal(isOwnedListingPhotoKey(uid, `listing-assets/${uid}/images/../../private.jpg`), false);
  assert.equal(isOwnedListingPhotoKey(uid, `listing-assets/${uid}/images/550e8400-e29b-41d4-a716-446655440000.svg`), false);
});

test('server upload limit is 3 MiB and never accepts empty data', () => assert.equal(MAX_PHOTO_BYTES, 3 * 1024 * 1024));
