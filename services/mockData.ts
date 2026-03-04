
import { Property, PropertyType, ListingStatus, Lead, LeadStatus, FloodRisk, Review, AcademyUnit, Term, VerificationStatus } from '../types';

export const MOCK_TERMS: Term[] = [
    { id: 't1', term: 'C of O', category: 'LEGAL', shortDef: 'Certificate of Occupancy - Proof of ownership issued by the government.' },
    { id: 't2', term: "Governor's Consent", category: 'LEGAL', shortDef: 'Approval needed to transfer land ownership from one person to another.' },
    { id: 't3', term: 'Tenement Rate', category: 'FINANCE', shortDef: 'Land use charge paid to local government by occupants.' },
    { id: 't4', term: 'Agency & Agreement', category: 'FINANCE', shortDef: 'Fees paid to agents and lawyers (usually 10% each) on top of rent.' },
    { id: 't5', term: 'Service Charge', category: 'GENERAL', shortDef: 'Monthly or yearly fee for maintenance, security, and cleaning.' },
    { id: 't6', term: 'Caution Fee', category: 'FINANCE', shortDef: 'Refundable deposit held against potential damages to the property.' },
    { id: 't7', term: 'Gated Estate', category: 'GENERAL', shortDef: 'A secure residential area with controlled entry and exit points.' },
    { id: 't8', term: 'Self-Contain', category: 'GENERAL', shortDef: 'A single room with toilet and kitchen inside (Studio Apartment).' },
    { id: 't9', term: 'Excision', category: 'LEGAL', shortDef: 'Land released by government to indigenous owners, making it free to buy.' },
    { id: 't10', term: 'Deed of Assignment', category: 'LEGAL', shortDef: 'Legal document transferring ownership permanently between two parties.' },
    { id: 't11', term: 'Face-Me-I-Face-You', category: 'SLANG', shortDef: 'Low-cost shared tenement building with common amenities.' },
    { id: 't12', term: 'Total Package', category: 'SLANG', shortDef: 'Rent + Agency + Legal + Service Charge combined into one figure.' },
];

