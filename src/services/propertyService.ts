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
import { Property as FullProperty, PropertyType, ListingStatus, FloodRisk } from '../../types';

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
    address: 'Lagos, Nigeria',
    area: 'Lekki',
    city: 'Lagos',
    state: 'Lagos'
  };

  if (typeof data.location === 'object' && data.location !== null) {
    locationObj = {
      address: data.location.address || data.location.area || 'Lagos, Nigeria',
      area: data.location.area || 'Lekki',
      city: data.location.city || 'Lagos',
      state: data.location.state || 'Lagos'
    };
  } else if (typeof data.location === 'string' && data.location.trim().length > 0) {
    const parts = data.location.split(',').map((s: string) => s.trim());
    locationObj = {
      address: data.location,
      area: parts[0] || 'Lekki',
      city: parts[1] || 'Lagos',
      state: parts[2] || 'Lagos'
    };
  }

  // Handle images
  const images: string[] = Array.isArray(data.images) && data.images.length > 0 
    ? data.images 
    : Array.isArray(data.imageUrls) && data.imageUrls.length > 0
    ? data.imageUrls
    : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'];

  // Handle specs
  const specs = {
    bedrooms: data.specs?.bedrooms ?? data.bedrooms ?? 0,
    bathrooms: data.specs?.bathrooms ?? data.bathrooms ?? 0,
    sizeSqM: data.specs?.sizeSqM ?? data.specs?.square_meters ?? data.squareMeters ?? 0,
    capacity: data.specs?.capacity ?? data.capacity ?? 0,
    parkingSpaces: data.specs?.parkingSpaces ?? data.parkingSpaces ?? 2
  };

  // Determine property type safely
  let propType: PropertyType = PropertyType.HOUSE;
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

  const isVerified = data.isVerified === true || data.verificationStatus === 'Verified';

  return {
    id: id,
    title: data.title || 'Property Listing',
    description: data.description || '',
    location: locationObj,
    price: Number(data.price) || 0,
    period: data.period || 'total',
    type: propType,
    status: (data.status as ListingStatus) || ListingStatus.AVAILABLE,
    specs: specs,
    features: Array.isArray(data.features) && data.features.length > 0 ? data.features : ['24/7 Power', 'Fitted Kitchen', 'Security'],
    images: images,
    videoUrl: data.videoUrl,
    floorPlanUrl: data.floorPlanUrl,
    agentId: data.agentId || data.ownerId || 'agent-1',
    isVerified: isVerified,
    verificationLevel: isVerified ? 'PHYSICALLY_INSPECTED' : (data.verificationLevel || 'NONE'),
    titleDocument: data.titleDocument,
    floodRisk: data.floodRisk || FloodRisk.LOW,
    avgPowerHours: Number(data.avgPowerHours) || 20,
    isSolarPowered: Boolean(data.isSolarPowered),
    smartMeterId: data.smartMeterId,
    waterSource: data.waterSource || 'Borehole',
    escrowEnabled: data.escrowEnabled !== false,
    depositEscrowEnabled: data.depositEscrowEnabled !== false,
    coordinates: data.coordinates || { lat: 6.4541, lng: 3.6128 },
    virtualTourUrl: data.virtualTourUrl,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
  };
};

export const createProperty = async (
  propertyData: any
): Promise<string> => {
  const user = auth.currentUser;
  const ownerId = propertyData.ownerId || propertyData.agentId || user?.uid;
  if (!ownerId) {
    throw new Error('User must be authenticated to create a property');
  }

  try {
    // Check if the seller is verified on their user account
    let isSellerVerified = false;
    try {
      const userDocSnap = await getDoc(doc(db, 'users', ownerId));
      if (userDocSnap.exists() && userDocSnap.data()?.isVerifiedSeller === true) {
        isSellerVerified = true;
      }
    } catch (checkErr) {
      console.warn('Could not check seller verification status, defaulting to unverified:', checkErr);
    }

    const isVerified = isSellerVerified || propertyData.isVerified === true;
    const verificationStatus = isVerified 
      ? 'Verified' 
      : (propertyData.verificationStatus || 'Pending');

    const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), {
      ...propertyData,
      ownerId: ownerId,
      agentId: ownerId,
      isVerified: isVerified,
      verificationStatus: verificationStatus,
      imageUrls: propertyData.imageUrls || propertyData.images || [],
      images: propertyData.images || propertyData.imageUrls || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
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
      verificationLevel: isVerified ? 'PHYSICALLY_INSPECTED' : 'NONE',
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
