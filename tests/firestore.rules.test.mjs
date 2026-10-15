import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-ile-rules';
const NOW = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

function publicProperty(ownerId = 'owner-1', overrides = {}) {
  return {
    ownerId,
    agentId: ownerId,
    title: 'Private title test listing',
    description: 'A verified-safe description for a test listing.',
    price: 20_000_000,
    period: 'total',
    location: { address: '12 Private Street', area: 'Lekki Phase 1', city: 'Lagos', state: 'Lagos' },
    type: 'Land',
    status: 'Available',
    specs: { sizeSqM: 500 },
    features: ['Fenced'],
    images: ['https://example.com/property.jpg'],
    isVerified: false,
    verificationStatus: 'Pending',
    verificationLevel: 'NONE',
    floodRisk: 'Not assessed',
    isSolarPowered: false,
    waterSource: 'Not specified',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function publicProjection(source, overrides = {}) {
  return {
    publicProjectionVersion: 1,
    agentId: source.agentId,
    title: source.title,
    description: source.description,
    price: source.price,
    period: source.period,
    location: { area: source.location.area, city: source.location.city, state: source.location.state },
    type: source.type,
    status: source.status,
    specs: source.specs,
    features: source.features,
    images: source.images,
    isVerified: source.isVerified,
    verificationStatus: source.verificationStatus,
    verificationLevel: source.verificationLevel,
    floodRisk: source.floodRisk,
    isSolarPowered: source.isSolarPowered,
    waterSource: source.waterSource,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    ...overrides,
  };
}

async function seedListing(id = 'listing-1', ownerId = 'owner-1') {
  const source = publicProperty(ownerId);
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'properties', id), source);
    await setDoc(doc(db, 'public_listings', id), publicProjection(source));
  });
  return source;
}

