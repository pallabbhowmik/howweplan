/**
 * India Travel Agent Verification Requirements
 * 
 * Based on:
 * - Ministry of Tourism (MOT) approved travel agent guidelines
 * - IATA (International Air Transport Association) accreditation requirements
 * - IATO (Indian Association of Tour Operators) membership requirements
 * - TAAI (Travel Agents Association of India) membership requirements
 * - GST and Income Tax regulations
 * - RBI guidelines for travel businesses
 * 
 * MANDATORY DOCUMENTS FOR INDIAN TRAVEL AGENTS:
 * 
 * 1. IDENTITY DOCUMENTS:
 *    - PAN Card (Permanent Account Number) - Required for all business transactions
 *    - Aadhaar Card - For KYC verification
 *    - Passport (for international travel agents)
 * 
 * 2. BUSINESS DOCUMENTS:
 *    - GST Registration Certificate (if turnover > ₹20 lakhs)
 *    - Business Registration (One of):
 *      a) Partnership Deed (if partnership firm)
 *      b) Certificate of Incorporation (if company)
 *      c) LLP Agreement (if LLP)
 *      d) Shop & Establishment Certificate (for proprietorship)
 *    - MSME/Udyam Registration (optional but recommended)
 * 
 * 3. PROFESSIONAL CERTIFICATIONS (Any one):
 *    - IATA Accreditation Certificate
 *    - MOT (Ministry of Tourism) Recognition Certificate
 *    - IATO Membership Certificate
 *    - TAAI Membership Certificate
 *    - TAFI (Travel Agents Federation of India) Membership
 *    - OTOAI (Outbound Tour Operators Association of India) Membership
 * 
 * 4. FINANCIAL DOCUMENTS:
 *    - Bank Account Proof (Cancelled Cheque / Bank Statement)
 *    - ITR (Income Tax Return) - Last 2 years (for established agencies)
 * 
 * 5. ADDRESS PROOF:
 *    - Office Address Proof (Utility Bill / Rent Agreement / Property Documents)
 * 
 * 6. ADDITIONAL DOCUMENTS:
 *    - Professional Photo (Passport-size)
 *    - Office Photos (Front view, Interior)
 *    - Insurance Certificate (if applicable)
 */

// ============================================================================
// DOCUMENT CATEGORIES
// ============================================================================

export const DocumentCategory = {
  IDENTITY: 'IDENTITY',
  BUSINESS: 'BUSINESS',
  PROFESSIONAL: 'PROFESSIONAL',
  FINANCIAL: 'FINANCIAL',
  ADDRESS: 'ADDRESS',
  ADDITIONAL: 'ADDITIONAL',
} as const;

export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

// ============================================================================
// DOCUMENT TYPES - INDIA SPECIFIC
// ============================================================================

