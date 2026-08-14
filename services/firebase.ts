import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, addDoc, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { User } from '../types';

// Lazy initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const db = getFirestore(app);

export interface PropertyAlertPreference {
  id?: string;
  userId: string;
  userEmail: string;
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  locationArea: string;
  notifyPriceDrop: boolean;
  notifySimilarListings: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreChatMessage {
  id?: string;
  userId: string;
  chatType: 'ile_ai' | 'property_agent';
  propertyId?: string;
  role: 'user' | 'model' | 'agent';
  text: string;
  timestamp: string;
}

const ALERTS_COLLECTION = 'property_alerts';
const USERS_COLLECTION = 'users';
const CHAT_COLLECTION = 'chat_messages';

/**
 * Checks connectivity to Firestore database
 */
export async function checkFirestoreSyncStatus(): Promise<boolean> {
  try {
    // Quick read test on a dummy doc or collection
    const testDoc = doc(db, '_health', 'status');
    await getDoc(testDoc);
    return true;
  } catch (err) {
    console.warn('Firestore status check:', err);
    return false;
  }
}

/**
 * Saves or updates user profile in Firestore
 */
export async function saveUserProfileToFirestore(user: User): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    const dataToSave = {
      ...user,
      updatedAt: new Date().toISOString()
    };
    await setDoc(userRef, dataToSave, { merge: true });

    // LocalStorage cache
    localStorage.setItem(`ile_user_profile_${user.id}`, JSON.stringify(dataToSave));
    return true;
  } catch (err) {
    console.warn('Firestore profile save error, falling back to local cache:', err);
    localStorage.setItem(`ile_user_profile_${user.id}`, JSON.stringify(user));
    return false;
  }
}

/**
 * Fetches user profile from Firestore
 */
export async function getUserProfileFromFirestore(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as User;
      localStorage.setItem(`ile_user_profile_${userId}`, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Firestore profile fetch error, checking local cache:', err);
  }

  const cached = localStorage.getItem(`ile_user_profile_${userId}`);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Saves a chat message to Firestore chat_messages
 */
export async function saveChatMessageToFirestore(msg: Omit<FirestoreChatMessage, 'id' | 'timestamp'> & { timestamp?: string }): Promise<boolean> {
  const messageData: FirestoreChatMessage = {
    ...msg,
    timestamp: msg.timestamp || new Date().toISOString()
  };

  try {
    const colRef = collection(db, CHAT_COLLECTION);
    await addDoc(colRef, messageData);

    // Save copy in localStorage for immediate offline resilience
    const localKey = `ile_chat_${msg.userId}_${msg.chatType}${msg.propertyId ? '_' + msg.propertyId : ''}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(messageData);
    localStorage.setItem(localKey, JSON.stringify(existing));
    return true;
  } catch (err) {
    console.warn('Firestore chat save error, storing locally:', err);
    const localKey = `ile_chat_${msg.userId}_${msg.chatType}${msg.propertyId ? '_' + msg.propertyId : ''}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    existing.push(messageData);
    localStorage.setItem(localKey, JSON.stringify(existing));
    return false;
  }
}

/**
 * Fetches conversation history from Firestore
 */
export async function getChatHistoryFromFirestore(
  userId: string, 
  chatType: 'ile_ai' | 'property_agent', 
  propertyId?: string
): Promise<FirestoreChatMessage[]> {
  try {
    const colRef = collection(db, CHAT_COLLECTION);
    let q;
    if (propertyId) {
      q = query(
        colRef, 
        where('userId', '==', userId), 
        where('chatType', '==', chatType),
        where('propertyId', '==', propertyId)
      );
    } else {
      q = query(
        colRef, 
        where('userId', '==', userId), 
        where('chatType', '==', chatType)
      );
    }

    const snap = await getDocs(q);
    if (!snap.empty) {
      const messages: FirestoreChatMessage[] = [];
      snap.forEach(d => {
        messages.push({ id: d.id, ...(d.data() as object) } as FirestoreChatMessage);
      });
      // Sort in memory by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Update local storage
      const localKey = `ile_chat_${userId}_${chatType}${propertyId ? '_' + propertyId : ''}`;
      localStorage.setItem(localKey, JSON.stringify(messages));

      return messages;
    }
  } catch (err) {
    console.warn('Firestore chat fetch error, falling back to local cache:', err);
  }

  // Fallback
  const localKey = `ile_chat_${userId}_${chatType}${propertyId ? '_' + propertyId : ''}`;
  const localData = localStorage.getItem(localKey);
  return localData ? JSON.parse(localData) : [];
}

/**
 * Saves a WhatsApp or inbound property lead to Firestore
 */
export async function saveLeadToFirestore(lead: any): Promise<boolean> {
  try {
    const docRef = doc(db, 'leads', lead.id || `lead_${Date.now()}`);
    await setDoc(docRef, {
      ...lead,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore save lead error:', err);
    return false;
  }
}

/**
 * Saves or updates user notification alert preference in Firestore
 */
export async function savePropertyAlertPreference(pref: PropertyAlertPreference): Promise<boolean> {
  const docId = `${pref.userId}_${pref.propertyId}`;
  try {
    const docRef = doc(db, ALERTS_COLLECTION, docId);
    await setDoc(docRef, {
      ...pref,
      id: docId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Backup in local storage
    const stored = JSON.parse(localStorage.getItem('ile_property_alerts') || '{}');
    stored[docId] = { ...pref, id: docId, updatedAt: new Date().toISOString() };
    localStorage.setItem('ile_property_alerts', JSON.stringify(stored));

    return true;
  } catch (err) {
    console.warn('Firestore save error, falling back to local persistence:', err);
    const stored = JSON.parse(localStorage.getItem('ile_property_alerts') || '{}');
    stored[docId] = { ...pref, id: docId, updatedAt: new Date().toISOString() };
    localStorage.setItem('ile_property_alerts', JSON.stringify(stored));
    return true;
  }
}

/**
 * Fetches user alert preference for a specific property
 */
export async function getPropertyAlertPreference(userId: string, propertyId: string): Promise<PropertyAlertPreference | null> {
  const docId = `${userId}_${propertyId}`;
  try {
    const docRef = doc(db, ALERTS_COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PropertyAlertPreference;
    }
  } catch (err) {
    console.warn('Firestore fetch error, checking local storage:', err);
  }

  // Fallback check
  const stored = JSON.parse(localStorage.getItem('ile_property_alerts') || '{}');
  return stored[docId] || null;
}

/**
 * Deletes user alert preference
 */
export async function removePropertyAlertPreference(userId: string, propertyId: string): Promise<boolean> {
  const docId = `${userId}_${propertyId}`;
  try {
    const docRef = doc(db, ALERTS_COLLECTION, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete error:', err);
  }
  const stored = JSON.parse(localStorage.getItem('ile_property_alerts') || '{}');
  delete stored[docId];
  localStorage.setItem('ile_property_alerts', JSON.stringify(stored));
  return true;
}
