import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';

type HeaderValue = string | string[] | undefined;
type Request = {
  method?: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
};
type Response = {
  setHeader(name: string, value: string): void;
  status(code: number): Response;
  json(value: unknown): void;
};
type Payload = Record<string, unknown>;
type PhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif';
type R2Configuration = {
  accountId: string;
  jurisdiction: 'default' | 'eu' | 'fedramp' | 'us';
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const RATE_WINDOW_MS = 60_000;
const MAX_UPLOAD_URLS_PER_WINDOW = 20;
const ALLOWED_PHOTO_TYPES = new Set<PhotoContentType>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);
const uploadRateBuckets = new Map<string, { count: number; resetAt: number }>();

class InvalidInputError extends Error {}

function header(value: HeaderValue): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function isRecord(value: unknown): value is Payload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseBody(value: unknown): Payload | null {
  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > 4 * 1024) return null;
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isRecord(value) ? value : null;
}

export function validatePhotoMetadata(contentType: unknown, size: unknown): { contentType: PhotoContentType; size: number } {
  if (typeof contentType !== 'string') throw new InvalidInputError('Choose a supported photo format.');
  const normalizedType = contentType.split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_PHOTO_TYPES.has(normalizedType as PhotoContentType)) {
    throw new InvalidInputError('Choose a JPEG, PNG, WebP, AVIF, or GIF photo.');
  }
  if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 1 || size > MAX_PHOTO_BYTES) {
    throw new InvalidInputError('Each property photo must be under 10 MB.');
  }
  return { contentType: normalizedType as PhotoContentType, size };
}

export function isOwnedListingPhotoKey(uid: string, key: unknown): key is string {
  if (typeof key !== 'string' || key.length > 256) return false;
  const prefix = `listing-assets/${uid}/images/`;
  if (!key.startsWith(prefix)) return false;
  const filename = key.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(?:jpg|png|webp|avif|gif)$/.test(filename);
}

export function getR2Configuration(env: NodeJS.ProcessEnv = process.env): R2Configuration | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() || '';
  const jurisdiction = (env.R2_JURISDICTION?.trim().toLowerCase() || 'default') as R2Configuration['jurisdiction'];
  const bucketName = env.R2_BUCKET_NAME?.trim() || '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() || '';
  const rawPublicBaseUrl = env.R2_PUBLIC_BASE_URL?.trim() || '';

  if (!accountId || !/^[a-zA-Z0-9]+$/.test(accountId)) return null;
  if (!['default', 'eu', 'fedramp', 'us'].includes(jurisdiction)) return null;
  if (bucketName.length < 3 || bucketName.length > 63 || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketName)) return null;
  if (!accessKeyId || !secretAccessKey || !rawPublicBaseUrl) return null;

  try {
    const publicUrl = new URL(rawPublicBaseUrl);
    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) return null;
    const publicBaseUrl = `${publicUrl.origin}${publicUrl.pathname.replace(/\/+$/, '')}`;
    return { accountId, jurisdiction, bucketName, accessKeyId, secretAccessKey, publicBaseUrl };
  } catch {
    return null;
  }
}

function publicObjectUrl(baseUrl: string, key: string): string {
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `${baseUrl.replace(/\/+$/, '')}/${encodedKey}`;
}

function createR2Client(config: R2Configuration): S3Client {
  const jurisdictionSuffix = config.jurisdiction === 'default' ? '' : `.${config.jurisdiction}`;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}${jurisdictionSuffix}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    // The browser supplies the body later. Do not calculate an empty-body CRC32
    // while presigning; PutObject does not require a checksum.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function createPhotoUploadUrl(
  config: R2Configuration, key: string, contentType: unknown, size: unknown,
): Promise<string> {
  const metadata = validatePhotoMetadata(contentType, size);
  const r2 = createR2Client(config);
  try {
    return await getSignedUrl(r2, new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: metadata.contentType,
      ContentLength: metadata.size,
    }), {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      // ContentType alone is not signed by the installed S3 presigner.
      signableHeaders: new Set(['content-type']),
    });
  } finally {
    r2.destroy();
  }
}

async function verifyUserToken(token: string, projectId: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      algorithms: ['RS256'],
    });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

function allowUploadUrl(uid: string): boolean {
  const now = Date.now();
  const bucket = uploadRateBuckets.get(uid);
  if (!bucket || bucket.resetAt <= now) {
    uploadRateBuckets.set(uid, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= MAX_UPLOAD_URLS_PER_WINDOW;
}

function send(res: Response, status: number, body: unknown) {
  return res.status(status).json(body);
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  const origin = header(req.headers.origin);
  const host = header(req.headers['x-forwarded-host']) || header(req.headers.host);
  if (origin) {
    if (!host) return send(res, 403, { error: 'Cross-origin requests are not allowed.' });
    try {
      if (new URL(origin).host.toLowerCase() !== host.split(',')[0].trim().toLowerCase()) {
        return send(res, 403, { error: 'Cross-origin requests are not allowed.' });
      }
    } catch {
      return send(res, 403, { error: 'Invalid request origin.' });
    }
  }

  const body = parseBody(req.body);
  if (!body) return send(res, 400, { error: 'The request body must be a valid JSON object.' });

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return send(res, 503, { error: 'Firebase project ID is not configured on the server.' });

  const authorization = header(req.headers.authorization);
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const uid = token ? await verifyUserToken(token, projectId) : null;
  if (!uid) return send(res, 401, { error: 'A valid signed-in account is required.' });

  const config = getR2Configuration();
  if (!config) {
    return send(res, 503, { error: 'Property photo uploads are unavailable because Cloudflare R2 is not configured.' });
  }

  try {
    if (req.method === 'POST') {
      let metadata: { contentType: PhotoContentType; size: number };
      try {
        metadata = validatePhotoMetadata(body.contentType, body.size);
      } catch (error) {
        if (error instanceof InvalidInputError) return send(res, 400, { error: error.message });
        throw error;
      }
      if (!allowUploadUrl(uid)) return send(res, 429, { error: 'Too many photo uploads. Wait a minute and try again.' });

      const extensionByType: Record<PhotoContentType, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/avif': 'avif',
        'image/gif': 'gif',
      };
      const key = `listing-assets/${uid}/images/${randomUUID()}.${extensionByType[metadata.contentType]}`;
      const uploadUrl = await createPhotoUploadUrl(config, key, metadata.contentType, metadata.size);

      return send(res, 200, {
        uploadUrl,
        publicUrl: publicObjectUrl(config.publicBaseUrl, key),
        key,
        headers: { 'Content-Type': metadata.contentType },
      });
    }

    if (!isOwnedListingPhotoKey(uid, body.key)) {
      return send(res, 400, { error: 'The requested photo key is invalid.' });
    }
    const r2 = createR2Client(config);
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: body.key }));
    } finally {
      r2.destroy();
    }
    return send(res, 200, { ok: true });
  } catch (error) {
    // Avoid logging request bodies, credentials, or signed URLs.
    console.error('Cloudflare R2 listing-photo request failed:', error instanceof Error ? error.name : 'unknown error');
    return send(res, 502, { error: 'Cloudflare R2 could not process the photo request. Please try again.' });
  }
}
