
import { GoogleGenAI, Type } from "@google/genai";
import { Property, SmartListingResponse } from "../types";

// Initialize Gemini
// Note: process.env.API_KEY is assumed to be available
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASE_SYSTEM_INSTRUCTION = `
You are "Ilé AI", a helpful, friendly, and knowledgeable real estate assistant for the Nigerian market.
Your tone should be professional yet warm, using Nigerian English nuances where appropriate (e.g., "Owambe", "Self-contain", "Plaza", "Layout").
`;

const LEGAL_DRAFTSMAN_INSTRUCTION = `
You are an expert Nigerian Real Estate Lawyer. Your task is to draft a legally binding, yet simple "Tenancy Agreement" or "Offer Letter" based on the provided details.
Context: Lagos State Tenancy Law.
Tone: Formal, Legal, yet clear.
Currency: Naira (₦).
Terms: 
- Include clause that tenant cannot sublet without permission.
- Include clause that tenant pays for own electricity (NEPA/PHCN).
- Date: Today's date.
`;

const LISTING_GENERATOR_INSTRUCTION = `
You are the AI Engine for "Ilé," a premier Nigerian real estate platform. Your goal is to take raw, messy input from agents and convert it into structured JSON data and a professional marketing description.

INPUT CONTEXT:
The user will provide unstructured text regarding a property (Residential, Commercial/Shop, or Event Venue).

YOUR RESPONSIBILITIES:
1. CATEGORIZE: Determine if it is a House, Shop/Office, Land, or Event Center.
2. EXTRACT SPECS STRICTLY:
   - IF EVENT CENTER: Look for 'capacity', 'guests', 'crowd', 'audience'. Map strictly to 'specifications.capacity'.
   - IF COMMERCIAL OR LAND: Look for 'sqm', 'square meters', 'plots', 'size', 'sizeSqM'. Map strictly to 'specifications.square_meters'.
   - IF RESIDENTIAL: Look for 'bedrooms', 'bathrooms'.
3. EXTRACT FEATURES: Identify amenities like 'Pop', 'Gen', 'Tiles', 'Security', 'CCTV', 'Pool', 'Serviced'.
4. ENRICH: If the location is a known Nigerian hub (e.g., Ikeja, Lekki, Maitama), add tags like "Central Business District" or "Highbrow Area."
5. COMPOSE: Write a catchy, professional title and description. Use emotive language but keep it honest.

RULES FOR NIGERIAN CONTEXT:
- If "Gen" or "Light" is mentioned, map to "24/7 Power" or "Backup Generator".
- If "Pop" is mentioned, map to "POP Ceilings".
- If "Owambe" or "Party" is mentioned, categorize as "Event Center".
- Detect currency. If k = thousand, m = million. Convert to full number (e.g., 2.5m -> 2500000).

OUTPUT FORMAT:
JSON only.
`;

export const generateTenancyAgreement = async (
    tenantName: string,
    landlordName: string,
    address: string,
    amount: number
): Promise<string> => {
    try {
        const prompt = `
        Draft a Tenancy Agreement.
        Landlord: ${landlordName}
        Tenant: ${tenantName}
        Property: ${address}
        Annual Rent: ${amount}
        Duration: 1 Year
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: LEGAL_DRAFTSMAN_INSTRUCTION,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return response.text || "Unable to generate agreement at this time.";
    } catch (e) {
        console.error("Legal Draft Error", e);
        return "System error: The AI Lawyer is currently unavailable.";
    }
}

export const generateListingFromRawText = async (rawInput: string): Promise<SmartListingResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: rawInput,
            config: {
                systemInstruction: LISTING_GENERATOR_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: ['RESIDENTIAL', 'COMMERCIAL', 'EVENT', 'LAND'] },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        price: { type: Type.NUMBER },
                        currency: { type: Type.STRING },
                        location: {
                            type: Type.OBJECT,
                            properties: {
                                area: { type: Type.STRING },
                                state: { type: Type.STRING },
                            }
                        },
                        features: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        specifications: {
                            type: Type.OBJECT,
                            properties: {
                                bedrooms: { type: Type.NUMBER },
                                bathrooms: { type: Type.NUMBER },
                                capacity: { type: Type.NUMBER },
                                square_meters: { type: Type.NUMBER },
                            }
                        },
                        confidence_score: { type: Type.NUMBER }
                    }
                }
            }
        });
        
        const jsonStr = response.text;
        return JSON.parse(jsonStr) as SmartListingResponse;
    } catch (error) {
        console.error("Smart Listing Generation Error:", error);
        return null;
    }
};

export const generatePropertyDescription = async (propertyData: Partial<Property>): Promise<string> => {
  try {
    const prompt = `
      Write a compelling, attractive marketing description for a real estate listing in Nigeria.
      
      Details:
      Title: ${propertyData.title}
      Type: ${propertyData.type}
      Location: ${propertyData.location?.area}, ${propertyData.location?.city}
      Features: ${propertyData.features?.join(', ')}
      Specs: ${JSON.stringify(propertyData.specs)}
      
      Keep it under 100 words. Highlight the value proposition. 
      If it's an event center, mention hosting successful parties.
      If it's a shop, mention visibility.
      Use persuasive language suitable for Nigerian buyers/renters.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: BASE_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Could not generate description.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating description. Please try again.";
  }
};