export const MOCK_ACADEMY_UNITS: AcademyUnit[] = [
    {
        id: 'u1',
        title: 'Rookie Scout',
        description: 'Master the basics of Nigerian Real Estate.',
        color: 'bg-green-600',
        lessons: [
            { id: 'l1', title: 'Property Types 101', topic: 'Explain the difference between a Duplex, Bungalow, and Terrace in Nigeria.', isCompleted: true, isLocked: false, type: 'LESSON' },
            { id: 'l2', title: 'The Art of Inspection', topic: 'How to conduct a professional property inspection in Lagos.', isCompleted: true, isLocked: false, type: 'LESSON' },
            { id: 'l3', title: 'Verification Check', topic: 'Why ID verification matters for safety in real estate.', isCompleted: false, isLocked: false, type: 'QUIZ' },
            { id: 'l4', title: 'First Sale Challenge', topic: 'Steps to closing your first rental deal.', isCompleted: false, isLocked: true, type: 'CHALLENGE' },
        ]
    },
    {
        id: 'u2',
        title: 'Street Smart Marketing',
        description: 'How to find clients without spending money.',
        color: 'bg-purple-600',
        lessons: [
            { id: 'l5', title: 'WhatsApp Status Magic', topic: 'Marketing real estate on WhatsApp Status effectively.', isCompleted: false, isLocked: true, type: 'LESSON' },
            { id: 'l6', title: 'Networking at Owambes', topic: 'How to network at Nigerian parties for real estate leads.', isCompleted: false, isLocked: true, type: 'LESSON' },
            { id: 'l7', title: 'Mobile Photography', topic: 'Real estate photography tips using a mobile phone.', isCompleted: false, isLocked: true, type: 'QUIZ' },
        ]
    },
    {
        id: 'u3',
        title: 'Legal Eagle',
        description: 'Understanding documents and laws.',
        color: 'bg-yellow-600',
        lessons: [
            { id: 'l8', title: 'C of O vs Consent', topic: 'Difference between Certificate of Occupancy and Governor Consent.', isCompleted: false, isLocked: true, type: 'LESSON' },
            { id: 'l9', title: 'Tenancy Agreements', topic: 'Key clauses in a Lagos Tenancy Agreement.', isCompleted: false, isLocked: true, type: 'QUIZ' },
            { id: 'l10', title: 'Due Diligence', topic: 'How to verify land titles at Alausa Land Registry.', isCompleted: false, isLocked: true, type: 'LESSON' },
        ]
    },
    {
        id: 'u4',
        title: 'Valuation Pro',
        description: 'Pricing properties correctly.',
        color: 'bg-blue-600',
        lessons: [
            { id: 'l11', title: 'Price Factors', topic: 'What determines rent price in Lagos: Location, Finishing, Power.', isCompleted: false, isLocked: true, type: 'LESSON' },
            { id: 'l12', title: 'Calculating Yield', topic: 'How to calculate rental yield for investors.', isCompleted: false, isLocked: true, type: 'QUIZ' },
        ]
    }
];

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'p1',
    title: 'Luxury 4 Bedroom Detached Duplex',
    description: 'Modern finishing, serene environment with 24hrs power supply. Located in a secure gated estate.',
    location: {
      address: 'Admiralty Way',
      area: 'Lekki Phase 1',
      city: 'Lagos',
      state: 'Lagos'
    },
    price: 150000000,
    period: 'total',
    type: PropertyType.DUPLEX,
    status: ListingStatus.AVAILABLE,
    specs: { bedrooms: 4, bathrooms: 5, parkingSpaces: 3, sizeSqM: 400 },
    features: ['Swimming Pool', 'CCTV', 'Fitted Kitchen', 'BQ', 'Inverter'],
    images: ['https://picsum.photos/800/600?random=1', 'https://picsum.photos/800/600?random=2'],
    videoUrl: 'https://videos.pexels.com/video-files/3209042/3209042-hd_1920_1080_25fps.mp4',
    agentId: 'u1', // Associated with Kunle
    isVerified: true,
    verificationLevel: 'PHYSICALLY_INSPECTED', 
    floodRisk: FloodRisk.LOW,
    avgPowerHours: 20,
    isSolarPowered: true,
    smartMeterId: 'SMR-LKK-001', // IoT Enabled
    titleDocument: {
        type: 'C_OF_O',
        number: 'L/1234/5678',
        status: VerificationStatus.VERIFIED,
        verifiedAt: '2023-09-15',
        registeredOwner: 'Lekki Gardens Estate Ltd'
    },
    waterSource: 'Treatment Plant',
    escrowEnabled: true,
    depositEscrowEnabled: true,
    coordinates: { lat: 6.4500, lng: 3.4600 }, // Lekki Phase 1
    virtualTourUrl: 'https://my.matterport.com/show/?m=rxWJ5G5n5a5&play=1', // Example Public Tour
    floorPlanImages: ['https://i.pinimg.com/736x/87/42/41/8742417730e61d858349df0334812f63.jpg'],
    createdAt: '2023-10-01'
  },
  {
    id: 'p2',
    title: 'The Monarch Event Centre',
    description: 'Grand hall suitable for weddings, conferences, and large parties ("Owambe"). Fully air-conditioned with changing rooms.',
    location: {
      address: 'Remi Olowude Street',
      area: 'Lekki',
      city: 'Lagos',
      state: 'Lagos'
    },
    price: 2500000,
    period: 'per day',
    type: PropertyType.EVENT_CENTER,
    status: ListingStatus.AVAILABLE,
    specs: { capacity: 1000, parkingSpaces: 200 },
    features: ['Changing Room', 'Stage', 'Mood Lighting', 'Sound System', 'Industrial AC'],
    images: ['https://picsum.photos/800/600?random=3', 'https://picsum.photos/800/600?random=4'],
    agentId: 'u1', // Associated with Kunle
    isVerified: true,
    verificationLevel: 'BUSINESS_VERIFIED',
    floodRisk: FloodRisk.MEDIUM,
    avgPowerHours: 12, // Relies on Gen
    isSolarPowered: false,
    waterSource: 'Borehole',
    escrowEnabled: true,
    depositEscrowEnabled: true,
    coordinates: { lat: 6.4350, lng: 3.4820 }, // Lekki 2nd Roundabout area
    titleDocument: {
        type: 'GOVERNOR_CONSENT',
        number: 'GC/555/999',
        status: VerificationStatus.PENDING
    },
    createdAt: '2023-10-05'
  },
  {
    id: 'p3',
    title: 'Corner Shop @ Emab Plaza',
    description: 'High foot traffic shop on the ground floor. Perfect for electronics, fashion, or phone accessories.',
    location: {
      address: 'Aminu Kano Crescent',
      area: 'Wuse 2',
      city: 'Abuja',
      state: 'FCT'
    },
    price: 3500000,
    period: 'per year',
    type: PropertyType.SHOP,
    status: ListingStatus.AVAILABLE,
    specs: { sizeSqM: 25, parkingSpaces: 0 },
    features: ['Security 24/7', 'Glass Display', 'Tiled Floor', 'Prepaid Meter'],
    images: ['https://picsum.photos/800/600?random=5'],
    agentId: 'a2',
    isVerified: true,
    verificationLevel: 'IDENTITY_VERIFIED',
    floodRisk: FloodRisk.LOW,
    avgPowerHours: 18,
    isSolarPowered: false,
    smartMeterId: 'SMR-ABJ-002', // IoT Enabled
    waterSource: 'Water Board',
    escrowEnabled: true,
    depositEscrowEnabled: false,
    coordinates: { lat: 9.0765, lng: 7.4760 }, // Wuse 2, Abuja
    createdAt: '2023-10-10'
  },
  {
    id: 'p4',
    title: 'Coworking & Private Office Hub',
    description: 'Ideal for tech startups and SMEs. Shared amenities, fast internet, and coffee station.',
    location: {
      address: 'Herbert Macaulay Way',
      area: 'Yaba',
      city: 'Lagos',
      state: 'Lagos'
    },
    price: 4500000,
    period: 'per year',
    type: PropertyType.OFFICE,
    status: ListingStatus.AVAILABLE,
    specs: { sizeSqM: 150, bathrooms: 2, parkingSpaces: 10 },
    features: ['Fiber Internet', 'Meeting Room', 'Receptionist', 'Backup Generator'],
    images: ['https://picsum.photos/800/600?random=6'],
    agentId: 'u1', // Associated with Kunle
    isVerified: true,
    verificationLevel: 'BUSINESS_VERIFIED',
    floodRisk: FloodRisk.LOW,
    avgPowerHours: 15,
    isSolarPowered: true,
    waterSource: 'Borehole',
    escrowEnabled: true,
    depositEscrowEnabled: true,
    coordinates: { lat: 6.5120, lng: 3.3750 }, // Yaba
    virtualTourUrl: 'https://my.matterport.com/show/?m=rxWJ5G5n5a5&play=1',
    createdAt: '2023-10-12'
  },
  {
    id: 'p5',
    title: 'Cozy 2-Bed Shortlet Apartment',
    description: 'Home away from home. Fully serviced with daily cleaning. Close to nightlife and beaches.',
    location: {
      address: '1004 Estate',
      area: 'Victoria Island',
      city: 'Lagos',
      state: 'Lagos'
    },
    price: 85000,
    period: 'per day',
    type: PropertyType.SHORT_LET,
    status: ListingStatus.AVAILABLE,
    specs: { bedrooms: 2, bathrooms: 2, parkingSpaces: 1 },
    features: ['Unlimited Wifi', 'DSTV Premium', 'Daily Cleaning', 'Swimming Pool', 'Gym'],
    images: ['https://picsum.photos/800/600?random=7'],
    agentId: 'u1', // Associated with Kunle
    isVerified: true,
    verificationLevel: 'PHYSICALLY_INSPECTED',
    floodRisk: FloodRisk.HIGH, // 1004 area can be tricky
    avgPowerHours: 22,
    isSolarPowered: false,
    waterSource: 'Treatment Plant',
    escrowEnabled: true,
    depositEscrowEnabled: true,
    coordinates: { lat: 6.4320, lng: 3.4180 }, // VI
    titleDocument: {
        type: 'C_OF_O',
        number: 'FAKE/123/419', // Mock Fraud case
        status: VerificationStatus.UNVERIFIED,
    },
    createdAt: '2023-10-15'
  },
  {
    id: 'p6',
    title: 'Open Field for Concerts/Rallies',
    description: 'Massive open land suitable for large gatherings, crusades, or festivals.',
    location: {
      address: 'Tafawa Balewa Square',
      area: 'Lagos Island',
      city: 'Lagos',
      state: 'Lagos'
    },
    price: 5000000,
    period: 'per day',
    type: PropertyType.OPEN_FIELD,
    status: ListingStatus.AVAILABLE,
    specs: { capacity: 5000, parkingSpaces: 500 },
    features: ['Fenced', 'Floodlights', 'Security Post'],
    images: ['https://picsum.photos/800/600?random=8'],
    agentId: 'u1',
    isVerified: true,
    verificationLevel: 'PHYSICALLY_INSPECTED',
    floodRisk: FloodRisk.LOW,
    avgPowerHours: 0,
    isSolarPowered: false,
    waterSource: 'Truck',
    escrowEnabled: true,
    depositEscrowEnabled: false,
    coordinates: { lat: 6.4450, lng: 3.4100 },
    createdAt: '2023-10-18'
  }
];

