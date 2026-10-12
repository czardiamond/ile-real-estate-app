// src/services/propertyService.ts
import { db, auth } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  updateDoc,
  onSnapshot,
  Unsubscribe
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

export const normalizeProperty = (id: string, data: any): FullProperty => {
  // Handle location object or string
  let locationObj = {
    address: 'Location not provided',
    area: 'Unknown area',
    city: '',
    state: ''
  };

  if (typeof data.location === 'object' && data.location !== null) {
    locationObj = {
      address: data.location.address || data.location.area || 'Location not provided',
      area: data.location.area || 'Unknown area',
      city: data.location.city || '',
      state: data.location.state || ''
    };
  } else if (typeof data.location === 'string' && data.location.trim().length > 0) {
    const parts = data.location.split(',').map((s: string) => s.trim());
    locationObj = {
      address: data.location,
      area: parts[0] || 'Unknown area',
      city: parts[1] || '',
      state: parts[2] || ''
    };
  }

  // Handle images
  const images: string[] = Array.isArray(data.images) && data.images.length > 0 
    ? data.images 
    : Array.isArray(data.imageUrls) && data.imageUrls.length > 0
    ? data.imageUrls
    : ['/property-placeholder.svg'];

  // Handle specs
  const specs = {
    bedrooms: data.specs?.bedrooms ?? data.bedrooms,
    bathrooms: data.specs?.bathrooms ?? data.bathrooms,
    sizeSqM: data.specs?.sizeSqM ?? data.specs?.square_meters ?? data.squareMeters,
    capacity: data.specs?.capacity ?? data.capacity,
    parkingSpaces: data.specs?.parkingSpaces ?? data.parkingSpaces
  };

  // Determine property type safely
  let propType: PropertyType = PropertyType.OTHER;
  const rawType = (data.type || data.propertyType || data.category || '').toLowerCase();
  if (rawType.includes('land')) propType = PropertyType.LAND;
  else if (rawType.includes('apartment') || rawType.includes('flat')) propType = PropertyType.APARTMENT;
  else if (rawType.includes('duplex')) propType = PropertyType.DUPLEX;
  else if (rawType.includes('bungalow')) propType = PropertyType.BUNGALOW;
  else if (rawType.includes('office')) propType = PropertyType.OFFICE;
  else if (rawType.includes('shop')) propType = PropertyType.SHOP;
  else if (rawType.includes('warehouse')) propType = PropertyType.WAREHOUSE;
  else if (rawType.includes('short') || rawType.includes('stay')) propType = PropertyType.SHORT_LET;
  else if (rawType.includes('event') || rawType.includes('hall') || rawType.includes('owambe')) propType = PropertyType.EVENT_CENTER;
  else if (rawType.includes('commercial')) propType = PropertyType.OFFICE;

  const isVerified = data.isVerified === true
    && data.verificationStatus === VerificationStatus.VERIFIED
    && typeof data.verifiedBy === 'string'
    && data.verifiedBy.length > 0;
  const normalizedStatus = Object.values(ListingStatus).find(status => status.toLowerCase() === String(data.status || '').toLowerCase()) || ListingStatus.AVAILABLE;

  return {
    id: id,
    title: data.title || 'Property Listing',
    description: data.description || '',
    location: locationObj,
    price: Number(data.price) || 0,
    period: data.period || undefined,
    type: propType,
    status: normalizedStatus,
    specs: specs,
    features: Array.isArray(data.features) ? data.features : [],
    images: images,
    videoUrl: data.videoUrl,
    floorPlanUrl: data.floorPlanUrl,
    floorPlanImages: Array.isArray(data.floorPlanImages) ? data.floorPlanImages : (data.floorPlanUrl ? [data.floorPlanUrl] : []),
    agentId: data.agentId || data.ownerId || '',
    isVerified: isVerified,
    verificationLevel: isVerified ? (data.verificationLevel || 'NONE') : 'NONE',
    titleDocument: undefined,
    floodRisk: data.floodRisk || FloodRisk.UNASSESSED,
    avgPowerHours: data.avgPowerHours !== undefined && data.avgPowerHours !== null && data.avgPowerHours !== '' && Number.isFinite(Number(data.avgPowerHours)) ? Number(data.avgPowerHours) : undefined,
    isSolarPowered: Boolean(data.isSolarPowered),
    smartMeterId: data.smartMeterId,
    waterSource: data.waterSource || 'Not specified',
    escrowEnabled: false,
    depositEscrowEnabled: false,
    coordinates: data.coordinates && Number.isFinite(Number(data.coordinates.lat)) && Number.isFinite(Number(data.coordinates.lng))
      ? { lat: Number(data.coordinates.lat), lng: Number(data.coordinates.lng) }
      : undefined,
    virtualTourUrl: data.virtualTourUrl,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : ''),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
  };
};

const omitUndefined = (value: any): any => {
  if (Array.isArray(value)) return value.map(omitUndefined).filter(item => item !== undefined);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, omitUndefined(item)]));
  }
  return value;
};

