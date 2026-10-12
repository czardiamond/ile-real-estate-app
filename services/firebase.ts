import { auth, db } from '../src/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, addDoc, orderBy, limit, writeBatch, updateDoc, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { User, Lead, LeadStatus } from '../types';

export { db };

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

export interface AgentDirectoryProfile {
  id: string;
  name: string;
  role: User['role'];
  agencyName?: string;
  avatarUrl?: string;
}

const ALERTS_COLLECTION = 'property_alerts';
const USERS_COLLECTION = 'users';
const CHAT_COLLECTION = 'chat_messages';

/**
 * Checks connectivity to Firestore database
 */
export async function checkFirestoreSyncStatus(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    await getDoc(doc(db, USERS_COLLECTION, user.uid));
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
    const publicProfile = {
      id: user.id,
      name: user.name,
      role: user.role,
      agencyName: user.agencyName || '',
      avatarUrl: user.avatarUrl || '',
      updatedAt: dataToSave.updatedAt,
    };
    const batch = writeBatch(db);
    batch.set(userRef, dataToSave, { merge: true });
    batch.set(doc(db, 'public_profiles', user.id), publicProfile, { merge: true });
    await batch.commit();

    // LocalStorage cache
    localStorage.setItem(`ile_user_profile_${user.id}`, JSON.stringify(dataToSave));
    return true;
  } catch (err) {
    console.warn('Firestore profile save failed:', err);
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
  const signedInUser = auth.currentUser;
  if (!signedInUser || lead.buyerId !== signedInUser.uid) return false;
  try {
    const docRef = doc(db, 'leads', lead.id || `lead_${Date.now()}`);
    await setDoc(docRef, {
      id: docRef.id,
      buyerId: signedInUser.uid,
      agentId: lead.agentId,
      propertyId: lead.propertyId,
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      budget: Number(lead.budget) || 0,
      value: Number(lead.value) || 0,
      notes: String(lead.notes || '').slice(0, 4000),
      status: 'New Arrival',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.warn('Firestore save lead error:', err);
    return false;
  }
}

export async function getAgentLeads(agentId: string): Promise<Lead[]> {
  const user = auth.currentUser;
  if (!user || user.uid !== agentId) throw new Error('You can only access your own lead inbox.');
  const snapshot = await getDocs(query(collection(db, 'leads'), where('agentId', '==', agentId)));
  return snapshot.docs
    .map(item => ({ id: item.id, ...(item.data() as object) } as Lead))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function subscribeAgentLeads(agentId: string, onUpdate: (leads: Lead[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const user = auth.currentUser;
  if (!user || user.uid !== agentId) throw new Error('You can only subscribe to your own lead inbox.');
  const q = query(collection(db, 'leads'), where('agentId', '==', agentId));
  return onSnapshot(q, snapshot => {
    const leads = snapshot.docs.map(item => {
      const data = item.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : '');
      return { id: item.id, ...data, createdAt } as Lead;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(leads);
  }, error => onError?.(error));
}

export async function updateAgentLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to update an enquiry.');
  const leadRef = doc(db, 'leads', leadId);
  const lead = await getDoc(leadRef);
  if (!lead.exists() || lead.data().agentId !== user.uid) throw new Error('You do not have access to this enquiry.');
  await updateDoc(leadRef, { status, updatedAt: serverTimestamp() });
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
    console.warn('Firestore alert save failed; preserving an offline draft:', err);
    const stored = JSON.parse(localStorage.getItem('ile_property_alerts') || '{}');
    stored[docId] = { ...pref, id: docId, updatedAt: new Date().toISOString() };
    localStorage.setItem('ile_property_alerts', JSON.stringify(stored));
    return false;
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

/**
 * Fetches all agents under a specific brokerage/agency
 */
export async function getAgentsByAgency(agencyName: string): Promise<AgentDirectoryProfile[]> {
  try {
    const colRef = collection(db, 'public_profiles');
    const q = query(colRef, where('agencyName', '==', agencyName));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const agents: AgentDirectoryProfile[] = [];
      snap.forEach(d => agents.push(d.data() as AgentDirectoryProfile));
      return agents;
    }
  } catch (err) {
    console.warn('Firestore fetch agents note:', err);
  }
  return [];
}

/**
 * Client-side users cannot change another user's permissions. A trusted server/admin workflow is required.
 */
export async function updateUserPermissions(
  userId: string,
  updates: { brokerageRole?: 'Standard' | 'Manager'; isActive?: boolean }
): Promise<boolean> {
  console.warn('Agent permission changes require a trusted administrative workflow.', userId, updates);
  return false;
}
