import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Evaluate only the actual pure projection, not the Firebase-backed service module.
// No Auth initialization, database reads/writes, network, or copied projection logic.
const source = readFileSync(new URL('../src/services/propertyService.ts', import.meta.url), 'utf8');
const projection = source.match(/const toPublicListing = \(privateData: Record<string, any>\) => \{[\s\S]*?\n\};/)?.[0];
assert.ok(projection, 'The production public projection must remain inspectable for this privacy regression');
const compiled = ts.transpileModule(`${projection}\ntoPublicListing;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const toPublicListing = vm.runInNewContext(compiled, {
  PUBLIC_PROJECTION_VERSION: 1,
  VerificationStatus: { PENDING: 'PENDING' },
  FloodRisk: { UNASSESSED: 'UNASSESSED' },
});

test('public projection never exposes exact coordinates, street addresses, title documents or owner-only data', () => {
  const data = toPublicListing({
    agentId: 'public-agent', title: 'Synthetic listing', price: 100,
    coordinates: { lat: 6.451234567, lng: 3.461234567 },
    location: { area: 'Neighbourhood', city: 'Lagos', state: 'Lagos', address: 'PRIVATE_STREET_ADDRESS' },
    ownerId: 'PRIVATE_OWNER', titleDocuments: ['PRIVATE_TITLE_DOCUMENT'],
    titleDocumentUrl: 'PRIVATE_DOCUMENT_URL', contactPhone: 'PRIVATE_PHONE',
    images: ['/synthetic-image.jpg'], description: 'Public description',
  });
  const serialized = JSON.stringify(data);
  for (const key of ['coordinates', 'ownerId', 'titleDocuments', 'titleDocumentUrl', 'contactPhone']) {
    assert.equal(Object.hasOwn(data, key), false, `${key} must remain private`);
  }
  assert.equal(Object.hasOwn(data.location, 'address'), false);
  assert.doesNotMatch(serialized, /PRIVATE_|6\.451234567|3\.461234567/);
  assert.equal(data.location.area, 'Neighbourhood');
  assert.equal(data.images[0], '/synthetic-image.jpg');
});
