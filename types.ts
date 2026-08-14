
export enum UserRole {
  PUBLIC = 'Public',
  AGENT = 'Agent',
  ADMIN = 'Admin',
  BROKERAGE = 'Brokerage',
}

export enum PropertyType {
  // Residential
  APARTMENT = 'Apartment',
  HOUSE = 'House',
  DUPLEX = 'Duplex',
  BUNGALOW = 'Bungalow',
  LAND = 'Land',
  
  // Commercial / Business
  OFFICE = 'Office Space',
  SHOP = 'Shop / Plaza',
  WAREHOUSE = 'Warehouse',
  CONTAINER = 'Container Space',
  
  // Events / Lifestyle (Owambe)
  EVENT_CENTER = 'Event Center',
  WEDDING_HALL = 'Wedding Hall',
  OPEN_FIELD = 'Open Field',
  PARTY_VENUE = 'Party Venue',
  
  // Hospitality
  SHORT_LET = 'Short-let',
  GUEST_HOUSE = 'Guest House'
}

export enum ListingStatus {
  AVAILABLE = 'Available',
  UNDER_OFFER = 'Under Offer',
  TAKEN = 'Taken',
}

export enum LeadStatus {
  NEW = 'New Arrival',
  CONTACTED = 'Talking',
  VIEWING_SCHEDULED = 'Visiting',
  OFFER_MADE = 'Negotiating',
  CLOSED = 'Closed',
}

export enum VerificationStatus {
  UNVERIFIED = 'Unverified',
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected'
}

export enum FloodRisk {
  LOW = 'Dry Land (Low Risk)',
  MEDIUM = 'Moderate Risk',
  HIGH = 'Flood Prone (High Risk)'
}

export interface VerificationData {
  status: VerificationStatus;
  nin_token?: string; // vNIN (16 chars)
  id_type?: 'NATIONAL_ID' | 'VOTERS_CARD' | 'PASSPORT';
  face_match_score?: number;
  verified_at?: string;
  lasera_id?: string; // Lagos State Real Estate Regulatory Authority
}

// Network Marketing Types
export enum NetworkRank {
  SCOUT = 'Scout', // Starter
  CONNECTOR = 'Connector', // Has 5+ Downlines
  MOGUL = 'Mogul' // Has 50+ Downlines
}

export interface NetworkTransaction {
  id: string;
  type: 'DIRECT_COMMISSION' | 'DOWNLINE_OVERRIDE' | 'WITHDRAWAL';
  amount: number;
  description: string;
  date: string;
  status: 'PENDING' | 'CLEARED';
  fromUserId?: string; // Who generated this income
}

export interface BankDetails {
    account_number: string;
    bank_code: string;
    bank_name: string;
    account_name: string;
    is_verified: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl: string;
  verified: boolean; // Computed from verification.status === VERIFIED
  verification: VerificationData;
  agencyName?: string;
  token?: string;
  
  // Brokerage Management
  brokerageRole?: 'Standard' | 'Manager';
  isActive?: boolean;
  
  // Network Marketing Data
  referralCode: string;
  referredBy?: string; // upline_id
  networkRank: NetworkRank;
  wallet: {
    balance: number;
    lifetimeEarnings: number;
    pendingClearance: number;
  };
  bankDetails?: BankDetails;
  downlineCount: number; // Total people in network
}

export interface Review {
  id: string;
  agentId: string;
  reviewerName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

// IoT Data Interface
export interface SmartMeterData {
  deviceId: string;
  status: 'ON' | 'OFF';
  voltage: number; // e.g. 220
  currentLoad: number; // Amps
  lastUpdated: string;
}

// Title Document Interface
export interface TitleDocument {
  type: 'C_OF_O' | 'GOVERNOR_CONSENT' | 'GAZETTE' | 'DEED_OF_ASSIGNMENT';
  number: string;
  status: VerificationStatus;
  verifiedAt?: string;
  registeredOwner?: string; // The legal owner on the government record
  rejectionReason?: string;
  registryUrl?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    area: string; // e.g., "Lekki Phase 1"
    city: string; // e.g., "Lagos"
    state: string;
  };
  price: number;
  period?: 'per year' | 'per day' | 'per month' | 'total';
  type: PropertyType;
  status: ListingStatus;
  specs: {
    bedrooms?: number;
    bathrooms?: number;
    sizeSqM?: number;
    capacity?: number; // For event centers
    parkingSpaces?: number;
  };
  features: string[];
  images: string[];
  videoUrl?: string; // Short video clip
  agentId: string;
  
  // Trust Indicators
  isVerified: boolean; // General flag
  verificationLevel: 'NONE' | 'IDENTITY_VERIFIED' | 'BUSINESS_VERIFIED' | 'PHYSICALLY_INSPECTED';
  titleDocument?: TitleDocument; // Land Registry Data
  
  // Utility & Environment Intelligence
  floodRisk: FloodRisk;
  avgPowerHours: number; // 0-24
  isSolarPowered: boolean;
  smartMeterId?: string; // IoT Link
  waterSource: 'Borehole' | 'Water Board' | 'Truck' | 'Treatment Plant';
  escrowEnabled: boolean;
  depositEscrowEnabled: boolean;
  
  // Map Data
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Virtual Experience
  virtualTourUrl?: string; // Matterport or similar URL
  floorPlanImages?: string[];

  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  propertyId: string;
  budget: number;
  status: LeadStatus;
  notes: string;
  createdAt: string;
}

export interface SmartListingResponse {
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'EVENT' | 'LAND';
  title: string;
  description: string;
  price: number;
  currency: string;
  location: {
    area: string;
    state: string;
  };
  features: string[];
  specifications: {
    bedrooms?: number;
    bathrooms?: number;
    capacity?: number;
    square_meters?: number;
  };
  confidence_score: number;
  images?: string[];
  videoUrl?: string;
  // Document suggestion
  suggestedDocType?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AcademyLesson {
    id: string;
    title: string;
    topic: string; // For AI generation
    isCompleted: boolean;
    isLocked: boolean;
    type: 'LESSON' | 'QUIZ' | 'CHALLENGE';
}

export interface AcademyUnit {
    id: string;
    title: string;
    description: string;
    color: string;
    lessons: AcademyLesson[];
}

export interface DocumentVisionInspectionResult {
  landCoordinates?: string;
  plotNumber?: string;
  titleNumber?: string;
  issueDate?: string;
  registeredOwner?: string;
  grantingAuthority?: string;
  documentTypeDetected?: string;
  matchesSpecs?: boolean;
  discrepancyDetails?: string;
  verificationReadinessScore: number; // 0-100
  status: 'HIGH_CONFIDENCE' | 'REGISTRY_CROSS_CHECK_REQUIRED' | 'DISCREPANCY_FLAGGED';
  summaryNote: string;
}

export interface WhatsAppWebhookEvent {
  id: string;
  timestamp: string;
  eventType: 'INCOMING_LEAD' | 'OFFER_SUBMITTED' | 'INSPECTION_REQUESTED' | 'AUTO_REPLY_SENT';
  senderPhone: string;
  senderName: string;
  propertyTitle?: string;
  incomingText: string;
  aiAutoReply?: string;
  leadIntentScore?: number;
  status: 'RECEIVED' | 'PROCESSED' | 'SYNCED_FIRESTORE';
}

export interface Term {
    id: string;
    term: string;
    category: 'LEGAL' | 'SLANG' | 'FINANCE' | 'GENERAL';
    shortDef: string;
}
