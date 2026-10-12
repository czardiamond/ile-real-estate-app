import { auth, db } from '../src/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User, Lead, LeadStatus } from '../types';
import { NetworkRank, UserRole, VerificationStatus } from '../types';

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
const LEADS_COLLECTION = 'leads';
const ACADEMY_COLLECTION = 'academy_progress';

function safeUserCacheKey(userId: string): string {
  return `ile_user_profile_${userId}`;
}

function profileForCache(user: User): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    agencyName: user.agencyName || '',
    brokerageRole: user.brokerageRole,
  };
}

function hydrateUserProfile(userId: string, data: Record<string, any>): User {
  const wallet = data.wallet && typeof data.wallet === 'object' ? data.wallet : {};
  return {
    id: userId,
    name: typeof data.name === 'string' ? data.name : 'Ilé User',
    email: typeof data.email === 'string' ? data.email : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    role: Object.values(UserRole).includes(data.role) ? data.role as UserRole : UserRole.PUBLIC,
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
    verified: data.verified === true,
    verification: data.verification || { status: VerificationStatus.UNVERIFIED },
    agencyName: typeof data.agencyName === 'string' ? data.agencyName : '',
    brokerageRole: data.brokerageRole,
    isActive: data.isActive,
    referralCode: typeof data.referralCode === 'string' ? data.referralCode : '',
    referredBy: typeof data.referredBy === 'string' ? data.referredBy : undefined,
    networkRank: Object.values(NetworkRank).includes(data.networkRank) ? data.networkRank as NetworkRank : NetworkRank.SCOUT,
    downlineCount: Number.isFinite(Number(data.downlineCount)) ? Number(data.downlineCount) : 0,
    wallet: {
      balance: Number.isFinite(Number(wallet.balance)) ? Number(wallet.balance) : 0,
      lifetimeEarnings: Number.isFinite(Number(wallet.lifetimeEarnings)) ? Number(wallet.lifetimeEarnings) : 0,
      pendingClearance: Number.isFinite(Number(wallet.pendingClearance)) ? Number(wallet.pendingClearance) : 0,
    },
    bankDetails: data.bankDetails,
  } as User;
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function timestampToIso(value: any): string {
  if (value?.toDate) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return '';
}

function normalizeLead(id: string, data: Record<string, any>): Lead {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    email: typeof data.email === 'string' ? data.email : '',
    propertyId: typeof data.propertyId === 'string' ? data.propertyId : '',
    budget: Number.isFinite(Number(data.budget)) ? Number(data.budget) : 0,
    value: Number.isFinite(Number(data.value)) ? Number(data.value) : undefined,
    status: data.status as LeadStatus,
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAt: timestampToIso(data.createdAt),
  };
}

/** Checks that the signed-in user's private Firestore profile is reachable. */
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

