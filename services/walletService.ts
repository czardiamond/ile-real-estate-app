
import { BankDetails } from "../types";

export const BANKS = [
    { code: '058', name: 'Guaranty Trust Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '057', name: 'Zenith Bank' },
    { code: '033', name: 'United Bank for Africa' },
    { code: '232', name: 'Sterling Bank' },
    { code: '044', name: 'Access Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '999', name: 'OPay Digital Services' },
    { code: '998', name: 'PalmPay' },
];

/**
 * Simulates Paystack/Flutterwave "Resolve Account" API
 * In a real app, this hits the backend which calls the Provider API.
 */
export const resolveBankAccount = async (
    accountNumber: string, 
    bankCode: string, 
    userProfileName: string
): Promise<{ success: boolean; data?: BankDetails; message?: string }> => {
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (accountNumber.length !== 10) {
        return { success: false, message: "Account number must be 10 digits." };
    }

    const bank = BANKS.find(b => b.code === bankCode);
    if(!bank) return { success: false, message: "Invalid bank selected." };

    // MOCK LOGIC: 
    // If account starts with '0', we assume it resolves successfully to the User's name.
    // If it starts with '1', we simulate a Name Mismatch (Fraud check).
    // If it starts with '9', we simulate a Non-Existent account.
    
    if (accountNumber.startsWith('9')) {
        return { success: false, message: "Could not resolve account details. Check number." };
    }

    let resolvedName = "";
    
    if (accountNumber.startsWith('1')) {
        resolvedName = "CHIBUZOR CRIMINAL ELEMENT"; // Intentionally different for testing mismatch
    } else {
        // Resolve to the current user's name for success path
        resolvedName = userProfileName.toUpperCase();
    }

    // SECURITY CHECK: Fuzzy Name Matching
    // Logic: Does the bank account name contain parts of the Ilé Profile Name?
    const profileNameUpper = userProfileName.toUpperCase();
    
    // Simple check: does the resolved name include the first name of the profile?
    const firstName = profileNameUpper.split(' ')[0];
    const isMatch = resolvedName.includes(firstName);

    if (!isMatch) {
        return { 
            success: false, 
            message: `Security Mismatch: Bank Name (${resolvedName}) does not match Profile Name (${userProfileName}). Withdrawal rejected to prevent fraud.` 
        };
    }

    return {
        success: true,
        data: {
            account_number: accountNumber,
            bank_code: bankCode,
            bank_name: bank.name,
            account_name: resolvedName,
            is_verified: true
        }
    };
};

export const initiateWithdrawal = async (amount: number, userBalance: number): Promise<{ success: boolean; message: string }> => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (amount < 1000) {
        return { success: false, message: "Minimum withdrawal is ₦1,000" };
    }

    if (amount > userBalance) {
        return { success: false, message: "Insufficient funds in commission wallet." };
    }

    return { success: true, message: "Withdrawal processing. Funds will hit your account in minutes." };
};
