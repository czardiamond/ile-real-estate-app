#!/usr/bin/env node
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');
const projectIndex = args.indexOf('--project');
const projectId = projectIndex >= 0 ? args[projectIndex + 1] : (process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT);
const PRIVATE_COLLECTION = 'properties';
const PUBLIC_COLLECTION = 'public_listings';
const ALLOWED_STATUSES = new Map([
  ['available', 'Available'],
  ['under offer', 'Under Offer'],
  ['under_offer', 'Under Offer'],
  ['taken', 'Taken'],
]);
const ALLOWED_TYPES = new Set([
  'Apartment', 'House', 'Duplex', 'Bungalow', 'Land', 'Office Space', 'Shop / Plaza',
  'Warehouse', 'Container Space', 'Event Center', 'Wedding Hall', 'Open Field',
  'Party Venue', 'Short-let', 'Guest House', 'Other',
]);
const ALLOWED_PERIODS = new Set(['per year', 'per month', 'per day', 'total']);
const ALLOWED_FLOOD_RISK = new Set(['Not assessed', 'Dry Land (Low Risk)', 'Moderate Risk', 'Flood Prone (High Risk)']);
const ALLOWED_VERIFICATION_LEVELS = new Set(['NONE', 'IDENTITY_VERIFIED', 'BUSINESS_VERIFIED', 'DOCUMENT_REVIEWED', 'PHYSICALLY_INSPECTED']);
const ALLOWED_FEATURES = new Set([
  'POP Ceilings', 'Backup Generator', 'Swimming Pool', '24/7 Security', 'Water Heater',
  'Fitted Kitchen', 'Serviced', 'Prepaid Meter', 'CCTV', 'Inverter', 'Solar Powered', 'Ample Parking',
  'BQ', '24hrs Power', 'Walk-in Closet', 'Jacuzzi', 'Glass Display', 'Loading Bay', 'Conference Room',
  'Reception', 'Fire Alarm', 'Restroom', 'Changing Room', 'Stage', 'Lighting System', 'Sound System',
  'Projector', 'Vendor Area', 'Cooling System', 'Fenced', 'Gated', 'Dry Land', 'Survey Plan',
  'Corner Piece', 'Access Road',
]);

if (!projectId) {
  console.error('Set FIREBASE_PROJECT_ID or pass --project <project-id>.');
  process.exit(2);
}
if (applyChanges && projectId.startsWith('demo-')) {
  console.error('Refusing --apply against a demo project ID.');
  process.exit(2);
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);
let batch = db.batch();
let pendingWrites = 0;
const counts = {
  scannedProperties: 0,
  projectedListings: 0,
  normalizedPrivateProperties: 0,
  skippedProperties: 0,
  removedUnsafePublicListings: 0,
  orphanPublicListingsRemoved: 0,
  sanitizedPublicProfiles: 0,
  removedInvalidPublicProfiles: 0,
  convertedVerificationPaths: 0,
  skippedLegacyVerificationLinks: 0,
};

function text(value, maxLength, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
}

function numeric(value, max = 1_000_000_000_000_000) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 && result <= max ? result : undefined;
}

function toTimestamp(value) {
  if (value instanceof Timestamp) return value;
  if (value && typeof value.toDate === 'function') {
    const date = value.toDate();
    if (Number.isFinite(date.getTime())) return Timestamp.fromDate(date);
  }
  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return Timestamp.fromDate(date);
  }
  return Timestamp.now();
}

function safePublicAsset(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const candidate = value.trim();
  if (candidate === '/property-placeholder.svg') return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return null;
    const path = decodeURIComponent(url.pathname).toLowerCase();
    if (path.includes('/titles/') || path.includes('/verification/')) return null;
    return candidate;
  } catch {
    return null;
  }
}

function locationForPublic(source) {
  const location = source.location && typeof source.location === 'object' && !Array.isArray(source.location)
    ? source.location
    : {};
  const rawAddress = typeof source.location === 'string' ? source.location : '';
  const addressParts = rawAddress.split(',').map(item => item.trim()).filter(Boolean);
  const city = text(location.city, 100);
  const state = text(location.state, 100) || 'Lagos';
  // If the legacy record has only a full address, use a broad area component rather than publishing it verbatim.
  const inferredArea = addressParts.length > 1 ? addressParts[addressParts.length - 2] : '';
  const area = text(location.area, 150) || city || inferredArea || state || 'Location withheld';
  return { area, city, state };
}

function propertyType(value) {
  if (typeof value !== 'string') return 'Other';
  const exact = [...ALLOWED_TYPES].find(item => item.toLowerCase() === value.trim().toLowerCase());
  if (exact) return exact;
  const lower = value.toLowerCase();
  if (lower.includes('land')) return 'Land';
  if (lower.includes('apartment') || lower.includes('flat')) return 'Apartment';
  if (lower.includes('house')) return 'House';
  if (lower.includes('duplex')) return 'Duplex';
  if (lower.includes('bungalow')) return 'Bungalow';
  if (lower.includes('office')) return 'Office Space';
  if (lower.includes('shop') || lower.includes('plaza')) return 'Shop / Plaza';
  if (lower.includes('warehouse')) return 'Warehouse';
  if (lower.includes('short')) return 'Short-let';
  if (lower.includes('event') || lower.includes('hall')) return 'Event Center';
  return 'Other';
}

