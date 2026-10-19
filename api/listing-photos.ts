import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

type HeaderValue = string | string[] | undefined;
type Request = { method?: string; headers: Record<string, HeaderValue>; body?: unknown };
type Response = { setHeader(name: string, value: string): void; status(code: number): Response; json(value: unknown): void };
type Payload = Record<string, unknown>;
type R2Configuration = { accountId: string; jurisdiction: 'default' | 'eu' | 'fedramp' | 'us'; bucketName: string; accessKeyId: string; secretAccessKey: string; publicBaseUrl: string };

const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 4.5 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 40_000_000;
const MAX_PHOTO_DIMENSION = 12_000;
const RATE_WINDOW_MS = 60_000;
const MAX_UPLOADS_PER_WINDOW = 20;
const uploadRateBuckets = new Map<string, { count: number; resetAt: number }>();

class InvalidInputError extends Error {}

function header(value: HeaderValue): string { return Array.isArray(value) ? value[0] || '' : value || ''; }
function isRecord(value: unknown): value is Payload { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function parseBody(value: unknown): Payload | null {
  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > MAX_REQUEST_BODY_BYTES) return null;
    try { value = JSON.parse(value); } catch { return null; }
  }
  return isRecord(value) ? value : null;
}

function validateBase64(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length === 0 || value.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new InvalidInputError('The photo payload must be valid base64 JPEG data.');
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length < 1 || decoded.length > MAX_PHOTO_BYTES || decoded.toString('base64') !== value) {
    throw new InvalidInputError('Each property photo must be a JPEG under 3 MB after sanitization.');
  }
  return decoded;
}

/** Validate the actual bytes and re-encode them as metadata-free JPEG on the server. */
export async function sanitizeServerPhoto(input: Uint8Array): Promise<Buffer> {
  if (!Buffer.isBuffer(input) || input.length < 1 || input.length > MAX_PHOTO_BYTES) throw new InvalidInputError('Each property photo must be a JPEG under 3 MB after sanitization.');
  try {
    const source = sharp(input, { limitInputPixels: MAX_PHOTO_PIXELS, failOn: 'error' });
    const metadata = await source.metadata();
    if (metadata.format !== 'jpeg') throw new InvalidInputError('Photos must be valid JPEG files.');
    if (!metadata.width || !metadata.height || metadata.width > MAX_PHOTO_DIMENSION || metadata.height > MAX_PHOTO_DIMENSION || metadata.width * metadata.height > MAX_PHOTO_PIXELS) {
      throw new InvalidInputError('This photo is too large to process safely.');
    }
    const output = await source.jpeg({ quality: 92, force: true }).toBuffer();
    if (output.length < 1 || output.length > MAX_PHOTO_BYTES) throw new InvalidInputError('The processed photo is too large. Choose a smaller photo.');
    return output;
  } catch (error) {
    if (error instanceof InvalidInputError) throw error;
    throw new InvalidInputError('The photo is not a valid JPEG or could not be safely processed.');
  }
}

export function isOwnedListingPhotoKey(uid: string, key: unknown): key is string {
  if (typeof key !== 'string' || key.length > 256) return false;
  const prefix = `listing-assets/${uid}/images/`;
  const filename = key.slice(prefix.length);
  return key.startsWith(prefix) && /^[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|avif|gif)$/i.test(filename);
}

export function getR2Configuration(env: NodeJS.ProcessEnv = process.env): R2Configuration | null {
  const accountId = env.R2_ACCOUNT_ID?.trim() || '';
  const jurisdiction = (env.R2_JURISDICTION?.trim().toLowerCase() || 'default') as R2Configuration['jurisdiction'];
  const bucketName = env.R2_BUCKET_NAME?.trim() || '';
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() || '';
  const rawPublicBaseUrl = env.R2_PUBLIC_BASE_URL?.trim() || '';
  if (!accountId || !/^[a-zA-Z0-9]+$/.test(accountId) || !['default', 'eu', 'fedramp', 'us'].includes(jurisdiction) || bucketName.length < 3 || bucketName.length > 63 || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketName) || !accessKeyId || !secretAccessKey || !rawPublicBaseUrl) return null;
  try {
    const publicUrl = new URL(rawPublicBaseUrl);
    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) return null;
    return { accountId, jurisdiction, bucketName, accessKeyId, secretAccessKey, publicBaseUrl: `${publicUrl.origin}${publicUrl.pathname.replace(/\/+$/, '')}` };
  } catch { return null; }
}

