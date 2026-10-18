export type RegisterCleanup = (cleanup: () => Promise<unknown>) => void;

export class ListingPublishError extends Error {
  cleanupFailures: number;

  constructor(cause: unknown, cleanupFailures: number) {
    const message = cause instanceof Error ? cause.message : 'The upload or save failed. Check your connection and try again.';
    super(`${message}${cleanupFailures > 0 ? ` ${cleanupFailures} uploaded file(s) could not be removed and may need administrator cleanup.` : ''}`, { cause });
    this.name = 'ListingPublishError';
    this.cleanupFailures = cleanupFailures;
  }
}

export class ListingSaveUnconfirmedError extends Error {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? ` ${cause.message}` : '';
    super(`Could not confirm publication.${detail} Check your listings before trying again to avoid duplicates. Uploaded media was kept because the listing may already have been saved.`, { cause });
    this.name = 'ListingSaveUnconfirmedError';
  }
}

/** Locks immediately, before React can render a disabled button. Not server-side idempotency. */
export function createSubmissionGate() {
  let pending = false;
  return async (submit: () => Promise<void>): Promise<boolean> => {
    if (pending) return false;
    pending = true;
    try {
      await submit();
      return true;
    } finally {
      pending = false;
    }
  };
}

interface Media<T> {
  images: T[];
  video?: T;
  floorPlan?: T;
}

interface PublishedMedia {
  images: string[];
  videoUrl?: string;
  floorPlanUrl?: string;
}

interface PublishOperations<T, R> {
  uploadPhoto: (file: T, registerCleanup: RegisterCleanup) => Promise<string>;
  uploadAsset: (file: T, kind: 'videos' | 'floor-plans', registerCleanup: RegisterCleanup) => Promise<string>;
  save: (media: PublishedMedia) => Promise<R>;
}

/** Wait for every started upload before rollback; late PUTs must not recreate deleted objects. */
export async function publishListingWithMedia<T, R>(media: Media<T>, operations: PublishOperations<T, R>): Promise<R> {
  const cleanups: Array<() => Promise<unknown>> = [];
  const registerCleanup: RegisterCleanup = cleanup => { cleanups.push(cleanup); };
  let uploadedMedia: PublishedMedia;
  try {
    const photos = await Promise.allSettled(media.images.map(file =>
      Promise.resolve().then(() => operations.uploadPhoto(file, registerCleanup)),
    ));
    const failed = photos.find((photo): photo is PromiseRejectedResult => photo.status === 'rejected');
    if (failed) throw failed.reason;
    const images = photos.map(photo => (photo as PromiseFulfilledResult<string>).value);
    const videoUrl = media.video !== undefined ? await operations.uploadAsset(media.video, 'videos', registerCleanup) : undefined;
    const floorPlanUrl = media.floorPlan !== undefined ? await operations.uploadAsset(media.floorPlan, 'floor-plans', registerCleanup) : undefined;
    uploadedMedia = { images, videoUrl, floorPlanUrl };
  } catch (error) {
    const results = await Promise.allSettled(cleanups.map(cleanup => Promise.resolve().then(cleanup)));
    throw new ListingPublishError(error, results.filter(result => result.status === 'rejected').length);
  }
  // Storage and Firestore are not one transaction. Once saving starts, a rejected
  // response may still mean the listing committed. Prefer retained assets over
  // destroying a published listing's photos; reconciliation needs a trusted backend.
  try {
    return await operations.save(uploadedMedia);
  } catch (error) {
    throw new ListingSaveUnconfirmedError(error);
  }
}