/** Save only user-editable fields. Role, verification, wallet and referral data are not client-editable. */
export async function saveUserProfileToFirestore(user: User): Promise<boolean> {
  const signedInUser = auth.currentUser;
  if (!signedInUser || signedInUser.uid !== user.id) return false;

  try {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    const existingUser = await getDoc(userRef);
    const publicProfileRef = doc(db, 'public_profiles', user.id);
    const updatedAt = serverTimestamp();
    const selfRole = [UserRole.PUBLIC, UserRole.AGENT, UserRole.BROKERAGE].includes(user.role)
      ? user.role
      : UserRole.PUBLIC;
    const storedRole = existingUser.exists() ? existingUser.data().role : selfRole;
    const editableProfile = {
      id: user.id,
      name: String(user.name || '').trim().slice(0, 120),
      email: signedInUser.email || '',
      phone: String(user.phone || '').trim().slice(0, 40),
      avatarUrl: String(user.avatarUrl || '').slice(0, 2048),
      agencyName: String(user.agencyName || '').trim().slice(0, 120),
      updatedAt,
    };

    const batch = writeBatch(db);
    if (existingUser.exists()) {
      batch.set(userRef, editableProfile, { merge: true });
    } else {
      batch.set(userRef, {
        ...editableProfile,
        role: selfRole,
        verified: false,
        verification: { status: VerificationStatus.UNVERIFIED },
        referralCode: '',
        networkRank: NetworkRank.SCOUT,
        downlineCount: 0,
        wallet: { balance: 0, lifetimeEarnings: 0, pendingClearance: 0 },
      });
    }

    // Replace (rather than merge) the directory record so legacy private fields cannot linger there.
    if ([UserRole.PUBLIC, UserRole.AGENT, UserRole.BROKERAGE].includes(storedRole)) {
      batch.set(publicProfileRef, {
        id: user.id,
        name: editableProfile.name,
        role: storedRole,
        agencyName: editableProfile.agencyName,
        avatarUrl: editableProfile.avatarUrl,
        updatedAt,
      });
    } else {
      // Admins do not appear in the public agent directory.
      batch.delete(publicProfileRef);
    }
    await batch.commit();

    const cacheRole = [UserRole.PUBLIC, UserRole.AGENT, UserRole.BROKERAGE].includes(storedRole) ? storedRole : UserRole.PUBLIC;
    localStorage.setItem(safeUserCacheKey(user.id), JSON.stringify(profileForCache({ ...user, role: cacheRole })));
    return true;
  } catch (err) {
    console.warn('Firestore profile save failed:', err);
    return false;
  }
}

/** Fetch the current user's private profile; local fallback excludes wallet, bank and verification data. */
export async function getUserProfileFromFirestore(userId: string): Promise<User | null> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (snap.exists()) {
      const data = snap.data();
      const profile = hydrateUserProfile(userId, data);
      localStorage.setItem(safeUserCacheKey(userId), JSON.stringify(profileForCache(profile)));
      return profile;
    }
  } catch (err) {
    console.warn('Firestore profile fetch error, checking this user’s safe local cache:', err);
  }

  const cached = readLocalJson<Record<string, any> | null>(safeUserCacheKey(userId), null);
  return cached ? hydrateUserProfile(userId, cached) : null;
}

/** Persist a chat message under the signed-in owner's UID. Messages are append-only for owners. */
export async function saveChatMessageToFirestore(
  msg: Omit<FirestoreChatMessage, 'id' | 'timestamp'> & { timestamp?: string },
): Promise<boolean> {
  const signedInUser = auth.currentUser;
  if (!signedInUser || signedInUser.uid !== msg.userId || !msg.text.trim()) return false;
  const localKey = `ile_chat_${msg.userId}_${msg.chatType}${msg.propertyId ? `_${msg.propertyId}` : ''}`;
  const messageData: FirestoreChatMessage = { ...msg, text: msg.text.slice(0, 12000), timestamp: msg.timestamp || new Date().toISOString() };

  try {
    await addDoc(collection(db, CHAT_COLLECTION), {
      userId: signedInUser.uid,
      chatType: msg.chatType,
      ...(msg.propertyId ? { propertyId: msg.propertyId } : {}),
      role: msg.role,
      text: messageData.text,
      timestamp: serverTimestamp(),
    });
    const existing = readLocalJson<FirestoreChatMessage[]>(localKey, []);
    localStorage.setItem(localKey, JSON.stringify([...existing, messageData].slice(-500)));
    return true;
  } catch (err) {
    console.warn('Firestore chat save error; storing a private per-user offline copy:', err);
    const existing = readLocalJson<FirestoreChatMessage[]>(localKey, []);
    localStorage.setItem(localKey, JSON.stringify([...existing, messageData].slice(-500)));
    return false;
  }
}