export const IndiaDocumentType = {
  // Identity Documents
  PAN_CARD: 'PAN_CARD',
  AADHAAR_CARD: 'AADHAAR_CARD',
  PASSPORT: 'PASSPORT',
  VOTER_ID: 'VOTER_ID',
  DRIVING_LICENSE: 'DRIVING_LICENSE',
  
  // Business Documents
  GST_CERTIFICATE: 'GST_CERTIFICATE',
  SHOP_ESTABLISHMENT: 'SHOP_ESTABLISHMENT',
  PARTNERSHIP_DEED: 'PARTNERSHIP_DEED',
  CERTIFICATE_OF_INCORPORATION: 'CERTIFICATE_OF_INCORPORATION',
  LLP_AGREEMENT: 'LLP_AGREEMENT',
  MSME_UDYAM_REGISTRATION: 'MSME_UDYAM_REGISTRATION',
  
  // Professional Certifications
  IATA_CERTIFICATE: 'IATA_CERTIFICATE',
  MOT_RECOGNITION: 'MOT_RECOGNITION',
  IATO_MEMBERSHIP: 'IATO_MEMBERSHIP',
  TAAI_MEMBERSHIP: 'TAAI_MEMBERSHIP',
  TAFI_MEMBERSHIP: 'TAFI_MEMBERSHIP',
  OTOAI_MEMBERSHIP: 'OTOAI_MEMBERSHIP',
  OTHER_CERTIFICATION: 'OTHER_CERTIFICATION',
  
  // Financial Documents
  BANK_STATEMENT: 'BANK_STATEMENT',
  CANCELLED_CHEQUE: 'CANCELLED_CHEQUE',
  ITR_LAST_YEAR: 'ITR_LAST_YEAR',
  ITR_PREVIOUS_YEAR: 'ITR_PREVIOUS_YEAR',
  
  // Address Proof
  UTILITY_BILL: 'UTILITY_BILL',
  RENT_AGREEMENT: 'RENT_AGREEMENT',
  PROPERTY_DOCUMENTS: 'PROPERTY_DOCUMENTS',
  
  // Additional
  PROFESSIONAL_PHOTO: 'PROFESSIONAL_PHOTO',
  OFFICE_FRONT_PHOTO: 'OFFICE_FRONT_PHOTO',
  OFFICE_INTERIOR_PHOTO: 'OFFICE_INTERIOR_PHOTO',
  INSURANCE_CERTIFICATE: 'INSURANCE_CERTIFICATE',
  EXPERIENCE_CERTIFICATE: 'EXPERIENCE_CERTIFICATE',
} as const;

export type IndiaDocumentType = (typeof IndiaDocumentType)[keyof typeof IndiaDocumentType];

// ============================================================================
// DOCUMENT METADATA
// ============================================================================

export interface DocumentTypeInfo {
  id: IndiaDocumentType;
  name: string;
  description: string;
  category: DocumentCategory;
  required: boolean;
  requiredForNewAgents: boolean;
  acceptedFormats: string[];
  maxSizeMB: number;
  exampleUrl?: string;
  validationRules?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
}