function validUserProfile(userId = 'alice', overrides = {}) {
  return {
    id: userId,
    name: 'Alice Test',
    email: 'alice@example.com',
    phone: '',
    role: 'Public',
    avatarUrl: '',
    verified: false,
    verification: { status: 'Unverified' },
    referralCode: '',
    networkRank: 'Scout',
    downlineCount: 0,
    wallet: { balance: 0, lifetimeEarnings: 0, pendingClearance: 0 },
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe('public and private property records', () => {
  it('allows anonymous users to read/query safe public listings, but not owner records', async () => {
    await seedListing();
    const anonymous = testEnv.unauthenticatedContext().firestore();
    const publicSnap = await assertSucceeds(getDoc(doc(anonymous, 'public_listings', 'listing-1')));
    assert.equal(publicSnap.data().location.address, undefined);
    assert.equal(publicSnap.data().ownerId, undefined);
    assert.equal(publicSnap.data().coordinates, undefined);
    assert.equal(publicSnap.data().smartMeterId, undefined);
    await assertSucceeds(getDocs(query(
      collection(anonymous, 'public_listings'),
      where('publicProjectionVersion', '==', 1),
      where('status', 'in', ['Available', 'Under Offer', 'Taken']),
      orderBy('createdAt', 'desc'),
    )));
    await assertFails(getDocs(collection(anonymous, 'public_listings')));
    await assertFails(getDoc(doc(anonymous, 'properties', 'listing-1')));
  });

  it('limits private listing reads to the owner and trusted admin', async () => {
    await seedListing();
    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    const otherDb = testEnv.authenticatedContext('other-user').firestore();
    const adminDb = testEnv.authenticatedContext('moderator', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'properties', 'listing-1')));
    await assertFails(getDoc(doc(otherDb, 'properties', 'listing-1')));
    await assertSucceeds(getDoc(doc(adminDb, 'properties', 'listing-1')));
  });

  it('blocks anonymous access to malformed legacy public projections', async () => {
    const privateSource = publicProperty('owner-1');
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'public_listings', 'legacy-extra'), publicProjection(privateSource, { ownerEmail: 'private@example.com' }));
      await setDoc(doc(db, 'public_listings', 'legacy-nested'), publicProjection(privateSource, { images: [{ token: 'private-data' }] }));
    });
    const anonymous = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymous, 'public_listings', 'legacy-extra')));
    await assertFails(getDoc(doc(anonymous, 'public_listings', 'legacy-nested')));
  });

  it('allows anonymous queries only for versioned safe projections and excludes legacy private fields', async () => {
    await seedListing('safe-listing');
    const legacySource = publicProperty('legacy-owner');
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'public_listings', 'legacy-private-field'), publicProjection(legacySource, {
        publicProjectionVersion: 0,
        ownerEmail: 'private@example.com',
      }));
      await setDoc(doc(db, 'public_listings', 'legacy-unknown-field'), publicProjection(legacySource, {
        publicProjectionVersion: 0,
        legacySecret: 'must-not-be-public',
      }));
    });

    const anonymous = testEnv.unauthenticatedContext().firestore();
    const safeQuery = query(
      collection(anonymous, 'public_listings'),
      where('publicProjectionVersion', '==', 1),
      where('status', 'in', ['Available', 'Under Offer', 'Taken']),
      orderBy('createdAt', 'desc'),
    );
    const safeResults = await assertSucceeds(getDocs(safeQuery));
    assert.deepEqual(safeResults.docs.map(document => document.id), ['safe-listing']);
    assert.equal(safeResults.docs[0].data().ownerEmail, undefined);
    assert.equal(safeResults.docs[0].data().legacySecret, undefined);

    const unversionedQuery = query(
      collection(anonymous, 'public_listings'),
      where('status', 'in', ['Available', 'Under Offer', 'Taken']),
      orderBy('createdAt', 'desc'),
    );
    await assertFails(getDocs(unversionedQuery));
    await assertFails(getDoc(doc(anonymous, 'public_listings', 'legacy-private-field')));
    await assertFails(getDoc(doc(anonymous, 'public_listings', 'legacy-unknown-field')));
  });

  it('requires an atomic private record + sanitized public projection to publish', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    const privateRef = doc(db, 'properties', 'new-listing');
    const publicRef = doc(db, 'public_listings', 'new-listing');
    const createdAt = serverTimestamp();
    const source = publicProperty('alice', { createdAt, updatedAt: createdAt });
    const projection = publicProjection(source, { createdAt, updatedAt: createdAt });
    const batch = writeBatch(db);
    batch.set(privateRef, source);
    batch.set(publicRef, projection);
    await assertSucceeds(batch.commit());
  });

  it('rejects sensitive fields from public projections and client-created verified listings', async () => {
    await seedListing('unsafe-listing', 'alice');
    const db = testEnv.authenticatedContext('alice').firestore();
    const publicRef = doc(db, 'public_listings', 'unsafe-listing');
    await assertFails(updateDoc(publicRef, { ownerEmail: 'secret@example.com' }));
    await assertFails(updateDoc(publicRef, { images: [{ ownerEmail: 'private@example.com' }] }));

    const forgedSource = publicProperty('alice', { isVerified: true, verificationStatus: 'Verified', verificationLevel: 'DOCUMENT_REVIEWED' });
    const forgedProjection = publicProjection(forgedSource);
    const forgedBatch = writeBatch(db);
    forgedBatch.set(doc(db, 'properties', 'forged'), forgedSource);
    forgedBatch.set(doc(db, 'public_listings', 'forged'), forgedProjection);
    await assertFails(forgedBatch.commit());
  });

  it('keeps public and private listing updates synchronized and blocks cross-owner writes', async () => {
    await seedListing();
    const ownerDb = testEnv.authenticatedContext('owner-1').firestore();
    const otherDb = testEnv.authenticatedContext('other-user').firestore();
    const updatedAt = serverTimestamp();
    const images = ['https://example.com/front.jpg', 'https://example.com/kitchen.jpg'];
    const features = ['Fenced', 'Gated'];
    const batch = writeBatch(ownerDb);
    batch.update(doc(ownerDb, 'properties', 'listing-1'), { status: 'Under Offer', images, features, updatedAt });
    batch.set(doc(ownerDb, 'public_listings', 'listing-1'), publicProjection(
      publicProperty('owner-1', { status: 'Under Offer', images, features, updatedAt }),
      { updatedAt },
    ));
    await assertSucceeds(batch.commit());
    await assertFails(updateDoc(doc(otherDb, 'properties', 'listing-1'), { status: 'Taken' }));
    await assertFails(updateDoc(doc(otherDb, 'public_listings', 'listing-1'), { title: 'Hijacked' }));
  });

  it('allows a trusted admin to review a listing atomically without exposing reviewer identity', async () => {
    await seedListing();
    const adminDb = testEnv.authenticatedContext('moderator', { admin: true }).firestore();
    const updatedAt = serverTimestamp();
    const batch = writeBatch(adminDb);
    batch.update(doc(adminDb, 'properties', 'listing-1'), {
      isVerified: true,
      verificationStatus: 'Verified',
      verificationLevel: 'DOCUMENT_REVIEWED',
      verifiedAt: serverTimestamp(),
      verifiedBy: 'moderator',
      updatedAt,
    });
    batch.update(doc(adminDb, 'public_listings', 'listing-1'), {
      isVerified: true,
      verificationStatus: 'Verified',
      verificationLevel: 'DOCUMENT_REVIEWED',
      updatedAt,
    });
    await assertSucceeds(batch.commit());
    const anonymous = testEnv.unauthenticatedContext().firestore();
    const publicRecord = await assertSucceeds(getDoc(doc(anonymous, 'public_listings', 'listing-1')));
    assert.equal(publicRecord.data().verifiedBy, undefined);
    assert.equal(publicRecord.data().location.address, undefined);
  });
});