/** Fetch only the signed-in user's conversation history; never consult another UID's local cache. */
export async function getChatHistoryFromFirestore(
  userId: string,
  chatType: 'ile_ai' | 'property_agent',
  propertyId?: string,
): Promise<FirestoreChatMessage[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
  const localKey = `ile_chat_${userId}_${chatType}${propertyId ? `_${propertyId}` : ''}`;

  try {
    const constraints = [where('userId', '==', userId), where('chatType', '==', chatType)];
    if (propertyId) constraints.push(where('propertyId', '==', propertyId));
    const snap = await getDocs(query(collection(db, CHAT_COLLECTION), ...constraints));
    if (!snap.empty) {
      const messages = snap.docs.map(item => {
        const data = item.data();
        return {
          id: item.id,
          userId: data.userId,
          chatType: data.chatType,
          propertyId: data.propertyId,
          role: data.role,
          text: data.text,
          timestamp: timestampToIso(data.timestamp),
        } as FirestoreChatMessage;
      });
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      localStorage.setItem(localKey, JSON.stringify(messages.slice(-500)));
      return messages;
    }
  } catch (err) {
    console.warn('Firestore chat fetch error; checking the current user’s local cache:', err);
  }

  return readLocalJson<FirestoreChatMessage[]>(localKey, []);
}

/** Save an authenticated buyer enquiry. */
export async function saveLeadToFirestore(lead: any): Promise<boolean> {
  const signedInUser = auth.currentUser;
  if (!signedInUser || lead?.buyerId !== signedInUser.uid || typeof lead?.agentId !== 'string' || !lead.agentId || typeof lead?.propertyId !== 'string' || !lead.propertyId) return false;
  try {
    const docRef = doc(db, LEADS_COLLECTION, typeof lead.id === 'string' && lead.id.length > 0 ? lead.id : `lead_${Date.now()}`);
    const notes = String(lead.notes || '').trim().slice(0, 4000);
    if (notes.length < 5) throw new Error('Add at least five characters to your enquiry.');
    await setDoc(docRef, {
      id: docRef.id,
      buyerId: signedInUser.uid,
      agentId: lead.agentId,
      propertyId: lead.propertyId,
      name: String(lead.name || signedInUser.displayName || 'Buyer').trim().slice(0, 120),
      email: String(lead.email || signedInUser.email || '').slice(0, 320),
      phone: String(lead.phone || signedInUser.phoneNumber || '').slice(0, 40),
      budget: Math.max(0, Number(lead.budget) || 0),
      value: Math.max(0, Number(lead.value) || 0),
      notes,
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
  const snapshot = await getDocs(query(collection(db, LEADS_COLLECTION), where('agentId', '==', agentId)));
  return snapshot.docs.map(item => normalizeLead(item.id, item.data()))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function subscribeAgentLeads(agentId: string, onUpdate: (leads: Lead[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const user = auth.currentUser;
  if (!user || user.uid !== agentId) throw new Error('You can only subscribe to your own lead inbox.');
  const q = query(collection(db, LEADS_COLLECTION), where('agentId', '==', agentId));
  return onSnapshot(q, snapshot => {
    const leads = snapshot.docs.map(item => normalizeLead(item.id, item.data()))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    onUpdate(leads);
  }, error => onError?.(error));
}

export async function updateAgentLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to update an enquiry.');
  if (!['New Arrival', 'Talking', 'Visiting', 'Negotiating', 'Closed'].includes(status)) throw new Error('Enquiry status is invalid.');
  const leadRef = doc(db, LEADS_COLLECTION, leadId);
  const lead = await getDoc(leadRef);
  if (!lead.exists() || lead.data().agentId !== user.uid) throw new Error('You do not have access to this enquiry.');
  await updateDoc(leadRef, { status, updatedAt: serverTimestamp() });
}

/** Save or update one alert preference belonging to the current user. */
export async function savePropertyAlertPreference(pref: PropertyAlertPreference): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || user.uid !== pref.userId) return false;
  const docId = `${pref.userId}_${pref.propertyId}`;
  const now = new Date().toISOString();
  const record: PropertyAlertPreference = { ...pref, id: docId, createdAt: pref.createdAt || now, updatedAt: now };
  try {
    await setDoc(doc(db, ALERTS_COLLECTION, docId), record, { merge: true });
    const stored = readLocalJson<Record<string, PropertyAlertPreference>>(`ile_property_alerts_${user.uid}`, {});
    stored[docId] = record;
    localStorage.setItem(`ile_property_alerts_${user.uid}`, JSON.stringify(stored));
    return true;
  } catch (err) {
    console.warn('Firestore alert save failed; preserving a per-user offline draft:', err);
    const stored = readLocalJson<Record<string, PropertyAlertPreference>>(`ile_property_alerts_${user.uid}`, {});
    stored[docId] = record;
    localStorage.setItem(`ile_property_alerts_${user.uid}`, JSON.stringify(stored));
    return false;
  }
}

export async function getPropertyAlertPreference(userId: string, propertyId: string): Promise<PropertyAlertPreference | null> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) return null;
  const docId = `${userId}_${propertyId}`;
  try {
    const snap = await getDoc(doc(db, ALERTS_COLLECTION, docId));
    if (snap.exists()) return snap.data() as PropertyAlertPreference;
  } catch (err) {
    console.warn('Firestore alert fetch error, checking current-user local storage:', err);
  }
  const stored = readLocalJson<Record<string, PropertyAlertPreference>>(`ile_property_alerts_${userId}`, {});
  return stored[docId] || null;
}

export async function removePropertyAlertPreference(userId: string, propertyId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) return false;
  const docId = `${userId}_${propertyId}`;
  try {
    await deleteDoc(doc(db, ALERTS_COLLECTION, docId));
  } catch (err) {
    console.warn('Firestore alert delete error:', err);
  }
  const stored = readLocalJson<Record<string, PropertyAlertPreference>>(`ile_property_alerts_${userId}`, {});
  delete stored[docId];
  localStorage.setItem(`ile_property_alerts_${userId}`, JSON.stringify(stored));
  return true;
}

