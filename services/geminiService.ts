import type { Property, SmartListingResponse, DocumentVisionInspectionResult } from '../types';
import { auth } from '../src/lib/firebase';

export interface BuyerIntentAnalysis {
  score: number;
  intentTier: 'HOT_LEAD' | 'WARM_PROSPECT' | 'COLD_INQUIRY';
  financialReadiness: string;
  urgencyLevel: string;
  keyIntentSignals: string[];
  perceivedRisks: string[];
  recommendedClosingScript: string;
  summary: string;
}

export interface PropertyInsightSource {
  title: string;
  uri: string;
  kind: 'web' | 'maps';
}

async function callAi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use AI tools.');

  const token = await user.getIdToken();
  const response = await fetch('/api/ai', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `AI request failed (${response.status}).`);
  }
  return body.result as T;
}

export const generateTenancyAgreement = (
  tenantName: string,
  landlordName: string,
  address: string,
  amount: number,
  period: 'per year' | 'per month',
  duration: string,
): Promise<string> => callAi('tenancy_agreement', { tenantName, landlordName, address, amount, period, duration });

export const generateListingFromRawText = (rawInput: string): Promise<SmartListingResponse | null> =>
  callAi('listing_from_text', { rawInput });

export const generatePropertyDescription = (propertyData: Partial<Property>): Promise<string> =>
  callAi('property_description', { propertyData });

export const chatWithIle = (history: { role: string; text: string }[], newMessage: string): Promise<string> =>
  callAi('chat', { history, newMessage });

export const analyzeLeadPotential = (leadNotes: string, propertyPrice: number): Promise<string> =>
  callAi('analyze_lead', { leadNotes, propertyPrice });

export const generateMarketingTip = (): Promise<string> => callAi('marketing_tip', {});

export const generateAcademyLesson = (topic: string): Promise<{
  content: string;
  quizQuestion: string;
  options: string[];
  correctAnswerIndex: number;
}> => callAi('academy_lesson', { topic });

export const generateMarketingKit = (property: Property): Promise<{
  linkedin: string;
  instagram: string;
  whatsapp: string;
}> => callAi('marketing_kit', { property });

export const explainRealEstateTerm = (term: string): Promise<string> =>
  callAi('explain_term', { term });

export const analyzeBuyerIntentFromChatLogs = (
  buyerName: string,
  propertyTitle: string,
  propertyPrice: number,
  chatLogs: string,
): Promise<BuyerIntentAnalysis> =>
  callAi('buyer_intent', { buyerName, propertyTitle, propertyPrice, chatLogs });

export const processVoiceNoteToListing = (input: {
  type: 'audio' | 'text';
  data: string;
  mimeType?: string;
}): Promise<SmartListingResponse | null> => callAi('voice_to_listing', { input });

export const transcribeAudioToDescription = (input: {
  type: 'audio' | 'text';
  data: string;
  mimeType?: string;
}): Promise<string | null> => callAi('transcribe_audio', { input });

/** AI can extract text from a document; it cannot establish authenticity or registry status. */
export const inspectDocumentWithVision = (
  imageBase64: string,
  mimeType = 'image/jpeg',
  expectedPropertyData?: Partial<Property>,
): Promise<DocumentVisionInspectionResult> =>
  callAi('inspect_document', { imageBase64, mimeType, expectedPropertyData });

export const generatePropertyInsights = (property: Property): Promise<{
  text: string;
  sources: PropertyInsightSource[];
}> => callAi('property_insights', { property });