describe('user profiles and directory', () => {
  it('allows self-creation only with unprivileged defaults and private owner reads', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(aliceDb, 'users', 'alice'), validUserProfile('alice')));
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'users', 'alice')));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'users', 'alice')));

    await assertFails(setDoc(doc(bobDb, 'users', 'bob'), validUserProfile('bob', { role: 'Admin' })));
    await assertFails(setDoc(doc(bobDb, 'users', 'bob'), validUserProfile('bob', { wallet: { balance: 10, lifetimeEarnings: 0, pendingClearance: 0 } })));
  });

  it('exposes only allowlisted directory fields to authenticated users', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'public_profiles', 'agent-1'), {
        id: 'agent-1', name: 'Agent One', role: 'Agent', agencyName: 'Ilé', avatarUrl: '', updatedAt: NOW,
      });
      await setDoc(doc(context.firestore(), 'public_profiles', 'legacy-private'), {
        id: 'legacy-private', name: 'Private Name', role: 'Agent', agencyName: 'Ilé', avatarUrl: '', email: 'private@example.com', updatedAt: NOW,
      });
    });
    const anonymous = testEnv.unauthenticatedContext().firestore();
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(anonymous, 'public_profiles', 'agent-1')));
    await assertSucceeds(getDoc(doc(aliceDb, 'public_profiles', 'agent-1')));
    await assertFails(getDoc(doc(aliceDb, 'public_profiles', 'legacy-private')));
    await assertFails(setDoc(doc(aliceDb, 'public_profiles', 'alice'), {
      id: 'alice', name: 'Alice', role: 'Agent', agencyName: '', avatarUrl: '', email: 'private@example.com', updatedAt: serverTimestamp(),
    }));
  });

  it('allows signed-in agent-directory queries over sanitized public profiles', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'public_profiles', 'agent-1'), {
        id: 'agent-1', name: 'Agent One', role: 'Agent', agencyName: 'Ilé', avatarUrl: '', updatedAt: NOW,
      });
    });
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const directoryQuery = query(collection(aliceDb, 'public_profiles'), where('agencyName', '==', 'Ilé'));
    assert.equal((await assertSucceeds(getDocs(directoryQuery))).size, 1);
  });
});