function publicProjection(id, source) {
  const status = ALLOWED_STATUSES.get(text(source.status, 40).toLowerCase());
  const title = text(source.title, 200);
  const ownerId = text(source.ownerId || source.agentId, 128);
  const price = numeric(source.price, 1_000_000_000_000_000);
  if (!status || !title || !ownerId || price === undefined || price <= 0) return null;

  const rawLocation = locationForPublic(source);
  const rawImages = Array.isArray(source.images) ? source.images : Array.isArray(source.imageUrls) ? source.imageUrls : [];
  const images = rawImages.slice(0, 5).map(safePublicAsset).filter(Boolean);
  if (images.length === 0) images.push('/property-placeholder.svg');

  const sourceSpecs = source.specs && typeof source.specs === 'object' ? source.specs : {};
  const specs = {};
  for (const key of ['bedrooms', 'bathrooms', 'capacity', 'parkingSpaces']) {
    const value = numeric(sourceSpecs[key], 1_000_000);
    if (value !== undefined) specs[key] = value;
  }
  const size = numeric(sourceSpecs.sizeSqM ?? sourceSpecs.square_meters, 1_000_000);
  if (size !== undefined) specs.sizeSqM = size;

  const features = Array.isArray(source.features)
    ? source.features.filter(value => typeof value === 'string' && ALLOWED_FEATURES.has(value)).slice(0, 5).map(value => text(value, 120))
    : [];
  const verificationStatus = ['Verified', 'Rejected', 'Pending'].includes(source.verificationStatus)
    ? source.verificationStatus
    : 'Pending';
  const isVerified = source.isVerified === true && verificationStatus === 'Verified';
  const projection = {
    agentId: ownerId,
    title,
    description: text(source.description, 5000),
    price,
    period: ALLOWED_PERIODS.has(source.period) ? source.period : 'total',
    location: rawLocation,
    type: propertyType(source.type || source.propertyType || source.category),
    status,
    specs,
    features,
    images,
    isVerified,
    verificationStatus,
    verificationLevel: isVerified && ALLOWED_VERIFICATION_LEVELS.has(source.verificationLevel) ? source.verificationLevel : (isVerified ? 'DOCUMENT_REVIEWED' : 'NONE'),
    floodRisk: ALLOWED_FLOOD_RISK.has(source.floodRisk) ? source.floodRisk : 'Not assessed',
    isSolarPowered: source.isSolarPowered === true,
    waterSource: ['Borehole', 'Water Board', 'Truck', 'Treatment Plant', 'Not specified'].includes(source.waterSource) ? source.waterSource : 'Not specified',
    createdAt: toTimestamp(source.createdAt),
    updatedAt: toTimestamp(source.updatedAt),
  };

  for (const [sourceKey, publicKey] of [
    ['videoUrl', 'videoUrl'],
    ['floorPlanUrl', 'floorPlanUrl'],
    ['virtualTourUrl', 'virtualTourUrl'],
  ]) {
    const url = safePublicAsset(source[sourceKey]);
    if (url) projection[publicKey] = url;
  }
  if (Array.isArray(source.floorPlanImages)) {
    const floorPlanImages = source.floorPlanImages.slice(0, 1).map(safePublicAsset).filter(Boolean);
    if (floorPlanImages.length) projection.floorPlanImages = floorPlanImages;
  }
  const powerHours = numeric(source.avgPowerHours, 24);
  if (powerHours !== undefined) projection.avgPowerHours = powerHours;
  return projection;
}

function privatePropertyNormalization(source, projection) {
  const sourceLocation = source.location && typeof source.location === 'object' && !Array.isArray(source.location)
    ? source.location
    : {};
  const rawAddress = typeof source.location === 'string'
    ? source.location
    : (sourceLocation.address || sourceLocation.area || '');
  const location = {
    address: text(rawAddress, 200),
    area: text(sourceLocation.area, 150) || projection.location.area,
    city: text(sourceLocation.city, 100),
    state: text(sourceLocation.state, 100) || projection.location.state,
  };
  const ownerId = projection.agentId;
  const patch = {
    ownerId,
    agentId: ownerId,
    title: projection.title,
    description: projection.description,
    price: projection.price,
    period: projection.period,
    location,
    type: projection.type,
    status: projection.status,
    specs: projection.specs,
    features: projection.features,
    images: projection.images,
    isVerified: projection.isVerified,
    verificationStatus: projection.verificationStatus,
    verificationLevel: projection.verificationLevel,
    floodRisk: projection.floodRisk,
    isSolarPowered: projection.isSolarPowered,
    waterSource: projection.waterSource,
    createdAt: projection.createdAt,
    updatedAt: projection.updatedAt,
  };

  for (const key of ['videoUrl', 'floorPlanUrl', 'floorPlanImages', 'virtualTourUrl', 'avgPowerHours']) {
    if (Object.hasOwn(projection, key)) patch[key] = projection[key];
    else if (Object.hasOwn(source, key)) patch[key] = FieldValue.delete();
  }

  const coordinates = source.coordinates;
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  if (coordinates && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    patch.coordinates = { lat, lng };
  } else if (Object.hasOwn(source, 'coordinates')) {
    patch.coordinates = FieldValue.delete();
  }

  if (typeof source.smartMeterId === 'string' && source.smartMeterId.length <= 128) {
    patch.smartMeterId = source.smartMeterId;
  } else if (Object.hasOwn(source, 'smartMeterId')) {
    patch.smartMeterId = FieldValue.delete();
  }
  return patch;
}

