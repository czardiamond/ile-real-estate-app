import { createRemoteJWKSet, jwtVerify } from 'jose';
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

type Payload = Record<string, any>;
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

function header(value: HeaderValue): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function send(res: Response, status: number, body: unknown) {
  res.status(status).json(body);
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

  let body: any = req.body;
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
  if (!body || typeof body !== 'object' || Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    return send(res, 413, { error: 'The request is too large or invalid.' });
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

  const action = typeof body.action === 'string' ? body.action : '';
  const payload: Payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

  try {
    let result: unknown;
    switch (action) {
      case 'tenancy_agreement':
        result = await generateTenancyAgreement(String(payload.tenantName || ''), String(payload.landlordName || ''), String(payload.address || ''), Number(payload.amount || 0), payload.period === 'per month' ? 'per month' : 'per year', String(payload.duration || '').slice(0, 100));
        break;
      case 'listing_from_text':
        result = await generateListingFromRawText(String(payload.rawInput || '').slice(0, 20_000));
        break;
      case 'property_description':
        result = await generatePropertyDescription(payload.propertyData || {});
        break;
      case 'chat': {
        const history = Array.isArray(payload.history) ? payload.history.slice(-30) : [];
        result = await chatWithIle(history, String(payload.newMessage || '').slice(0, 8_000));
        break;
      }
      case 'analyze_lead':
        result = await analyzeLeadPotential(String(payload.leadNotes || '').slice(0, 10_000), Number(payload.propertyPrice || 0));
        break;
      case 'marketing_tip':
        result = await generateMarketingTip();
        break;
      case 'academy_lesson':
        result = await generateAcademyLesson(String(payload.topic || '').slice(0, 500));
        break;
      case 'marketing_kit':
        result = await generateMarketingKit(payload.property);
        break;
      case 'explain_term':
        result = await explainRealEstateTerm(String(payload.term || '').slice(0, 300));
        break;
      case 'buyer_intent':
        result = await analyzeBuyerIntentFromChatLogs(
          String(payload.buyerName || '').slice(0, 200),
          String(payload.propertyTitle || '').slice(0, 300),
          Number(payload.propertyPrice || 0),
          String(payload.chatLogs || '').slice(0, 20_000),
        );
        break;
      case 'voice_to_listing':
      case 'transcribe_audio': {
        const input = payload.input;
        if (!input || !['audio', 'text'].includes(input.type) || typeof input.data !== 'string' || input.data.length > 3_500_000) {
          return send(res, 400, { error: 'Audio or text input is invalid or too large.' });
        }
        result = action === 'voice_to_listing'
          ? await processVoiceNoteToListing(input)
          : await transcribeAudioToDescription(input);
        break;
      }
      case 'property_insights': {
        const property = payload.property;
        if (!property || typeof property !== 'object') return send(res, 400, { error: 'Property details are required.' });
        const location = property.location || {};
        const prompt = `Provide a concise, source-grounded real estate neighborhood overview for ${String(location.area || '')}, ${String(location.city || '')}, ${String(location.state || '')}, Nigeria. Property: ${String(property.title || '')}; type: ${String(property.type || '')}; price: NGN ${Number(property.price || 0)}. Use Google Search and Google Maps tools. Distinguish sourced facts from estimates, cite sources in the response, and do not claim that a title, ownership, safety condition, or investment return is verified.`;
        const response = await getAi().models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }, { googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: property.coordinates ? { latitude: Number(property.coordinates.lat), longitude: Number(property.coordinates.lng) } : undefined,
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
    console.error('AI request failed:', error instanceof Error ? error.message : 'Unknown error');
    return send(res, 502, { error: 'The AI service could not complete this request. Please try again.' });
  }
}
