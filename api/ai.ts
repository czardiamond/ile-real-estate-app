import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PropertyType } from '../types';
import type { Property } from '../types';
import {
  analyzeBuyerIntentFromChatLogs,
  analyzeLeadPotential,
  chatWithIle,
  explainRealEstateTerm,
  generateAcademyLesson,
  generateListingFromRawText,
  generateMarketingKit,
  generateMarketingTip,
  generatePropertyDescription,
  generateTenancyAgreement,
  getAi,
  processVoiceNoteToListing,
  transcribeAudioToDescription,
} from './geminiCore';

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

class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_PROPERTY_PRICE = 1_000_000_000_000_000;
const ALLOWED_PERIODS = new Set(['per year', 'per day', 'per month', 'total']);
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/aac',
  'audio/flac',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-wav',
]);

function header(value: HeaderValue): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function send(res: Response, status: number, body: unknown) {
  res.status(status).json(body);
}

function isRecord(value: unknown): value is Payload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown, field: string, optional = false): Payload {
  if (value === undefined || value === null) {
    if (optional) return {};
    throw new InvalidInputError(`${field} is required.`);
  }
  if (!isRecord(value)) throw new InvalidInputError(`${field} must be an object.`);
  return value;
}

function readText(value: unknown, field: string, maxLength: number, required = false): string {
  if (value === undefined || value === null) {
    if (!required) return '';
    throw new InvalidInputError(`${field} is required.`);
  }
  if (typeof value !== 'string') throw new InvalidInputError(`${field} must be text.`);
  if (value.length > maxLength) throw new InvalidInputError(`${field} must be ${maxLength} characters or fewer.`);
  const text = value.trim();
  if (required && !text) throw new InvalidInputError(`${field} is required.`);
  return text;
}

function readNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  optional = false,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    if (optional) return undefined;
    throw new InvalidInputError(`${field} is required.`);
  }
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new InvalidInputError(`${field} must be a finite number between ${min} and ${max}.`);
  }
  return number;
}

function sanitizeProperty(value: unknown, field: string): Partial<Property> {
  const source = readRecord(value, field);
  const locationInput = readRecord(source.location, `${field}.location`, true);
  const specsInput = readRecord(source.specs, `${field}.specs`, true);
  const featureInput = source.features === undefined ? [] : source.features;
  if (!Array.isArray(featureInput) || featureInput.length > 30) {
    throw new InvalidInputError(`${field}.features must be an array of at most 30 items.`);
  }
  const features = featureInput.map((feature, index) => readText(feature, `${field}.features[${index}]`, 120, true));
  const typeText = readText(source.type, `${field}.type`, 100);
  const propertyTypes = Object.values(PropertyType) as string[];
  if (typeText && !propertyTypes.includes(typeText)) {
    throw new InvalidInputError(`${field}.type is invalid.`);
  }

  let period: Property['period'];
  if (source.period !== undefined && source.period !== null && source.period !== '') {
    if (typeof source.period !== 'string' || !ALLOWED_PERIODS.has(source.period)) {
      throw new InvalidInputError(`${field}.period is invalid.`);
    }
    period = source.period as Property['period'];
  }

  let coordinates: Property['coordinates'];
  if (source.coordinates !== undefined && source.coordinates !== null) {
    const coordinateInput = readRecord(source.coordinates, `${field}.coordinates`);
    const lat = readNumber(coordinateInput.lat, `${field}.coordinates.lat`, -90, 90);
    const lng = readNumber(coordinateInput.lng, `${field}.coordinates.lng`, -180, 180);
    coordinates = { lat: lat!, lng: lng! };
  }

  const specs = {
    bedrooms: readNumber(specsInput.bedrooms, `${field}.specs.bedrooms`, 0, 1_000_000, true),
    bathrooms: readNumber(specsInput.bathrooms, `${field}.specs.bathrooms`, 0, 1_000_000, true),
    sizeSqM: readNumber(specsInput.sizeSqM, `${field}.specs.sizeSqM`, 0, 1_000_000, true),
    capacity: readNumber(specsInput.capacity, `${field}.specs.capacity`, 0, 1_000_000, true),
    parkingSpaces: readNumber(specsInput.parkingSpaces, `${field}.specs.parkingSpaces`, 0, 1_000_000, true),
  };

  return {
    title: readText(source.title, `${field}.title`, 200),
    type: typeText ? typeText as PropertyType : undefined,
    price: readNumber(source.price, `${field}.price`, 0, MAX_PROPERTY_PRICE, true) ?? 0,
    period,
    location: {
      address: readText(locationInput.address, `${field}.location.address`, 200),
      area: readText(locationInput.area, `${field}.location.area`, 150),
      city: readText(locationInput.city, `${field}.location.city`, 100),
      state: readText(locationInput.state, `${field}.location.state`, 100),
    },
    features,
    specs,
    coordinates,
  };
}

