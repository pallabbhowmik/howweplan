/**
 * India Travel Agent Verification Types
 * 
 * These types mirror the backend types defined in:
 * services/identity/src/types/india-verification.types.ts
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

// ============================================================================
// DOCUMENT TYPE INFO
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
}

// ============================================================================
// VERIFICATION DOCUMENT
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
  
  // Extracted data
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
// VERIFICATION COMMENT
// ============================================================================

export interface VerificationComment {
  id: string;
  userId: string;
  documentId: string | null;
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
// VERIFICATION PROFILE
// ============================================================================

export interface VerificationProfile {
  id: string;
  userId: string;
  agentId: string;
  
  // Business Information
  businessType: BusinessType;
  businessName: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPincode: string | null;
  
  // Contact Information
  primaryPhone: string | null;
  secondaryPhone: string | null;
  whatsappNumber: string | null;
  businessEmail: string | null;
  websiteUrl: string | null;
  
  // Verification Info
  panNumber: string | null;
  gstin: string | null;
  iataNumber: string | null;
  
  // Verification Progress
  verificationStartedAt: string | null;
  verificationCompletedAt: string | null;
  lastDocumentUploadedAt: string | null;
  
  // Flags
  firstLoginPromptShown: boolean;
  documentsSubmitted: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MINIMUM REQUIRED DOCUMENTS
// ============================================================================

export const MINIMUM_REQUIRED_DOCUMENTS: IndiaDocumentType[] = [
  IndiaDocumentType.PAN_CARD,
  IndiaDocumentType.AADHAAR_CARD,
  IndiaDocumentType.CANCELLED_CHEQUE,
  IndiaDocumentType.PROFESSIONAL_PHOTO,
];

// ============================================================================
// DOCUMENT TYPE DISPLAY NAMES
// ============================================================================

export const DOCUMENT_TYPE_NAMES: Record<IndiaDocumentType, string> = {
  [IndiaDocumentType.PAN_CARD]: 'PAN Card',
  [IndiaDocumentType.AADHAAR_CARD]: 'Aadhaar Card',
  [IndiaDocumentType.PASSPORT]: 'Passport',
  [IndiaDocumentType.VOTER_ID]: 'Voter ID',
  [IndiaDocumentType.DRIVING_LICENSE]: 'Driving License',
  [IndiaDocumentType.GST_CERTIFICATE]: 'GST Registration Certificate',
  [IndiaDocumentType.SHOP_ESTABLISHMENT]: 'Shop & Establishment License',
  [IndiaDocumentType.PARTNERSHIP_DEED]: 'Partnership Deed',
  [IndiaDocumentType.CERTIFICATE_OF_INCORPORATION]: 'Certificate of Incorporation',
  [IndiaDocumentType.LLP_AGREEMENT]: 'LLP Agreement',
  [IndiaDocumentType.MSME_UDYAM_REGISTRATION]: 'MSME/Udyam Registration',
  [IndiaDocumentType.IATA_CERTIFICATE]: 'IATA Accreditation Certificate',
  [IndiaDocumentType.MOT_RECOGNITION]: 'MOT Recognition Certificate',
  [IndiaDocumentType.IATO_MEMBERSHIP]: 'IATO Membership Certificate',
  [IndiaDocumentType.TAAI_MEMBERSHIP]: 'TAAI Membership Certificate',
  [IndiaDocumentType.TAFI_MEMBERSHIP]: 'TAFI Membership Certificate',
  [IndiaDocumentType.OTOAI_MEMBERSHIP]: 'OTOAI Membership Certificate',
  [IndiaDocumentType.OTHER_CERTIFICATION]: 'Other Professional Certification',
  [IndiaDocumentType.BANK_STATEMENT]: 'Bank Statement',
  [IndiaDocumentType.CANCELLED_CHEQUE]: 'Cancelled Cheque',
  [IndiaDocumentType.ITR_LAST_YEAR]: 'ITR - Last Financial Year',
  [IndiaDocumentType.ITR_PREVIOUS_YEAR]: 'ITR - Previous Financial Year',
  [IndiaDocumentType.UTILITY_BILL]: 'Utility Bill',
  [IndiaDocumentType.RENT_AGREEMENT]: 'Rent Agreement',
  [IndiaDocumentType.PROPERTY_DOCUMENTS]: 'Property Documents',
  [IndiaDocumentType.PROFESSIONAL_PHOTO]: 'Professional Photo',
  [IndiaDocumentType.OFFICE_FRONT_PHOTO]: 'Office Front Photo',
  [IndiaDocumentType.OFFICE_INTERIOR_PHOTO]: 'Office Interior Photo',
  [IndiaDocumentType.INSURANCE_CERTIFICATE]: 'Insurance Certificate',
  [IndiaDocumentType.EXPERIENCE_CERTIFICATE]: 'Experience Certificate',
};

// ============================================================================
// CATEGORY DISPLAY NAMES
// ============================================================================

export const CATEGORY_NAMES: Record<DocumentCategory, string> = {
  [DocumentCategory.IDENTITY]: 'Identity Documents',
  [DocumentCategory.BUSINESS]: 'Business Documents',
  [DocumentCategory.PROFESSIONAL]: 'Professional Certifications',
  [DocumentCategory.FINANCIAL]: 'Financial Documents',
  [DocumentCategory.ADDRESS]: 'Address Proof',
  [DocumentCategory.ADDITIONAL]: 'Additional Documents',
};