async function queueWrite(collectionName, id, operation, payload) {
  if (pendingWrites >= 400) {
    if (applyChanges) await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  }
  const ref = db.collection(collectionName).doc(id);
  if (applyChanges) {
    if (operation === 'delete') batch.delete(ref);
    else if (operation === 'update') batch.update(ref, payload);
    else batch.set(ref, payload);
    pendingWrites += 1;
  }
}

const privateSnapshot = await db.collection(PRIVATE_COLLECTION).get();
const privateIds = new Set(privateSnapshot.docs.map(document => document.id));
counts.scannedProperties = privateSnapshot.size;
for (const document of privateSnapshot.docs) {
  const publicData = publicProjection(document.id, document.data());
  if (!publicData) {
    counts.skippedProperties += 1;
    await queueWrite(PUBLIC_COLLECTION, document.id, 'delete');
    counts.removedUnsafePublicListings += 1;
    continue;
  }
  await queueWrite(PRIVATE_COLLECTION, document.id, 'update', privatePropertyNormalization(document.data(), publicData));
  counts.normalizedPrivateProperties += 1;
  await queueWrite(PUBLIC_COLLECTION, document.id, 'set', publicData);
  counts.projectedListings += 1;
}

const existingPublic = await db.collection(PUBLIC_COLLECTION).get();
for (const document of existingPublic.docs) {
  if (!privateIds.has(document.id)) {
    await queueWrite(PUBLIC_COLLECTION, document.id, 'delete');
    counts.orphanPublicListingsRemoved += 1;
  }
}

const publicProfiles = await db.collection('public_profiles').get();
for (const document of publicProfiles.docs) {
  const source = document.data();
  const name = text(source.name, 120);
  const role = ['Public', 'Agent', 'Brokerage'].includes(source.role) ? source.role : null;
  if (!name || !role) {
    await queueWrite('public_profiles', document.id, 'delete');
    counts.removedInvalidPublicProfiles += 1;
    continue;
  }
  const safeProfile = {
    id: document.id,
    name,
    role,
    agencyName: text(source.agencyName, 120),
    avatarUrl: safePublicAsset(source.avatarUrl) || '',
    updatedAt: toTimestamp(source.updatedAt),
  };
  const existingKeys = Object.keys(source).sort().join(',');
  const safeKeys = Object.keys(safeProfile).sort().join(',');
  if (existingKeys !== safeKeys || source.name !== safeProfile.name || source.agencyName !== safeProfile.agencyName || source.avatarUrl !== safeProfile.avatarUrl) {
    await queueWrite('public_profiles', document.id, 'set', safeProfile);
    counts.sanitizedPublicProfiles += 1;
  }
}

const verificationSnapshot = await db.collection('verifications').get();
for (const document of verificationSnapshot.docs) {
  const source = document.data();
  if (typeof source.storagePath === 'string' && source.storagePath.startsWith(`titles/${source.userId}/`) && source.documentUrl) {
    await queueWrite('verifications', document.id, 'update', { documentUrl: FieldValue.delete() });
    counts.convertedVerificationPaths += 1;
    continue;
  }
  if (source.storagePath || typeof source.documentUrl !== 'string') continue;
  let storagePath = '';
  try {
    const url = new URL(source.documentUrl);
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const marker = '/o/';
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex >= 0) storagePath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    }
  } catch {
    // Do not rewrite malformed or external links.
  }
  const userId = text(source.userId, 128);
  if (userId && storagePath.startsWith(`titles/${userId}/`) && !storagePath.includes('..') && storagePath.length <= 300) {
    await queueWrite('verifications', document.id, 'update', {
      storagePath,
      documentUrl: FieldValue.delete(),
    });
    counts.convertedVerificationPaths += 1;
  } else {
    counts.skippedLegacyVerificationLinks += 1;
  }
}

if (applyChanges && pendingWrites > 0) await batch.commit();
await app.delete();
console.log(JSON.stringify({ mode: applyChanges ? 'APPLY' : 'DRY RUN', projectId, ...counts }, null, 2));
if (!applyChanges) {
  console.log('No Firestore writes were performed. Review the counts, then obtain explicit approval before rerunning with --apply.');
}
