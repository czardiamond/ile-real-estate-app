import { VerificationData, VerificationStatus } from "../types";

/**
 * Mocks the "Smile ID" or "Youverify" KYC process for Nigeria.
 * 
 * Flow:
 * 1. Accepts vNIN (Virtual NIN - 16 digits)
 * 2. Accepts a Base64 image of the user (Liveness Selfie)
 * 3. Returns a verification result with a confidence score.
 */
export const submitIdentityVerification = async (
    userId: string, 
    vNIN: string, 
    selfieBase64: string
): Promise<{ success: boolean; data?: VerificationData; message?: string }> => {
    
    // Simulate Network Latency
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Validation 1: vNIN Format (Must be 16 digits for Virtual NIN)
    if (!/^\d{16}$/.test(vNIN)) {
        return { 
            success: false, 
            message: "Invalid vNIN format. Please provide the 16-digit Virtual NIN." 
        };
    }

    // Validation 2: "Smile ID" Liveness Check Simulation
    // In a real app, this sends the image to an API which returns a 'face_match_score'
    // Here we simulate a success.
    const mockMatchScore = 0.98; // High confidence

    if (mockMatchScore < 0.90) {
        return {
            success: false,
            message: "Liveness check failed. Face does not match ID profile."
        };
    }

    // Success Result
    const verificationResult: VerificationData = {
        status: VerificationStatus.VERIFIED,
        nin_token: vNIN, // In production, we store a hash/token, not the raw NIN if possible
        id_type: 'NATIONAL_ID',
        face_match_score: mockMatchScore,
        verified_at: new Date().toISOString(),
        lasera_id: 'LAS/PENDING/001' // Placeholder for Lagos State integration
    };

    return { success: true, data: verificationResult };
};