export const chatWithIle = async (history: { role: string, text: string }[], newMessage: string): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: BASE_SYSTEM_INSTRUCTION,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I'm having trouble connecting right now.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Network issue. Abeg try again later.";
  }
};

export const analyzeLeadPotential = async (leadNotes: string, propertyPrice: number): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this real estate lead note regarding a property listed at ${propertyPrice}. 
            Note: "${leadNotes}"
            
            Return a JSON object with:
            1. "sentiment": "Hot", "Warm", or "Cold"
            2. "suggestedAction": A short sentence on what the agent should do next (e.g., "Schedule viewing immediately", "Send more photos").
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sentiment: { type: Type.STRING },
                        suggestedAction: { type: Type.STRING }
                    }
                }
            }
        });
        return response.text;
    } catch (e) {
        return JSON.stringify({ sentiment: "Unknown", suggestedAction: "Follow up manually." });
    }
};

export const generateMarketingTip = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Give me one short, high-impact, and unconventional marketing tip for a Real Estate Agent in Nigeria today. Keep it under 30 words.",
            config: {
                systemInstruction: "You are a senior real estate mentor. Provide actionable advice for the Nigerian market (e.g. using WhatsApp Status, Networking at Owambes, building trust).",
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return response.text || "Consistency on WhatsApp Status is your superpower.";
    } catch (e) {
        return "Network is your net worth. Call 3 past clients today.";
    }
};

export const generateAcademyLesson = async (topic: string): Promise<{content: string, quizQuestion: string, options: string[], correctAnswerIndex: number}> => {
    try {
        // Step 1: Generate Content
        const contentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a short, engaging real estate lesson for a new Nigerian Real Estate Agent.
            Topic: ${topic}
            Context: Strictly Nigerian Real Estate Market (Lagos/Abuja focus). Mention terms like "C of O", "Agreement Fee", "Agency Fee", "Total Package", "Caution Fee", "Lagos Land Registry" where relevant.
            Tone: Professional, Street-smart (using terms like "Sharp guy"), Educational.
            Length: Under 80 words.`,
            config: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        
        const contentText = contentResponse.text || "Real estate in Nigeria depends heavily on verification and trust.";

        // Step 2: Generate Quiz based on content
        const quizResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Based on this lesson content, create a multiple choice quiz question.
            
            Lesson Content: "${contentText}"
            
            Requirements:
            - Question must test understanding of the specific Nigerian context mentioned in the text.
            - Provide 3 options.
            - One correct answer.
            
            Return JSON.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quizQuestion: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswerIndex: { type: Type.NUMBER }
                    }
                }
            }
        });
        
        const quizData = JSON.parse(quizResponse.text!);
        
        return {
            content: contentText,
            ...quizData
        };
    } catch (e) {
        console.error(e);
        return {
            content: "Real estate in Nigeria requires trust. Always verify your documents before payment.",
            quizQuestion: "What is the most important document for land title?",
            options: ["Receipt", "C of O", "Survey Plan"],
            correctAnswerIndex: 1
        };
    }
};

export const generateMarketingKit = async (property: Property): Promise<{ linkedin: string, instagram: string, whatsapp: string }> => {
    try {
        const prompt = `
        Generate a "Social Media Marketing Kit" for this real estate property in Nigeria.
        
        Property Details:
        Title: ${property.title}
        Price: ${property.price} ${property.period || ''}
        Location: ${property.location.area}, ${property.location.city}
        Type: ${property.type}
        Features: ${property.features.join(', ')}
        
        Return a JSON object with three keys:
        1. "linkedin": A professional, visionary post highlighting investment value and modern living. Use relevant hashtags.
        2. "instagram": A catchy, visual-focused post with emojis and a strong call to action. Use relevant hashtags.
        3. "whatsapp": A short, punchy, and direct message suitable for a WhatsApp Status or Broadcast. Include key specs and contact prompt.
        
        Tone: Professional yet engaging, tailored for the Nigerian market.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        linkedin: { type: Type.STRING },
                        instagram: { type: Type.STRING },
                        whatsapp: { type: Type.STRING }
                    },
                    required: ["linkedin", "instagram", "whatsapp"]
                }
            }
        });

        const data = JSON.parse(response.text);
        return data;
    } catch (e) {
        console.error("Marketing Kit Error", e);
        return {
            linkedin: "Elevate your lifestyle with this premium property. Contact us for details.",
            instagram: "Your dream home awaits! ✨ DM for viewings. #RealEstateNigeria",
            whatsapp: "New Listing! 🏠 Check out this amazing property in " + property.location.area + ". Chat me for price!"
        };
    }
};

export const explainRealEstateTerm = async (term: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Explain the real estate term "${term}" to a layperson in Nigeria. 
            Use a simple analogy or a "common street scenario" to make it easy to understand.
            Keep it under 50 words. Fun and educational tone.`,
            config: {
                systemInstruction: BASE_SYSTEM_INSTRUCTION,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        return response.text || "Definition currently unavailable.";
    } catch (e) {
        return "This term typically refers to a standard practice in real estate. Consult a professional for details.";
    }
};