/** Directory lookup is available only to signed-in users and returns an allowlisted public shape. */
export async function getAgentsByAgency(agencyName: string): Promise<AgentDirectoryProfile[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(query(collection(db, 'public_profiles'), where('agencyName', '==', agencyName)));
    return snap.docs.map(item => {
      const data = item.data();
      return {
        id: item.id,
        name: String(data.name || ''),
        role: data.role as User['role'],
        agencyName: typeof data.agencyName === 'string' ? data.agencyName : '',
        avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
      };
    });
  } catch (err) {
    console.warn('Firestore fetch agents note:', err);
    return [];
  }
}

/** Persist academy completion separately from the user's identity and financial profile. */
export async function saveAcademyProgressToFirestore(userId: string, completedLessonIds: string[]): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId || !Array.isArray(completedLessonIds) || completedLessonIds.length > 1000) return false;
  const cleaned = [...new Set(completedLessonIds.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 120))];
  try {
    await setDoc(doc(db, ACADEMY_COLLECTION, userId), {
      userId,
      completedLessonIds: cleaned,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore academy progress save failed:', err);
    return false;
  }
}

export async function getAcademyProgressFromFirestore(userId: string): Promise<string[]> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) return [];
  try {
    const snap = await getDoc(doc(db, ACADEMY_COLLECTION, userId));
    const ids = snap.exists() ? snap.data().completedLessonIds : [];
    return Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string' && id.length <= 120) : [];
  } catch (err) {
    console.warn('Firestore academy progress fetch failed:', err);
    return [];
  }
}

/** Client-side users cannot change another user's permissions. A trusted server/admin workflow is required. */
export async function updateUserPermissions(
  userId: string,
  updates: { brokerageRole?: 'Standard' | 'Manager'; isActive?: boolean },
): Promise<boolean> {
  console.warn('Agent permission changes require a trusted administrative workflow.', userId, updates);
  return false;
}
