// src/services/propertyService.ts
import { db, auth } from './firebaseConfig';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Property as FullProperty, PropertyType, ListingStatus, FloodRisk, VerificationStatus } from '../../types';

export type Property = FullProperty;

export interface PropertyFilters {
  location?: string;
  propertyType?: string;
  maxPrice?: number;
  minPrice?: number;
}

const PROPERTIES_COLLECTION = 'properties';
const PUBLIC_LISTINGS_COLLECTION = 'public_listings';
const PUBLIC_LISTING_STATUSES = Object.values(ListingStatus);
const MAX_PRICE = 1_000_000_000_000_000;
const ALLOWED_PERIODS = new Set(['per year', 'per month', 'per day', 'total']);
const ALLOWED_WATER_SOURCES = new Set(['Borehole', 'Water Board', 'Truck', 'Treatment Plant', 'Not specified']);
const ALLOWED_FEATURES = new Set([
  'POP Ceilings', 'Backup Generator', 'Swimming Pool', '24/7 Security', 'Water Heater',
  'Fitted Kitchen', 'Serviced', 'Prepaid Meter', 'CCTV', 'Inverter', 'Solar Powered', 'Ample Parking',
  'BQ', '24hrs Power', 'Walk-in Closet', 'Jacuzzi', 'Glass Display', 'Loading Bay', 'Conference Room',
  'Reception', 'Fire Alarm', 'Restroom', 'Changing Room', 'Stage', 'Lighting System', 'Sound System',
  'Projector', 'Vendor Area', 'Cooling System', 'Fenced', 'Gated', 'Dry Land', 'Survey Plan',
  'Corner Piece', 'Access Road',
]);

const asBoundedText = (value: unknown, field: string, maxLength: number, required = false): string => {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  const result = value.trim();
  if (result.length > maxLength || (required && !result)) throw new Error(`${field} is invalid.`);
  return result;
};

const asSafeUrl = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const candidate = asBoundedText(value, field, 2048, true);
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${field} must be an absolute HTTPS URL.`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${field} must be an absolute HTTPS URL.`);
  return candidate;
};

const normalizePropertyType = (value: unknown): PropertyType => {
  const raw = typeof value === 'string' ? value.trim() : '';
  const exact = Object.values(PropertyType).find(type => type.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const lower = raw.toLowerCase();
  if (lower.includes('land')) return PropertyType.LAND;
  if (lower.includes('apartment') || lower.includes('flat')) return PropertyType.APARTMENT;
  if (lower.includes('duplex')) return PropertyType.DUPLEX;
  if (lower.includes('bungalow')) return PropertyType.BUNGALOW;
  if (lower.includes('office')) return PropertyType.OFFICE;
  if (lower.includes('shop') || lower.includes('plaza')) return PropertyType.SHOP;
  if (lower.includes('warehouse')) return PropertyType.WAREHOUSE;
  if (lower.includes('short') || lower.includes('stay')) return PropertyType.SHORT_LET;
  if (lower.includes('event') || lower.includes('hall') || lower.includes('owambe')) return PropertyType.EVENT_CENTER;
  return PropertyType.OTHER;
};

const normalizeLocation = (value: unknown): { address: string; area: string; city: string; state: string } => {
  if (typeof value === 'string') {
    const parts = value.split(',').map(part => part.trim()).filter(Boolean);
    const city = parts.length > 1 ? parts[parts.length - 1] : '';
    const area = parts.length > 1 ? parts[parts.length - 2] : 'Location withheld';
    return { address: value.trim(), area, city, state: city || 'Lagos' };
  }
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const area = asBoundedText(source.area, 'location.area', 150) || asBoundedText(source.address, 'location.address', 200) || 'Unknown area';
  return {
    address: asBoundedText(source.address, 'location.address', 200) || area,
    area,
    city: asBoundedText(source.city, 'location.city', 100),
    state: asBoundedText(source.state, 'location.state', 100) || 'Lagos',
  };
};

const normalizeSpecs = (value: unknown): Record<string, number> => {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const aliases: Array<[string, string]> = [['sizeSqM', 'square_meters']];
  const result: Record<string, number> = {};
  for (const key of ['bedrooms', 'bathrooms', 'sizeSqM', 'capacity', 'parkingSpaces']) {
    const alias = aliases.find(([target]) => target === key)?.[1];
    const raw = source[key] ?? (alias ? source[alias] : undefined);
    if (raw === undefined || raw === null || raw === '') continue;
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0 || number > 1_000_000) throw new Error(`specs.${key} is invalid.`);
    result[key] = number;
  }
  return result;
};