export const DOCUMENT_TYPE_INFO: Record<IndiaDocumentType, DocumentTypeInfo> = {
  // Identity Documents
  [IndiaDocumentType.PAN_CARD]: {
    id: IndiaDocumentType.PAN_CARD,
    name: 'PAN Card',
    description: 'Permanent Account Number card issued by Income Tax Department. Required for all financial transactions.',
    category: DocumentCategory.IDENTITY,
    required: true,
    requiredForNewAgents: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
    validationRules: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    },
  },
  [IndiaDocumentType.AADHAAR_CARD]: {
    id: IndiaDocumentType.AADHAAR_CARD,
    name: 'Aadhaar Card',
    description: 'UIDAI issued 12-digit identification number. Both front and back required.',
    category: DocumentCategory.IDENTITY,
    required: true,
    requiredForNewAgents: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
    validationRules: {
      pattern: /^[0-9]{12}$/,
    },
  },
  [IndiaDocumentType.PASSPORT]: {
    id: IndiaDocumentType.PASSPORT,
    name: 'Passport',
    description: 'Valid Indian passport. Required for international travel agent operations.',
    category: DocumentCategory.IDENTITY,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.VOTER_ID]: {
    id: IndiaDocumentType.VOTER_ID,
    name: 'Voter ID',
    description: 'Election Commission issued Voter ID card.',
    category: DocumentCategory.IDENTITY,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.DRIVING_LICENSE]: {
    id: IndiaDocumentType.DRIVING_LICENSE,
    name: 'Driving License',
    description: 'Valid driving license issued by RTO.',
    category: DocumentCategory.IDENTITY,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  
  // Business Documents
  [IndiaDocumentType.GST_CERTIFICATE]: {
    id: IndiaDocumentType.GST_CERTIFICATE,
    name: 'GST Registration Certificate',
    description: 'GSTIN registration certificate. Required if annual turnover exceeds ₹20 lakhs.',
    category: DocumentCategory.BUSINESS,
    required: false, // Required only if turnover > 20L
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
    validationRules: {
      pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    },
  },
  [IndiaDocumentType.SHOP_ESTABLISHMENT]: {
    id: IndiaDocumentType.SHOP_ESTABLISHMENT,
    name: 'Shop & Establishment License',
    description: 'Shop and Establishment Act registration from local municipal authority.',
    category: DocumentCategory.BUSINESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.PARTNERSHIP_DEED]: {
    id: IndiaDocumentType.PARTNERSHIP_DEED,
    name: 'Partnership Deed',
    description: 'Registered partnership deed for partnership firms.',
    category: DocumentCategory.BUSINESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  [IndiaDocumentType.CERTIFICATE_OF_INCORPORATION]: {
    id: IndiaDocumentType.CERTIFICATE_OF_INCORPORATION,
    name: 'Certificate of Incorporation',
    description: 'Company registration certificate from MCA/ROC.',
    category: DocumentCategory.BUSINESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  [IndiaDocumentType.LLP_AGREEMENT]: {
    id: IndiaDocumentType.LLP_AGREEMENT,
    name: 'LLP Agreement',
    description: 'Limited Liability Partnership agreement registered with ROC.',
    category: DocumentCategory.BUSINESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  [IndiaDocumentType.MSME_UDYAM_REGISTRATION]: {
    id: IndiaDocumentType.MSME_UDYAM_REGISTRATION,
    name: 'MSME/Udyam Registration',
    description: 'Udyam registration certificate for micro, small, and medium enterprises.',
    category: DocumentCategory.BUSINESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  
  // Professional Certifications
  [IndiaDocumentType.IATA_CERTIFICATE]: {
    id: IndiaDocumentType.IATA_CERTIFICATE,
    name: 'IATA Accreditation Certificate',
    description: 'International Air Transport Association accreditation certificate.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.MOT_RECOGNITION]: {
    id: IndiaDocumentType.MOT_RECOGNITION,
    name: 'MOT Recognition Certificate',
    description: 'Ministry of Tourism approved travel agent recognition certificate.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.IATO_MEMBERSHIP]: {
    id: IndiaDocumentType.IATO_MEMBERSHIP,
    name: 'IATO Membership Certificate',
    description: 'Indian Association of Tour Operators membership certificate.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.TAAI_MEMBERSHIP]: {
    id: IndiaDocumentType.TAAI_MEMBERSHIP,
    name: 'TAAI Membership Certificate',
    description: 'Travel Agents Association of India membership certificate.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.TAFI_MEMBERSHIP]: {
    id: IndiaDocumentType.TAFI_MEMBERSHIP,
    name: 'TAFI Membership Certificate',
    description: 'Travel Agents Federation of India membership certificate.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.OTOAI_MEMBERSHIP]: {
    id: IndiaDocumentType.OTOAI_MEMBERSHIP,
    name: 'OTOAI Membership Certificate',
    description: 'Outbound Tour Operators Association of India membership certificate.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.OTHER_CERTIFICATION]: {
    id: IndiaDocumentType.OTHER_CERTIFICATION,
    name: 'Other Professional Certification',
    description: 'Any other relevant travel industry certification.',
    category: DocumentCategory.PROFESSIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  
  // Financial Documents
  [IndiaDocumentType.BANK_STATEMENT]: {
    id: IndiaDocumentType.BANK_STATEMENT,
    name: 'Bank Statement',
    description: 'Last 3 months bank statement showing business transactions.',
    category: DocumentCategory.FINANCIAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  [IndiaDocumentType.CANCELLED_CHEQUE]: {
    id: IndiaDocumentType.CANCELLED_CHEQUE,
    name: 'Cancelled Cheque',
    description: 'Cancelled cheque from your business bank account for payment verification.',
    category: DocumentCategory.FINANCIAL,
    required: true,
    requiredForNewAgents: true,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.ITR_LAST_YEAR]: {
    id: IndiaDocumentType.ITR_LAST_YEAR,
    name: 'ITR - Last Financial Year',
    description: 'Income Tax Return acknowledgment for the last financial year.',
    category: DocumentCategory.FINANCIAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  [IndiaDocumentType.ITR_PREVIOUS_YEAR]: {
    id: IndiaDocumentType.ITR_PREVIOUS_YEAR,
    name: 'ITR - Previous Financial Year',
    description: 'Income Tax Return acknowledgment for the year before last.',
    category: DocumentCategory.FINANCIAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  
  // Address Proof
  [IndiaDocumentType.UTILITY_BILL]: {
    id: IndiaDocumentType.UTILITY_BILL,
    name: 'Utility Bill',
    description: 'Recent electricity/water/gas bill (not older than 3 months) for office address.',
    category: DocumentCategory.ADDRESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.RENT_AGREEMENT]: {
    id: IndiaDocumentType.RENT_AGREEMENT,
    name: 'Rent Agreement',
    description: 'Registered rent agreement for office premises.',
    category: DocumentCategory.ADDRESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  [IndiaDocumentType.PROPERTY_DOCUMENTS]: {
    id: IndiaDocumentType.PROPERTY_DOCUMENTS,
    name: 'Property Documents',
    description: 'Ownership documents for office premises.',
    category: DocumentCategory.ADDRESS,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  
  // Additional Documents
  [IndiaDocumentType.PROFESSIONAL_PHOTO]: {
    id: IndiaDocumentType.PROFESSIONAL_PHOTO,
    name: 'Professional Photo',
    description: 'Recent passport-size photograph with white background.',
    category: DocumentCategory.ADDITIONAL,
    required: true,
    requiredForNewAgents: true,
    acceptedFormats: ['jpg', 'jpeg', 'png'],
    maxSizeMB: 2,
  },
  [IndiaDocumentType.OFFICE_FRONT_PHOTO]: {
    id: IndiaDocumentType.OFFICE_FRONT_PHOTO,
    name: 'Office Front Photo',
    description: 'Photo of office exterior showing signage.',
    category: DocumentCategory.ADDITIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.OFFICE_INTERIOR_PHOTO]: {
    id: IndiaDocumentType.OFFICE_INTERIOR_PHOTO,
    name: 'Office Interior Photo',
    description: 'Photo of office interior showing workspace.',
    category: DocumentCategory.ADDITIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.INSURANCE_CERTIFICATE]: {
    id: IndiaDocumentType.INSURANCE_CERTIFICATE,
    name: 'Insurance Certificate',
    description: 'Professional liability or errors & omissions insurance certificate.',
    category: DocumentCategory.ADDITIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
  [IndiaDocumentType.EXPERIENCE_CERTIFICATE]: {
    id: IndiaDocumentType.EXPERIENCE_CERTIFICATE,
    name: 'Experience Certificate',
    description: 'Employment certificate from previous travel agency or employer.',
    category: DocumentCategory.ADDITIONAL,
    required: false,
    requiredForNewAgents: false,
    acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
    maxSizeMB: 5,
  },
};

// ============================================================================
// MINIMUM REQUIRED DOCUMENTS FOR VERIFICATION
// ============================================================================

/**
 * Minimum documents required for agent verification.
 * Agent must submit at least these documents to begin the verification process.
 */
export const MINIMUM_REQUIRED_DOCUMENTS: IndiaDocumentType[] = [
  IndiaDocumentType.PAN_CARD,
  IndiaDocumentType.AADHAAR_CARD,
  IndiaDocumentType.CANCELLED_CHEQUE,
  IndiaDocumentType.PROFESSIONAL_PHOTO,
];

/**
 * Documents that boost verification score (recommended but not mandatory).
 */
export const RECOMMENDED_DOCUMENTS: IndiaDocumentType[] = [
  IndiaDocumentType.GST_CERTIFICATE,
  IndiaDocumentType.SHOP_ESTABLISHMENT,
  IndiaDocumentType.IATA_CERTIFICATE,
  IndiaDocumentType.MOT_RECOGNITION,
  IndiaDocumentType.IATO_MEMBERSHIP,
  IndiaDocumentType.TAAI_MEMBERSHIP,
];

// ============================================================================
// DOCUMENT STATUS
// ============================================================================

export const DocumentStatus = {
  NOT_UPLOADED: 'NOT_UPLOADED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REUPLOAD_REQUESTED: 'REUPLOAD_REQUESTED',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

// ============================================================================
// VERIFICATION DOCUMENT ENTITY
// ============================================================================

export interface VerificationDocument {
  id: string;
  userId: string;
  documentType: IndiaDocumentType;
  category: DocumentCategory;
  documentUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  
  // Extracted data (from OCR or manual entry)
  extractedData?: {
    documentNumber?: string;
    name?: string;
    expiryDate?: string;
    issueDate?: string;
    issuingAuthority?: string;
    address?: string;
  };
  
  // Verification
  status: DocumentStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  
  // Admin feedback
  adminComments: string | null;
  rejectionReason: string | null;
  reuploadRequestedAt: string | null;
  reuploadDeadline: string | null;
  
  // Timestamps
  uploadedAt: string;
  updatedAt: string;
}

// ============================================================================
// ADMIN COMMENT / FEEDBACK
// ============================================================================

export interface VerificationComment {
  id: string;
  userId: string;
  documentId: string | null; // null if general comment
  adminId: string;
  adminName: string;
  comment: string;
  action: 'COMMENT' | 'REQUEST_REUPLOAD' | 'REQUEST_ADDITIONAL' | 'APPROVE' | 'REJECT';
  isRead: boolean;
  createdAt: string;
}

// ============================================================================
// VERIFICATION PROGRESS
// ============================================================================

export interface VerificationProgress {
  totalRequired: number;
  uploaded: number;
  approved: number;
  rejected: number;
  pendingReview: number;
  reuploadRequested: number;
  percentComplete: number;
  missingRequired: IndiaDocumentType[];
  canSubmitForReview: boolean;
}

// ============================================================================
// BUSINESS TYPE
// ============================================================================

export const BusinessType = {
  INDIVIDUAL: 'INDIVIDUAL',
  PROPRIETORSHIP: 'PROPRIETORSHIP',
  PARTNERSHIP: 'PARTNERSHIP',
  PRIVATE_LIMITED: 'PRIVATE_LIMITED',
  LLP: 'LLP',
  PUBLIC_LIMITED: 'PUBLIC_LIMITED',
} as const;

export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

/**
 * Required business documents based on business type.
 */
export const BUSINESS_TYPE_REQUIRED_DOCS: Record<BusinessType, IndiaDocumentType[]> = {
  [BusinessType.INDIVIDUAL]: [IndiaDocumentType.PAN_CARD, IndiaDocumentType.AADHAAR_CARD],
  [BusinessType.PROPRIETORSHIP]: [IndiaDocumentType.PAN_CARD, IndiaDocumentType.AADHAAR_CARD, IndiaDocumentType.SHOP_ESTABLISHMENT],
  [BusinessType.PARTNERSHIP]: [IndiaDocumentType.PAN_CARD, IndiaDocumentType.PARTNERSHIP_DEED],
  [BusinessType.PRIVATE_LIMITED]: [IndiaDocumentType.CERTIFICATE_OF_INCORPORATION],
  [BusinessType.LLP]: [IndiaDocumentType.LLP_AGREEMENT],
  [BusinessType.PUBLIC_LIMITED]: [IndiaDocumentType.CERTIFICATE_OF_INCORPORATION],
};