export const MOCK_LEADS: Lead[] = [
    {
        id: 'l1',
        name: 'Tunde Johnson',
        phone: '08012345678',
        email: 'tunde@gmail.com',
        propertyId: 'p1',
        budget: 150000000,
        status: LeadStatus.NEW,
        notes: "Likes the swimming pool. Asking about C of O.",
        createdAt: '2023-10-25'
    },
    {
        id: 'l2',
        name: 'Chidinma Okeke',
        phone: '09087654321',
        email: 'chi@yahoo.com',
        propertyId: 'p2',
        budget: 2500000,
        status: LeadStatus.CONTACTED,
        notes: "Wedding reception in December. Needs 1000 capacity confirmed.",
        createdAt: '2023-10-24'
    },
    {
        id: 'l3',
        name: 'Alhaji Musa',
        phone: '07011223344',
        email: 'musa@outlook.com',
        propertyId: 'p1',
        budget: 140000000,
        status: LeadStatus.OFFER_MADE,
        notes: "Cash ready. Negotiating price to 140m.",
        createdAt: '2023-10-20'
    }
];

export const MOCK_REVIEWS: Review[] = [
    {
        id: 'r1',
        agentId: 'u1',
        reviewerName: 'Seyi Shay',
        rating: 5,
        comment: 'Kunle was very professional. The duplex was exactly as described. No hidden charges.',
        date: 'Oct 15, 2023'
    },
    {
        id: 'r2',
        agentId: 'u1',
        reviewerName: 'Emeka Obi',
        rating: 4,
        comment: 'Good experience, but the inspection fee was a bit high. Property was great though.',
        date: 'Sept 28, 2023'
    },
    {
        id: 'r3',
        agentId: 'u1',
        reviewerName: 'Aisha Bello',
        rating: 5,
        comment: 'Helped me find a shop in Wuse 2 very quickly. Highly recommended!',
        date: 'Sept 10, 2023'
    }
];