const normalizeStringList = (value: unknown, field: string, maxItems: number, maxLength: number): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${field} is invalid.`);
  return value.map((item, index) => asBoundedText(item, `${field}[${index}]`, maxLength, true));
};

const normalizeCoordinates = (value: unknown): { lat: number; lng: number } | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('coordinates are invalid.');
  const source = value as Record<string, unknown>;
  const lat = Number(source.lat);
  const lng = Number(source.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('coordinates are invalid.');
  }
  return { lat, lng };
};

const buildPrivateProperty = (propertyData: Record<string, unknown>, ownerId: string) => {
  const title = asBoundedText(propertyData.title, 'title', 200, true);
  const description = asBoundedText(propertyData.description, 'description', 5000);
  const price = Number(propertyData.price);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) throw new Error('price is invalid.');

  const period = typeof propertyData.period === 'string' && ALLOWED_PERIODS.has(propertyData.period)
    ? propertyData.period
    : 'total';
  const imageInput = propertyData.images ?? propertyData.imageUrls ?? [];
  const images = normalizeStringList(imageInput, 'images', 5, 2048).map((image, index) =>
    image === '/property-placeholder.svg' ? image : asSafeUrl(image, `images[${index}]`)!,
  );
  if (images.length === 0) images.push('/property-placeholder.svg');
  const features = normalizeStringList(propertyData.features, 'features', 10, 120)
    .filter(feature => ALLOWED_FEATURES.has(feature))
    .slice(0, 5);
  const location = normalizeLocation(propertyData.location);
  const specs = normalizeSpecs(propertyData.specs ?? propertyData.specifications);
  const coordinates = normalizeCoordinates(propertyData.coordinates);
  const floodRisk = Object.values(FloodRisk).includes(propertyData.floodRisk as FloodRisk)
    ? propertyData.floodRisk as FloodRisk
    : FloodRisk.UNASSESSED;
  const avgPowerHours = propertyData.avgPowerHours === undefined || propertyData.avgPowerHours === null || propertyData.avgPowerHours === ''
    ? undefined
    : Number(propertyData.avgPowerHours);
  if (avgPowerHours !== undefined && (!Number.isFinite(avgPowerHours) || avgPowerHours < 0 || avgPowerHours > 24)) {
    throw new Error('avgPowerHours must be between 0 and 24.');
  }
  const waterSource = typeof propertyData.waterSource === 'string' && ALLOWED_WATER_SOURCES.has(propertyData.waterSource)
    ? propertyData.waterSource
    : 'Not specified';

  const privateData: Record<string, unknown> = {
    ownerId,
    agentId: ownerId,
    title,
    description,
    price,
    period,
    location,
    type: normalizePropertyType(propertyData.type ?? propertyData.propertyType ?? propertyData.category),
    status: ListingStatus.AVAILABLE,
    specs,
    features,
    images,
    isVerified: false,
    verificationStatus: VerificationStatus.PENDING,
    verificationLevel: 'NONE',
    floodRisk,
    isSolarPowered: propertyData.isSolarPowered === true,
    waterSource,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const videoUrl = asSafeUrl(propertyData.videoUrl, 'videoUrl');
  const floorPlanUrl = asSafeUrl(propertyData.floorPlanUrl, 'floorPlanUrl');
  const virtualTourUrl = asSafeUrl(propertyData.virtualTourUrl, 'virtualTourUrl');
  const floorPlanImages = normalizeStringList(propertyData.floorPlanImages, 'floorPlanImages', 1, 2048).map((image, index) =>
    asSafeUrl(image, `floorPlanImages[${index}]`)!,
  );
  if (videoUrl) privateData.videoUrl = videoUrl;
  if (floorPlanUrl) privateData.floorPlanUrl = floorPlanUrl;
  if (virtualTourUrl) privateData.virtualTourUrl = virtualTourUrl;
  if (floorPlanImages.length) privateData.floorPlanImages = floorPlanImages;
  if (coordinates) privateData.coordinates = coordinates;
  if (avgPowerHours !== undefined) privateData.avgPowerHours = avgPowerHours;
  if (typeof propertyData.smartMeterId === 'string' && propertyData.smartMeterId.trim()) {
    privateData.smartMeterId = asBoundedText(propertyData.smartMeterId, 'smartMeterId', 200);
  }
  return privateData;
};

const toPublicListing = (privateData: Record<string, any>) => {
  const location = privateData.location || {};
  const publicData: Record<string, any> = {
    agentId: privateData.agentId,
    title: privateData.title,
    description: privateData.description,
    price: privateData.price,
    period: privateData.period,
    location: {
      area: location.area,
      city: location.city || '',
      state: location.state,
    },
    type: privateData.type,
    status: privateData.status,
    specs: privateData.specs || {},
    features: privateData.features || [],
    images: privateData.images || [],
    isVerified: privateData.isVerified === true,
    verificationStatus: privateData.verificationStatus || VerificationStatus.PENDING,
    verificationLevel: privateData.verificationLevel || 'NONE',
    floodRisk: privateData.floodRisk || FloodRisk.UNASSESSED,
    isSolarPowered: privateData.isSolarPowered === true,
    waterSource: privateData.waterSource || 'Not specified',
    createdAt: privateData.createdAt,
    updatedAt: privateData.updatedAt,
  };
  for (const field of ['videoUrl', 'floorPlanUrl', 'floorPlanImages', 'virtualTourUrl', 'avgPowerHours']) {
    if (privateData[field] !== undefined) publicData[field] = privateData[field];
  }
  return publicData;
};

export const normalizeProperty = (id: string, data: any): FullProperty => {
  const location = data.location && typeof data.location === 'object' ? data.location : {};
  const area = typeof location.area === 'string' && location.area ? location.area : 'Unknown area';
  const images: string[] = Array.isArray(data.images) && data.images.length > 0
    ? data.images
    : Array.isArray(data.imageUrls) && data.imageUrls.length > 0
      ? data.imageUrls
      : ['/property-placeholder.svg'];
  const rawSpecs = data.specs && typeof data.specs === 'object' ? data.specs : {};
  const specs = {
    bedrooms: rawSpecs.bedrooms,
    bathrooms: rawSpecs.bathrooms,
    sizeSqM: rawSpecs.sizeSqM ?? rawSpecs.square_meters,
    capacity: rawSpecs.capacity,
    parkingSpaces: rawSpecs.parkingSpaces,
  };
  const verified = data.isVerified === true && data.verificationStatus === VerificationStatus.VERIFIED;
  const status = Object.values(ListingStatus).find(item => item.toLowerCase() === String(data.status || '').toLowerCase()) || ListingStatus.AVAILABLE;
  const type = normalizePropertyType(data.type ?? data.propertyType ?? data.category);

  return {
    id,
    title: typeof data.title === 'string' ? data.title : 'Property Listing',
    description: typeof data.description === 'string' ? data.description : '',
    location: {
      // Public listing documents intentionally contain only the neighbourhood, not a street address.
      address: typeof location.address === 'string' ? location.address : area,
      area,
      city: typeof location.city === 'string' ? location.city : '',
      state: typeof location.state === 'string' ? location.state : '',
    },
    price: Number(data.price) || 0,
    period: ALLOWED_PERIODS.has(data.period) ? data.period : undefined,
    type,
    status,
    specs,
    features: Array.isArray(data.features) ? data.features : [],
    images,
    videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : undefined,
    floorPlanUrl: typeof data.floorPlanUrl === 'string' ? data.floorPlanUrl : undefined,
    floorPlanImages: Array.isArray(data.floorPlanImages) ? data.floorPlanImages : (data.floorPlanUrl ? [data.floorPlanUrl] : []),
    agentId: typeof data.agentId === 'string' ? data.agentId : '',
    isVerified: verified,
    verificationLevel: verified ? (data.verificationLevel || 'NONE') : 'NONE',
    titleDocument: undefined,
    floodRisk: data.floodRisk || FloodRisk.UNASSESSED,
    avgPowerHours: data.avgPowerHours !== undefined && data.avgPowerHours !== null && Number.isFinite(Number(data.avgPowerHours)) ? Number(data.avgPowerHours) : undefined,
    isSolarPowered: data.isSolarPowered === true,
    waterSource: data.waterSource || 'Not specified',
    escrowEnabled: false,
    depositEscrowEnabled: false,
    coordinates: normalizeCoordinates(data.coordinates),
    virtualTourUrl: typeof data.virtualTourUrl === 'string' ? data.virtualTourUrl : undefined,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : ''),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
  };
};

const publicPropertiesQuery = () => query(
  collection(db, PUBLIC_LISTINGS_COLLECTION),
  where('status', 'in', PUBLIC_LISTING_STATUSES),
  orderBy('createdAt', 'desc'),
);

export const createProperty = async (propertyData: any): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to create a property.');
  if (!propertyData || typeof propertyData !== 'object' || Array.isArray(propertyData)) {
    throw new Error('Listing data is invalid.');
  }
  if ((propertyData.ownerId && propertyData.ownerId !== user.uid) || (propertyData.agentId && propertyData.agentId !== user.uid)) {
    throw new Error('You can only publish listings under your own account.');
  }

  const privateData = buildPrivateProperty(propertyData, user.uid);
  const propertyRef = doc(collection(db, PROPERTIES_COLLECTION));
  const publicRef = doc(db, PUBLIC_LISTINGS_COLLECTION, propertyRef.id);
  const batch = writeBatch(db);
  batch.set(propertyRef, privateData);
  batch.set(publicRef, toPublicListing(privateData));
  await batch.commit();
  return propertyRef.id;
};

async function updateOwnedProperty(propertyId: string, updates: Record<string, unknown>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to update a listing.');
  const privateRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const publicRef = doc(db, PUBLIC_LISTINGS_COLLECTION, propertyId);
  const snapshot = await getDoc(privateRef);
  if (!snapshot.exists() || snapshot.data().ownerId !== user.uid) {
    throw new Error('You do not have permission to update this listing.');
  }
  const currentData = snapshot.data();
  const nextData = { ...currentData, ...updates };
  const batch = writeBatch(db);
  batch.update(privateRef, { ...updates, updatedAt: serverTimestamp() });
  batch.set(publicRef, toPublicListing({ ...nextData, updatedAt: serverTimestamp() }));
  await batch.commit();
}

export const updateListingStatus = async (propertyId: string, status: ListingStatus): Promise<void> => {
  if (!PUBLIC_LISTING_STATUSES.includes(status)) throw new Error('Listing status is invalid.');
  await updateOwnedProperty(propertyId, { status });
};

export const getProperties = async (filters?: PropertyFilters): Promise<FullProperty[]> => {
  const querySnapshot = await getDocs(publicPropertiesQuery());
  let properties = querySnapshot.docs.map(snapshot => normalizeProperty(snapshot.id, snapshot.data()));
  if (filters?.propertyType && filters.propertyType !== 'all') {
    properties = properties.filter(property => property.type === filters.propertyType);
  }
  if (filters?.maxPrice !== undefined) properties = properties.filter(property => property.price <= filters.maxPrice!);
  if (filters?.minPrice !== undefined) properties = properties.filter(property => property.price >= filters.minPrice!);
  return properties;
};

export const getPropertyById = async (propertyId: string): Promise<FullProperty | null> => {
  const snapshot = await getDoc(doc(db, PUBLIC_LISTINGS_COLLECTION, propertyId));
  return snapshot.exists() ? normalizeProperty(snapshot.id, snapshot.data()) : null;
};

export const verifyProperty = async (
  propertyId: string,
  isVerifiedOrStatus: boolean | 'Pending' | 'Verified' | 'Rejected',
  notes?: { adminId?: string; reason?: string },
): Promise<void> => {
  const privateRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const publicRef = doc(db, PUBLIC_LISTINGS_COLLECTION, propertyId);
  const snapshot = await getDoc(privateRef);
  if (!snapshot.exists()) throw new Error('This listing no longer exists.');

  const isVerified = typeof isVerifiedOrStatus === 'boolean'
    ? isVerifiedOrStatus
    : isVerifiedOrStatus === 'Verified';
  const verificationStatus = typeof isVerifiedOrStatus === 'string'
    ? isVerifiedOrStatus
    : isVerified ? 'Verified' : 'Pending';
  const privateUpdate: Record<string, unknown> = {
    isVerified,
    verificationStatus,
    verificationLevel: isVerified ? 'DOCUMENT_REVIEWED' : 'NONE',
    verifiedAt: isVerified ? serverTimestamp() : deleteField(),
    verifiedBy: isVerified ? (notes?.adminId || auth.currentUser?.uid || '') : deleteField(),
    updatedAt: serverTimestamp(),
  };
  if (verificationStatus === 'Rejected') privateUpdate.rejectionReason = asBoundedText(notes?.reason || 'Document requirements not met.', 'rejectionReason', 500);
  const privateNext = { ...snapshot.data(), ...privateUpdate };
  const batch = writeBatch(db);
  batch.update(privateRef, privateUpdate);
  batch.set(publicRef, toPublicListing({ ...privateNext, updatedAt: serverTimestamp() }));
  await batch.commit();
};

export const fetchProperties = (
  onUpdate: (properties: FullProperty[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  publicPropertiesQuery(),
  snapshot => onUpdate(snapshot.docs.map(docSnap => normalizeProperty(docSnap.id, docSnap.data()))),
  error => {
    console.error('Error subscribing to public listings:', error);
    onError?.(error);
  },
);

export const getUserProperties = async (userId: string): Promise<FullProperty[]> => {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error('You can only access your own listings.');
  const snapshot = await getDocs(query(collection(db, PROPERTIES_COLLECTION), where('ownerId', '==', user.uid)));
  return snapshot.docs.map(docSnap => normalizeProperty(docSnap.id, docSnap.data()));
};

/** ADMIN ONLY — the Firestore rules require the trusted Firebase Auth admin claim. */
export const markUserAsVerifiedSeller = async (userId: string, isVerifiedSeller: boolean): Promise<void> => {
  if (typeof isVerifiedSeller !== 'boolean') throw new Error('Seller verification value is invalid.');
  await updateDoc(doc(db, 'users', userId), { isVerifiedSeller, updatedAt: serverTimestamp() });
};

export const updatePropertyDescription = async (propertyId: string, description: string): Promise<string> => {
  const normalizedDescription = asBoundedText(description, 'description', 5000, true);
  if (normalizedDescription.length < 10) throw new Error('The description must be at least 10 characters.');
  await updateOwnedProperty(propertyId, { description: normalizedDescription });
  return normalizedDescription;
};