export const createProperty = async (
  propertyData: any
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to create a property');
  }
  const ownerId = user.uid;
  if ((propertyData.ownerId && propertyData.ownerId !== ownerId) || (propertyData.agentId && propertyData.agentId !== ownerId)) {
    throw new Error('You can only publish listings under your own account.');
  }

  try {
    const { titleDocument: _privateTitleDocument, ...publicPropertyData } = propertyData;

    const propertyDocument = omitUndefined({
      ...publicPropertyData,
      ownerId: ownerId,
      agentId: ownerId,
      isVerified: false,
      verificationStatus: VerificationStatus.PENDING,
      verificationLevel: 'NONE',
      verifiedAt: null,
      verifiedBy: null,
      imageUrls: propertyData.imageUrls || propertyData.images || [],
      images: propertyData.images || propertyData.imageUrls || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), propertyDocument);
    return docRef.id;
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

export const updateListingStatus = async (propertyId: string, status: ListingStatus): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to update a listing.');
  const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const snapshot = await getDoc(propertyRef);
  if (!snapshot.exists() || snapshot.data().ownerId !== user.uid) {
    throw new Error('You do not have permission to update this listing.');
  }
  await updateDoc(propertyRef, { status, updatedAt: serverTimestamp() });
};

export const getProperties = async (filters?: PropertyFilters): Promise<FullProperty[]> => {
  try {
    let q = query(
      collection(db, PROPERTIES_COLLECTION), 
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    let properties: FullProperty[] = querySnapshot.docs.map((docSnap) => 
      normalizeProperty(docSnap.id, docSnap.data())
    );

    if (filters?.propertyType && filters.propertyType !== 'all') {
      properties = properties.filter((p) => p.type === filters.propertyType);
    }
    if (filters?.maxPrice) {
      properties = properties.filter((p) => p.price <= filters.maxPrice!);
    }
    if (filters?.minPrice) {
      properties = properties.filter((p) => p.price >= filters.minPrice!);
    }

    return properties;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

export const getPropertyById = async (propertyId: string): Promise<FullProperty | null> => {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return normalizeProperty(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    console.error('Error getting property by ID:', error);
    throw error;
  }
};

export const verifyProperty = async (
  propertyId: string, 
  isVerifiedOrStatus: boolean | 'Pending' | 'Verified' | 'Rejected',
  notes?: { adminId?: string; reason?: string }
): Promise<void> => {
  try {
    const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const isVerified = typeof isVerifiedOrStatus === 'boolean' 
      ? isVerifiedOrStatus 
      : isVerifiedOrStatus === 'Verified';
      
    const status = typeof isVerifiedOrStatus === 'string'
      ? isVerifiedOrStatus
      : (isVerified ? 'Verified' : 'Pending');

    const updatePayload: Record<string, any> = {
      isVerified,
      verificationStatus: status,
      verificationLevel: isVerified ? 'DOCUMENT_REVIEWED' : 'NONE',
      updatedAt: serverTimestamp(),
    };

    if (isVerified) {
      updatePayload.verifiedAt = new Date().toISOString();
      if (notes?.adminId) updatePayload.verifiedBy = notes.adminId;
    } else if (status === 'Rejected') {
      updatePayload.rejectionReason = notes?.reason || 'Document requirements not met.';
    }

    await updateDoc(propertyRef, updatePayload);
  } catch (error) {
    console.error('Error updating property verification:', error);
    throw error;
  }
};

/**
 * Real-time listener for all properties from Firestore
 */
export const fetchProperties = (
  onUpdate: (properties: FullProperty[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const propertiesRef = collection(db, PROPERTIES_COLLECTION);
  const q = query(propertiesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const properties: FullProperty[] = snapshot.docs.map((docSnap) => 
        normalizeProperty(docSnap.id, docSnap.data())
      );
      onUpdate(properties);
    },
    (error) => {
      console.error('Error subscribing to properties collection:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * Fetches all properties owned by a specific user.
 */
export const getUserProperties = async (userId: string): Promise<FullProperty[]> => {
  try {
    const q = query(collection(db, PROPERTIES_COLLECTION), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => normalizeProperty(d.id, d.data()));
  } catch (error) {
    console.error('Error fetching user properties:', error);
    throw error;
  }
};

/**
 * ADMIN ONLY — marks a user's account as a verified seller.
 */
export const markUserAsVerifiedSeller = async (
  userId: string,
  isVerifiedSeller: boolean
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), { isVerifiedSeller });
  } catch (error) {
    console.error('Error updating user verified-seller status:', error);
    throw error;
  }
};


export const updatePropertyDescription = async (propertyId: string, description: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving a listing description.');
  const normalizedDescription = description.trim();
  if (normalizedDescription.length < 10 || normalizedDescription.length > 5000) {
    throw new Error('The description must be between 10 and 5,000 characters.');
  }

  const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const snapshot = await getDoc(propertyRef);
  if (!snapshot.exists()) throw new Error('This listing no longer exists.');
  if (snapshot.data().ownerId !== user.uid) throw new Error('Only the listing owner can update its description.');

  await updateDoc(propertyRef, { description: normalizedDescription, updatedAt: serverTimestamp() });
  return normalizedDescription;
};