function sanitizeChatHistory(value: unknown): Array<{ role: 'user' | 'model'; text: string }> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 30) {
    throw new InvalidInputError('history must contain at most 30 messages.');
  }
  let totalCharacters = 0;
  return value.map((item, index) => {
    const message = readRecord(item, `history[${index}]`);
    if (message.role !== 'user' && message.role !== 'model') {
      throw new InvalidInputError(`history[${index}].role must be user or model.`);
    }
    const text = readText(message.text, `history[${index}].text`, 6_000, true);
    totalCharacters += text.length;
    if (totalCharacters > 20_000) {
      throw new InvalidInputError('Conversation history must contain 20,000 characters or fewer.');
    }
    return { role: message.role, text };
  });
}

function sanitizeMediaInput(value: unknown): { type: 'audio' | 'text'; data: string; mimeType?: string } {
  const input = readRecord(value, 'input');
  if (input.type !== 'audio' && input.type !== 'text') {
    throw new InvalidInputError('input.type must be audio or text.');
  }
  const data = readText(input.data, 'input.data', input.type === 'audio' ? 3_500_000 : 20_000, true);
  if (input.type === 'text') return { type: 'text', data };

  const suppliedMimeType = readText(input.mimeType, 'input.mimeType', 100) || 'audio/webm';
  const mimeType = suppliedMimeType.split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    throw new InvalidInputError('input.mimeType must be a supported audio format.');
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    throw new InvalidInputError('Audio data must be valid base64.');
  }
  return { type: 'audio', data, mimeType };
}

