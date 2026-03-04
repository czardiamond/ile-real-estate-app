
import { User, UserRole, VerificationStatus, NetworkRank } from '../types';

// Mock database
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Kunle Adebayo',
    email: 'kunle@ile.ng',
    phone: '08012345678',
    role: UserRole.AGENT,
    avatarUrl: 'https://picsum.photos/100/100?random=10',
    verified: true,
    verification: {
        status: VerificationStatus.VERIFIED,
        id_type: 'NATIONAL_ID',
        verified_at: '2025-01-15T10:00:00Z',
        lasera_id: 'LAS/AGT/2025/001'
    },
    agencyName: 'Lekki Gardens Realty',
    brokerageRole: 'Manager',
    isActive: true,
    referralCode: 'KUNLE2025',
    networkRank: NetworkRank.MOGUL,
    downlineCount: 142,
    wallet: {
        balance: 450000,
        lifetimeEarnings: 2800000,
        pendingClearance: 120000
    }
  },
  {
    id: 'u2',
    name: 'Chioma Nwosu',
    email: 'chioma@gmail.com',
    phone: '07098765432',
    role: UserRole.PUBLIC,
    avatarUrl: 'https://picsum.photos/100/100?random=11',
    verified: false,
    verification: {
        status: VerificationStatus.UNVERIFIED
    },
    referralCode: 'CHIOMA1',
    networkRank: NetworkRank.SCOUT,
    downlineCount: 3,
    wallet: {
        balance: 15000,
        lifetimeEarnings: 15000,
        pendingClearance: 0
    }
  },
  {
    id: 'u3',
    name: 'Unverified Agent',
    email: 'new@agent.com',
    phone: '09011111111',
    role: UserRole.AGENT,
    avatarUrl: 'https://ui-avatars.com/api/?name=New+Agent',
    verified: false,
    verification: {
        status: VerificationStatus.UNVERIFIED
    },
    agencyName: 'New Star Homes',
    brokerageRole: 'Standard',
    isActive: true,
    referralCode: 'NEWAGENT',
    networkRank: NetworkRank.SCOUT,
    downlineCount: 0,
    wallet: {
        balance: 0,
        lifetimeEarnings: 0,
        pendingClearance: 0
    }
  }
];

export const loginUser = async (identifier: string, password: string): Promise<User> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple mock logic
    const user = MOCK_USERS.find(u => u.email === identifier || u.phone === identifier);
    
    if (user) {
        if(user.isActive === false) {
             throw new Error("Account has been deactivated by your agency manager.");
        }
        return user;
    }
    
    throw new Error("Invalid credentials");
};

export const registerUser = async (data: { fullName?: string, name?: string, email: string, phone: string, role: UserRole, password?: string }): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const name = data.fullName || data.name || (data.email ? data.email.split('@')[0] : 'New User');
    
    const newUser: User = {
        id: `u${Date.now()}`,
        name: name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        verified: false,
        verification: { status: VerificationStatus.UNVERIFIED },
        referralCode: `USER${Math.floor(Math.random() * 10000)}`,
        networkRank: NetworkRank.SCOUT,
        downlineCount: 0,
        wallet: { balance: 0, lifetimeEarnings: 0, pendingClearance: 0 }
    };

    MOCK_USERS.push(newUser);
    return newUser;
};

export const getAgentsByAgency = (agencyName: string): User[] => {
    return MOCK_USERS.filter(u => u.role === UserRole.AGENT && u.agencyName === agencyName);
};

export const updateUserPermissions = async (userId: string, updates: { brokerageRole?: 'Standard' | 'Manager', isActive?: boolean }): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...updates };
        return true;
    }
    return false;
};