describe('leads, alerts and chat', () => {
  it('lets a buyer create/read their enquiry and the listing owner read/update it', async () => {
    await seedListing('listing-1', 'agent-1');
    const buyerDb = testEnv.authenticatedContext('buyer-1').firestore();
    const leadData = {
      id: 'lead-1', buyerId: 'buyer-1', agentId: 'agent-1', propertyId: 'listing-1',
      name: 'Buyer One', email: 'buyer@example.com', phone: '', budget: 0, value: 20_000_000,
      notes: 'I would like to arrange a viewing.', status: 'New Arrival',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(doc(buyerDb, 'leads', 'lead-1'), leadData));
    await assertSucceeds(getDoc(doc(buyerDb, 'leads', 'lead-1')));

    const agentDb = testEnv.authenticatedContext('agent-1').firestore();
    const agentQuery = query(collection(agentDb, 'leads'), where('agentId', '==', 'agent-1'));
    await assertSucceeds(getDocs(agentQuery));
    await assertSucceeds(updateDoc(doc(agentDb, 'leads', 'lead-1'), { status: 'Talking', updatedAt: serverTimestamp() }));
    const outsiderDb = testEnv.authenticatedContext('outsider').firestore();
    await assertFails(getDoc(doc(outsiderDb, 'leads', 'lead-1')));
    await assertFails(setDoc(doc(buyerDb, 'leads', 'spoofed'), { ...leadData, id: 'spoofed', agentId: 'outsider' }));
  });

  it('restricts property alert records to their UID and expected document key', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const alert = {
      id: 'alice_listing-1', userId: 'alice', userEmail: 'alice@example.com',
      propertyId: 'listing-1', propertyTitle: 'Listing', propertyPrice: 12_000_000,
      locationArea: 'Lekki', notifyPriceDrop: true, notifySimilarListings: false,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await assertSucceeds(setDoc(doc(aliceDb, 'property_alerts', alert.id), alert));
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'property_alerts', alert.id)));
    await assertFails(setDoc(doc(bobDb, 'property_alerts', 'alice_listing-2'), { ...alert, propertyId: 'listing-2' }));
  });

  it('stores append-only chat under the owner UID and prevents another user from reading or rewriting it', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const messageRef = doc(aliceDb, 'chat_messages', 'alice-message');
    await assertSucceeds(setDoc(messageRef, {
      userId: 'alice', chatType: 'ile_ai', role: 'user', text: 'Private enquiry details', timestamp: serverTimestamp(),
    }));
    await assertSucceeds(getDocs(query(collection(aliceDb, 'chat_messages'), where('userId', '==', 'alice'), where('chatType', '==', 'ile_ai'))));
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'chat_messages', 'alice-message')));
    await assertFails(updateDoc(messageRef, { userId: 'bob' }));
    await assertFails(updateDoc(messageRef, { text: 'rewritten by owner' }));
    await assertSucceeds(deleteDoc(messageRef));
  });
});

describe('title review and academy progress', () => {
  it('binds title documents to the submitting user and disallows public download URLs', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(aliceDb, 'verifications', 'alice-title'), {
      userId: 'alice', titleNumber: 'LA-C-O-2026-88910', storagePath: 'titles/alice/title_1.pdf',
      status: 'pending', createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(aliceDb, 'verifications', 'wrong-owner'), {
      userId: 'alice', titleNumber: 'LA-C-O-2026-88911', storagePath: 'titles/bob/title_1.pdf',
      status: 'pending', createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(aliceDb, 'verifications', 'public-url'), {
      userId: 'alice', titleNumber: 'LA-C-O-2026-88912', documentUrl: 'https://example.com/private.pdf',
      status: 'pending', createdAt: serverTimestamp(),
    }));
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'verifications', 'alice-title')));
    const adminDb = testEnv.authenticatedContext('moderator', { admin: true }).firestore();
    await assertSucceeds(updateDoc(doc(adminDb, 'verifications', 'alice-title'), { status: 'approved' }));
  });

  it('keeps academy completion private and UID-bound', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(aliceDb, 'academy_progress', 'alice'), {
      userId: 'alice', completedLessonIds: ['lesson-1', 'lesson-2'], updatedAt: serverTimestamp(),
    }));
    const bobDb = testEnv.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bobDb, 'academy_progress', 'alice')));
    await assertFails(setDoc(doc(bobDb, 'academy_progress', 'bob'), {
      userId: 'bob', completedLessonIds: ['lesson-1'], wallet: { balance: 100 }, updatedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'academy_progress', 'alice')));
  });

  it('denies unknown collections by default', async () => {
    await assertFails(getDoc(doc(testEnv.authenticatedContext('alice').firestore(), 'private_unknown', 'x')));
    await assertFails(setDoc(doc(testEnv.authenticatedContext('alice').firestore(), 'private_unknown', 'x'), { value: 'no' }));
  });
});
