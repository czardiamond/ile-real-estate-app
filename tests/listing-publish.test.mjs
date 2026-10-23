import assert from 'node:assert/strict';
import test from 'node:test';
import { createSubmissionGate, ListingSaveUnconfirmedError, publishListingWithMedia } from '../services/listingPublish.ts';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
const unexpected = () => { throw new Error('Unexpected operation'); };

test('submission gate blocks repeat clicks synchronously before a render and reopens after success', async () => {
  const run = createSubmissionGate();
  const save = deferred();
  let calls = 0;
  const publish = () => { calls++; return save.promise; };
  const first = run(publish);
  assert.equal(await run(publish), false);
  assert.equal(calls, 1);
  save.resolve();
  assert.equal(await first, true);
  assert.equal(await run(async () => { calls++; }), true);
  assert.equal(calls, 2);
});

test('submission gate releases after async rejection and synchronous throw', async () => {
  const run = createSubmissionGate();
  await assert.rejects(run(async () => { throw new Error('offline'); }), /offline/);
  await assert.rejects(run(() => { throw new Error('sync'); }), /sync/);
  assert.equal(await run(async () => {}), true);
});

test('successful publish preserves photo order and never deletes committed media', async () => {
  const slow = deferred();
  const deleted = [];
  let saved;
  const publish = publishListingWithMedia({ images: ['first', 'second'], video: 'clip', floorPlan: 'plan' }, {
    uploadPhoto: async (file, cleanup) => {
      cleanup(async () => deleted.push(file));
      if (file === 'first') await slow.promise;
      return `https://example.com/${file}`;
    },
    uploadAsset: async (file, kind, cleanup) => {
      cleanup(async () => deleted.push(file));
      return `https://example.com/${kind}/${file}`;
    },
    save: async media => { saved = media; return 'listing-id'; },
  });
  await tick();
  assert.equal(saved, undefined);
  slow.resolve();
  assert.equal(await publish, 'listing-id');
  assert.deepEqual(saved, {
    images: ['https://example.com/first', 'https://example.com/second'],
    videoUrl: 'https://example.com/videos/clip',
    floorPlanUrl: 'https://example.com/floor-plans/plan',
  });
  assert.deepEqual(deleted, []);
});

test('rollback waits for late uploads and late cleanup registration after an earlier photo fails', async () => {
  const slow = deferred();
  const events = [];
  const publish = publishListingWithMedia({ images: ['fail', 'late'] }, {
    uploadPhoto: async (file, cleanup) => {
      if (file === 'late') await slow.promise;
      cleanup(async () => events.push(`delete-${file}`));
      events.push(`upload-${file}`);
      if (file === 'fail') throw new Error('PUT failed');
      return `https://example.com/${file}`;
    },
    uploadAsset: unexpected,
    save: unexpected,
  });
  const rejected = assert.rejects(publish, /PUT failed/);
  await tick();
  assert.deepEqual(events, ['upload-fail']);
  slow.resolve();
  await rejected;
  assert.deepEqual(events, ['upload-fail', 'upload-late', 'delete-fail', 'delete-late']);
});

test('a synchronous photo failure still settles the other started uploads before rollback', async () => {
  let lateCompleted = false;
  let cleaned = false;
  await assert.rejects(publishListingWithMedia({ images: ['fail', 'late'] }, {
    uploadPhoto: (file, cleanup) => {
      if (file === 'fail') throw new Error('synchronous failure');
      cleanup(async () => { assert.equal(lateCompleted, true); cleaned = true; });
      return tick().then(() => { lateCompleted = true; return 'https://example.com/late'; });
    },
    uploadAsset: unexpected,
    save: unexpected,
  }), /synchronous failure/);
  assert.equal(cleaned, true);
});

test('uncertain save rejection retains photos, video and floor plan and warns before retrying', async () => {
  const deleted = [];
  const cause = new Error('Firestore response lost');
  await assert.rejects(publishListingWithMedia({ images: ['photo'], video: 'clip', floorPlan: 'plan' }, {
    uploadPhoto: async (file, cleanup) => { cleanup(async () => deleted.push(file)); return 'https://example.com/photo'; },
    uploadAsset: async (file, kind, cleanup) => { cleanup(async () => deleted.push(file)); return `https://example.com/${kind}`; },
    save: async () => { throw cause; },
  }), error => error instanceof ListingSaveUnconfirmedError && error.cause === cause && /Check your listings before trying again/.test(error.message) && /media was kept/.test(error.message));
  assert.deepEqual(deleted, []);
});

test('optional asset failure cleans partial objects and skips later assets and save', async () => {
  const deleted = [];
  const kinds = [];
  await assert.rejects(publishListingWithMedia({ images: ['photo'], video: 'clip', floorPlan: 'plan' }, {
    uploadPhoto: async (file, cleanup) => { cleanup(async () => deleted.push(file)); return 'https://example.com/photo'; },
    uploadAsset: async (file, kind, cleanup) => {
      kinds.push(kind);
      cleanup(async () => deleted.push(file));
      throw new Error('Storage unavailable');
    },
    save: unexpected,
  }), /Storage unavailable/);
  assert.deepEqual(kinds, ['videos']);
  assert.deepEqual(deleted, ['photo', 'clip']);
});

test('all cleanups are attempted even when some throw or reject, with a visible failure count', async () => {
  let finalCleanupRan = false;
  await assert.rejects(publishListingWithMedia({ images: ['photo'] }, {
    uploadPhoto: async (file, cleanup) => {
      cleanup(() => { throw new Error('sync delete failure'); });
      cleanup(async () => { throw new Error('async delete failure'); });
      cleanup(async () => { finalCleanupRan = true; });
      throw new Error('upload failed');
    },
    uploadAsset: unexpected,
    save: unexpected,
  }), error => error.cleanupFailures === 2 && /upload failed/.test(error.message) && /2 uploaded file\(s\) could not be removed/.test(error.message));
  assert.equal(finalCleanupRan, true);
});

test('photo-free listings call save without any storage operation', async () => {
  let saved;
  const result = await publishListingWithMedia({ images: [] }, {
    uploadPhoto: unexpected,
    uploadAsset: unexpected,
    save: async media => { saved = media; return 'photo-free-listing'; },
  });
  assert.equal(result, 'photo-free-listing');
  assert.deepEqual(saved, { images: [], videoUrl: undefined, floorPlanUrl: undefined });
});
