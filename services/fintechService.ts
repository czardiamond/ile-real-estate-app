
export interface PaymentPlan {
    provider: 'Carbon' | 'FairMoney' | 'RentSmallSmall';
    monthly: number;
    total: number;
    months: number;
    interestRate: number;
}

export const getPaymentPlans = async (amount: number): Promise<PaymentPlan[]> => {
    // Simulate API Fetch
    await new Promise(resolve => setTimeout(resolve, 1000));

    const plans: PaymentPlan[] = [
        {
            provider: 'Carbon',
            monthly: Math.round((amount * 1.15) / 12),
            total: amount * 1.15,
            months: 12,
            interestRate: 15
        },
        {
            provider: 'RentSmallSmall',
            monthly: Math.round((amount * 1.08) / 6),
            total: amount * 1.08,
            months: 6,
            interestRate: 8
        },
        {
            provider: 'FairMoney',
            monthly: Math.round((amount * 1.05) / 3),
            total: amount * 1.05,
            months: 3,
            interestRate: 5
        }
    ];
    return plans;
};

export const processPayment = async (amount: number, method: 'CARD' | 'TRANSFER' | 'BNPL', plan?: PaymentPlan): Promise<{success: boolean, reference: string}> => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    return {
        success: true,
        reference: `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
};
