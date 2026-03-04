
import { TitleDocument, VerificationStatus } from "../types";

export const verifyLandTitle = async (doc: TitleDocument): Promise<TitleDocument> => {
    // Simulate Government API Call Latency
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Logic 1: The "419" Check
    // If the number contains "FAKE" or "419", we simulate a critical failure.
    if (doc.number.toUpperCase().includes('FAKE') || doc.number.includes('419')) {
        return {
            ...doc,
            status: VerificationStatus.REJECTED,
            verifiedAt: new Date().toISOString(),
            rejectionReason: 'Document Number Not Found in Registry Database',
            registeredOwner: 'UNKNOWN ENTITY'
        };
    }

    // Logic 2: The "Dispute" Check
    // If the number contains "DISPUTE", it exists but is under litigation.
    if (doc.number.toUpperCase().includes('DISPUTE')) {
        return {
            ...doc,
            status: VerificationStatus.REJECTED,
            verifiedAt: new Date().toISOString(),
            rejectionReason: 'Property Under Litigation (Caveat Emptor)',
            registeredOwner: 'Alhaji Bakare & Sons'
        };
    }

    // Logic 3: Success Path
    return {
        ...doc,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date().toISOString(),
        registeredOwner: 'Lekki Gardens Estate Ltd', // Matches the mock "Listed By" in UI
        registryUrl: 'https://lands.lagosstate.gov.ng/verify/L-1234-5678'
    };
};