function publicObjectUrl(baseUrl: string, key: string): string { return `${baseUrl.replace(/\/+$/, '')}/${key.split('/').map(segment => encodeURIComponent(segment)).join('/')}`; }
function createR2Client(config: R2Configuration): S3Client {
  const jurisdictionSuffix = config.jurisdiction === 'default' ? '' : `.${config.jurisdiction}`;
  return new S3Client({ region: 'auto', endpoint: `https://${config.accountId}${jurisdictionSuffix}.r2.cloudflarestorage.com`, forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED', credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
}
async function verifyUserToken(token: string, projectId: string): Promise<string | null> {
  try { const { payload } = await jwtVerify(token, jwks, { audience: projectId, issuer: `https://securetoken.google.com/${projectId}`, algorithms: ['RS256'] }); return typeof payload.sub === 'string' && payload.sub ? payload.sub : null; } catch { return null; }
}
function allowUpload(uid: string): boolean {
  const now = Date.now(); const bucket = uploadRateBuckets.get(uid);
  if (!bucket || bucket.resetAt <= now) { uploadRateBuckets.set(uid, { count: 1, resetAt: now + RATE_WINDOW_MS }); return true; }
  bucket.count += 1; return bucket.count <= MAX_UPLOADS_PER_WINDOW;
}
function send(res: Response, status: number, body: unknown) { return res.status(status).json(body); }

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST' && req.method !== 'DELETE') { res.setHeader('Allow', 'POST, DELETE'); return send(res, 405, { error: 'Method not allowed.' }); }
  const origin = header(req.headers.origin); const host = header(req.headers['x-forwarded-host']) || header(req.headers.host);
  if (origin) { if (!host) return send(res, 403, { error: 'Cross-origin requests are not allowed.' }); try { if (new URL(origin).host.toLowerCase() !== host.split(',')[0].trim().toLowerCase()) return send(res, 403, { error: 'Cross-origin requests are not allowed.' }); } catch { return send(res, 403, { error: 'Invalid request origin.' }); } }
  const body = parseBody(req.body); if (!body) return send(res, 400, { error: 'The request body must be a valid JSON object.' });
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID; if (!projectId) return send(res, 503, { error: 'Firebase project ID is not configured on the server.' });
  const authorization = header(req.headers.authorization); const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''; const uid = token ? await verifyUserToken(token, projectId) : null; if (!uid) return send(res, 401, { error: 'A valid signed-in account is required.' });
  const config = getR2Configuration(); if (!config) return send(res, 503, { error: 'Property photo uploads are unavailable because Cloudflare R2 is not configured.' });
  try {
    if (req.method === 'POST') {
      if (!allowUpload(uid)) return send(res, 429, { error: 'Too many photo uploads. Wait a minute and try again.' });
      const sanitized = await sanitizeServerPhoto(validateBase64(body.data));
      const key = `listing-assets/${uid}/images/${randomUUID()}.jpg`; const r2 = createR2Client(config);
      try { await r2.send(new PutObjectCommand({ Bucket: config.bucketName, Key: key, Body: sanitized, ContentType: 'image/jpeg', ContentLength: sanitized.length })); } finally { r2.destroy(); }
      return send(res, 200, { publicUrl: publicObjectUrl(config.publicBaseUrl, key), key });
    }
    if (!isOwnedListingPhotoKey(uid, body.key)) return send(res, 400, { error: 'The requested photo key is invalid.' });
    const r2 = createR2Client(config); try { await r2.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: body.key })); } finally { r2.destroy(); }
    return send(res, 200, { ok: true });
  } catch (error) {
    if (error instanceof InvalidInputError) return send(res, 400, { error: error.message });
    console.error('Cloudflare R2 listing-photo request failed:', error instanceof Error ? error.name : 'unknown error');
    return send(res, 502, { error: 'Cloudflare R2 could not process the photo request. Please try again.' });
  }
}