async function verifyUserToken(token: string, projectId: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      algorithms: ['RS256'],
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function limitFor(uid: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(uid);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(uid, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= MAX_REQUESTS_PER_WINDOW;
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  const origin = header(req.headers.origin);
  const host = header(req.headers['x-forwarded-host']) || header(req.headers.host);
  if (origin && host) {
    try {
      if (new URL(origin).host !== host.split(',')[0].trim()) {
        return send(res, 403, { error: 'Cross-origin requests are not allowed.' });
      }
    } catch {
      return send(res, 403, { error: 'Invalid request origin.' });
    }
  }

  let body: unknown = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
      return send(res, 413, { error: 'The request is too large.' });
    }
    try {
      body = JSON.parse(body);
    } catch {
      return send(res, 400, { error: 'Invalid JSON request.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return send(res, 400, { error: 'The request body must be a JSON object.' });
  }
  let serializedBody: string;
  try {
    serializedBody = JSON.stringify(body);
  } catch {
    return send(res, 400, { error: 'Invalid JSON request.' });
  }
  if (Buffer.byteLength(serializedBody, 'utf8') > MAX_BODY_BYTES) {
    return send(res, 413, { error: 'The request is too large.' });
  }
  if (!isRecord(body)) return send(res, 400, { error: 'The request body must be a JSON object.' });
  if (body.payload !== undefined && !isRecord(body.payload)) {
    return send(res, 400, { error: 'payload must be a JSON object.' });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return send(res, 503, { error: 'Firebase project ID is not configured on the server.' });

  const authorization = header(req.headers.authorization);
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const uid = token ? await verifyUserToken(token, projectId) : null;
  if (!uid) return send(res, 401, { error: 'A valid signed-in account is required.' });
  if (!limitFor(uid)) return send(res, 429, { error: 'Too many AI requests. Please wait a minute and try again.' });

  if (!process.env.GEMINI_API_KEY) {
    return send(res, 503, { error: 'AI is not configured. Add GEMINI_API_KEY to the server environment.' });
  }

  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const payload: Payload = body.payload === undefined ? {} : body.payload as Payload;

  try {
    let result: unknown;
    switch (action) {
      case 'tenancy_agreement': {
        const period = payload.period;
        if (period !== 'per month' && period !== 'per year') {
          throw new InvalidInputError('period must be per month or per year.');
        }
        result = await generateTenancyAgreement(
          readText(payload.tenantName, 'tenantName', 150, true),
          readText(payload.landlordName, 'landlordName', 150, true),
          readText(payload.address, 'address', 500, true),
          readNumber(payload.amount, 'amount', 1, MAX_PROPERTY_PRICE)!,
          period,
          readText(payload.duration, 'duration', 100),
        );
        break;
      }
      case 'listing_from_text':
        result = await generateListingFromRawText(readText(payload.rawInput, 'rawInput', 20_000, true));
        break;
      case 'property_description':
        result = await generatePropertyDescription(sanitizeProperty(payload.propertyData, 'propertyData'));
        break;
      case 'chat': {
        const history = sanitizeChatHistory(payload.history);
        const newMessage = readText(payload.newMessage, 'newMessage', 8_000, true);
        result = await chatWithIle(history, newMessage);
        break;
      }
      case 'analyze_lead':
        result = await analyzeLeadPotential(
          readText(payload.leadNotes, 'leadNotes', 10_000, true),
          readNumber(payload.propertyPrice, 'propertyPrice', 0, MAX_PROPERTY_PRICE)!,
        );
        break;
      case 'marketing_tip':
        result = await generateMarketingTip();
        break;
      case 'academy_lesson':
        result = await generateAcademyLesson(readText(payload.topic, 'topic', 500, true));
        break;
      case 'marketing_kit': {
        const property = sanitizeProperty(payload.property, 'property');
        if (!property.title || !property.location?.area || !property.location.city) {
          throw new InvalidInputError('property.title, property.location.area, and property.location.city are required.');
        }
        // The prompt helper uses only the fields in the allowlisted object above.
        result = await generateMarketingKit(property as Property);
        break;
      }
      case 'explain_term':
        result = await explainRealEstateTerm(readText(payload.term, 'term', 300, true));
        break;
      case 'buyer_intent':
        result = await analyzeBuyerIntentFromChatLogs(
          readText(payload.buyerName, 'buyerName', 200),
          readText(payload.propertyTitle, 'propertyTitle', 300),
          readNumber(payload.propertyPrice, 'propertyPrice', 0, MAX_PROPERTY_PRICE)!,
          readText(payload.chatLogs, 'chatLogs', 20_000, true),
        );
        break;
      case 'voice_to_listing':
      case 'transcribe_audio': {
        const input = sanitizeMediaInput(payload.input);
        result = action === 'voice_to_listing'
          ? await processVoiceNoteToListing(input)
          : await transcribeAudioToDescription(input);
        break;
      }
      case 'property_insights': {
        const property = sanitizeProperty(payload.property, 'property');
        const location = property.location!;
        if (!location.area && !location.city && !location.state) {
          throw new InvalidInputError('At least one property location field is required.');
        }
        const response = await getAi().models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide a concise, source-grounded real estate neighborhood overview for ${location.area}, ${location.city}, ${location.state}, Nigeria. Property: ${property.title}; type: ${property.type}; price: NGN ${property.price}. Use Google Search and Google Maps tools. Distinguish sourced facts from estimates, cite sources in the response, and do not claim that a title, ownership, safety condition, or investment return is verified.`,
          config: {
            tools: [{ googleSearch: {} }, { googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: property.coordinates
                  ? { latitude: property.coordinates.lat, longitude: property.coordinates.lng }
                  : undefined,
              },
            },
          },
        });
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        result = {
          text: response.text || '',
          sources: chunks.map((chunk: any) => ({
            title: chunk.web?.title || chunk.maps?.title || 'Source',
            uri: chunk.web?.uri || chunk.maps?.uri || '',
            kind: chunk.maps ? 'maps' : 'web',
          })).filter((source: any) => source.uri),
        };
        break;
      }
      default:
        return send(res, 400, { error: 'This AI action is not available.' });
    }
    return send(res, 200, { result });
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return send(res, 400, { error: error.message });
    }
    console.error('AI request failed:', error instanceof Error ? error.message : 'Unknown error');
    return send(res, 502, { error: 'The AI service could not complete this request. Please try again.' });
  }
}
