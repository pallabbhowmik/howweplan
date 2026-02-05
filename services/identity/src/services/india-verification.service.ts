/**
 * India Agent Verification Service
 * 
 * Comprehensive document verification service for Indian travel agents.
 * Handles document upload, validation, admin review, and real-time feedback.
 */

import { getDbClient } from './database.js';
import { EventContext } from '../events/index.js';
import { UserRole } from '../types/identity.types.js';
import {
  IndiaDocumentType,
  DocumentStatus,
  DOCUMENT_TYPE_INFO,
  MINIMUM_REQUIRED_DOCUMENTS,
  VerificationDocument,
  VerificationComment,
  VerificationProgress,
  BusinessType,
} from '../types/india-verification.types.js';
import { UserNotFoundError, InsufficientPermissionsError } from './errors.js';
import { getUserById } from './user.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT UPLOAD & MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a verification document.
 * Creates or updates a document entry for the specified document type.
 */
export async function uploadDocument(
  userId: string,
  documentType: IndiaDocumentType,
  documentUrl: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  extractedData?: Record<string, string>
): Promise<VerificationDocument> {
  const db = getDbClient();

  // Verify user exists and is an agent
  const user = await getUserById(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }
  if (user.role !== UserRole.AGENT) {
    throw new InsufficientPermissionsError('Only agents can upload verification documents');
  }

  const docInfo = DOCUMENT_TYPE_INFO[documentType];
  if (!docInfo) {
    throw new Error(`Invalid document type: ${documentType}`);
  }

  // Check if document already exists - upsert
  const { data: existing } = await db
    .from('verification_documents')
    .select('id')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .single();

  let result;
  const documentData = {
    user_id: userId,
    document_type: documentType,
    category: docInfo.category,
    document_url: documentUrl,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
    extracted_data: extractedData || {},
    status: DocumentStatus.PENDING_REVIEW,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Clear any previous rejection
    rejection_reason: null,
    reupload_requested_at: null,
    reupload_deadline: null,
    admin_comments: null,
  };

  if (existing) {
    // Update existing document
    const { data, error } = await db
      .from('verification_documents')
      .update(documentData)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
    result = data;
  } else {
    // Insert new document
    const { data, error } = await db
      .from('verification_documents')
      .insert(documentData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to upload document: ${error.message}`);
    }
    result = data;
  }

  // Update agent verification profile
  await updateVerificationProfileTimestamp(userId);

  return mapDbRowToDocument(result);
}

/**
 * Get all documents for a user.
 */
export async function getDocuments(userId: string): Promise<VerificationDocument[]> {
  const db = getDbClient();

  const { data, error } = await db
    .from('verification_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return (data || []).map(mapDbRowToDocument);
}

/**
 * Get a specific document.
 */
export async function getDocument(userId: string, documentType: IndiaDocumentType): Promise<VerificationDocument | null> {
  const db = getDbClient();

  const { data, error } = await db
    .from('verification_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbRowToDocument(data);
}

/**
 * Delete a document (only allowed if not yet approved).
 */
export async function deleteDocument(userId: string, documentId: string): Promise<void> {
  const db = getDbClient();

  // Check document exists and is deletable
  const { data: doc, error: fetchError } = await db
    .from('verification_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  if (doc.status === DocumentStatus.APPROVED) {
    throw new Error('Cannot delete approved documents');
  }

  const { error } = await db
    .from('verification_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get verification progress for a user.
 */
export async function getVerificationProgress(userId: string): Promise<VerificationProgress> {
  const documents = await getDocuments(userId);

  const totalRequired = MINIMUM_REQUIRED_DOCUMENTS.length;
  const uploadedDocs = new Set(documents.map(d => d.documentType));
  const approved = documents.filter(d => d.status === DocumentStatus.APPROVED).length;
  const rejected = documents.filter(d => d.status === DocumentStatus.REJECTED).length;
  const pendingReview = documents.filter(d => d.status === DocumentStatus.PENDING_REVIEW).length;
  const reuploadRequested = documents.filter(d => d.status === DocumentStatus.REUPLOAD_REQUESTED).length;

  const missingRequired = MINIMUM_REQUIRED_DOCUMENTS.filter(docType => !uploadedDocs.has(docType));
  const uploaded = documents.length;

  // Can submit for review if all required documents are uploaded
  const canSubmitForReview = missingRequired.length === 0;

  // Calculate percentage (based on required documents approved)
  const requiredApproved = documents.filter(
    d => MINIMUM_REQUIRED_DOCUMENTS.includes(d.documentType as IndiaDocumentType) && d.status === DocumentStatus.APPROVED
  ).length;
  const percentComplete = Math.round((requiredApproved / totalRequired) * 100);

  return {
    totalRequired,
    uploaded,
    approved,
    rejected,
    pendingReview,
    reuploadRequested,
    percentComplete,
    missingRequired,
    canSubmitForReview,
  };
}

/**
 * Submit all documents for review.
 * Validates that all required documents are uploaded.
 */
export async function submitForReview(userId: string, _eventContext?: EventContext): Promise<void> {
  const db = getDbClient();

  const progress = await getVerificationProgress(userId);

  if (progress.missingRequired.length > 0) {
    const missing = progress.missingRequired.map(
      docType => DOCUMENT_TYPE_INFO[docType].name
    ).join(', ');
    throw new Error(`Missing required documents: ${missing}`);
  }

  // Update agent profile verification status
  await db
    .from('agent_profiles')
    .update({
      verification_status: 'PENDING_REVIEW',
      verification_submitted_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Update verification profile
  await db
    .from('agent_verification_profiles')
    .update({
      documents_submitted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Add to history
  await addVerificationHistory(userId, null, 'SUBMITTED_FOR_REVIEW', null, 'PENDING_REVIEW', userId, 'Agent', 'Documents submitted for review');
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DOCUMENT REVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all pending verification documents for admin review.
 */
export async function getPendingVerifications(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  documents: Array<{
    document: VerificationDocument;
    user: { id: string; email: string; name: string };
  }>;
  total: number;
  page: number;
  pageSize: number;
}> {
  const db = getDbClient();
  const offset = (page - 1) * pageSize;

  // Get count
  const { count } = await db
    .from('verification_documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', DocumentStatus.PENDING_REVIEW);

  // Get documents with user info
  const { data, error } = await db
    .from('verification_documents')
    .select(`
      *,
      users:user_id (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('status', DocumentStatus.PENDING_REVIEW)
    .order('uploaded_at', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch pending verifications: ${error.message}`);
  }

  return {
    documents: (data || []).map((row: any) => ({
      document: mapDbRowToDocument(row),
      user: {
        id: row.users.id,
        email: row.users.email,
        name: `${row.users.first_name || ''} ${row.users.last_name || ''}`.trim() || row.users.email,
      },
    })),
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Get all documents for a specific agent (for admin review).
 */
export async function getAgentDocumentsForAdmin(agentUserId: string): Promise<{
  documents: VerificationDocument[];
  profile: any;
  progress: VerificationProgress;
}> {
  const db = getDbClient();

  const documents = await getDocuments(agentUserId);
  const progress = await getVerificationProgress(agentUserId);

  // Get verification profile
  const { data: profile } = await db
    .from('agent_verification_profiles')
    .select('*')
    .eq('user_id', agentUserId)
    .single();

  return {
    documents,
    profile,
    progress,
  };
}

/**
 * Approve a specific document.
 */
export async function approveDocument(
  documentId: string,
  adminId: string,
  adminName: string,
  notes?: string
): Promise<VerificationDocument> {
  const db = getDbClient();

  const { data: doc, error: fetchError } = await db
    .from('verification_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  const { data, error } = await db
    .from('verification_documents')
    .update({
      status: DocumentStatus.APPROVED,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      admin_comments: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to approve document: ${error.message}`);
  }

  // Add history
  await addVerificationHistory(doc.user_id, documentId, 'DOCUMENT_APPROVED', 'PENDING_REVIEW', 'APPROVED', adminId, adminName, notes || 'Document approved');

  // Add comment for agent notification
  await addComment(doc.user_id, documentId, adminId, adminName, notes || `Your ${DOCUMENT_TYPE_INFO[doc.document_type as IndiaDocumentType].name} has been approved.`, 'APPROVE');

  // Check if all required documents are approved
  await checkAndCompleteVerification(doc.user_id, adminId, adminName);

  return mapDbRowToDocument(data);
}

/**
 * Reject a specific document.
 */
export async function rejectDocument(
  documentId: string,
  adminId: string,
  adminName: string,
  rejectionReason: string
): Promise<VerificationDocument> {
  const db = getDbClient();

  const { data: doc, error: fetchError } = await db
    .from('verification_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  const { data, error } = await db
    .from('verification_documents')
    .update({
      status: DocumentStatus.REJECTED,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      rejection_reason: rejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to reject document: ${error.message}`);
  }

  // Add history
  await addVerificationHistory(doc.user_id, documentId, 'DOCUMENT_REJECTED', 'PENDING_REVIEW', 'REJECTED', adminId, adminName, rejectionReason);

  // Add comment for agent notification
  await addComment(doc.user_id, documentId, adminId, adminName, `Your ${DOCUMENT_TYPE_INFO[doc.document_type as IndiaDocumentType].name} was rejected: ${rejectionReason}`, 'REJECT');

  return mapDbRowToDocument(data);
}

/**
 * Request document re-upload.
 */
export async function requestReupload(
  documentId: string,
  adminId: string,
  adminName: string,
  reason: string,
  deadlineDays: number = 7
): Promise<VerificationDocument> {
  const db = getDbClient();

  const { data: doc, error: fetchError } = await db
    .from('verification_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + deadlineDays);

  const { data, error } = await db
    .from('verification_documents')
    .update({
      status: DocumentStatus.REUPLOAD_REQUESTED,
      reupload_requested_at: new Date().toISOString(),
      reupload_deadline: deadline.toISOString(),
      admin_comments: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to request reupload: ${error.message}`);
  }

  // Add history
  await addVerificationHistory(doc.user_id, documentId, 'REUPLOAD_REQUESTED', doc.status, 'REUPLOAD_REQUESTED', adminId, adminName, reason);

  // Add comment for agent notification
  await addComment(
    doc.user_id,
    documentId,
    adminId,
    adminName,
    `Please re-upload your ${DOCUMENT_TYPE_INFO[doc.document_type as IndiaDocumentType].name}: ${reason}. Deadline: ${deadline.toLocaleDateString()}`,
    'REQUEST_REUPLOAD'
  );

  return mapDbRowToDocument(data);
}

/**
 * Request additional document.
 */
export async function requestAdditionalDocument(
  userId: string,
  documentType: IndiaDocumentType,
  adminId: string,
  adminName: string,
  reason: string
): Promise<void> {
  // Add comment for agent notification
  await addComment(
    userId,
    null,
    adminId,
    adminName,
    `Please upload additional document: ${DOCUMENT_TYPE_INFO[documentType].name}. Reason: ${reason}`,
    'REQUEST_ADDITIONAL'
  );

  // Add history
  await addVerificationHistory(userId, null, 'ADDITIONAL_DOCUMENT_REQUESTED', null, null, adminId, adminName, `Requested ${documentType}: ${reason}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS & NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an admin comment.
 */
export async function addComment(
  userId: string,
  documentId: string | null,
  adminId: string,
  adminName: string,
  comment: string,
  action: 'COMMENT' | 'REQUEST_REUPLOAD' | 'REQUEST_ADDITIONAL' | 'APPROVE' | 'REJECT'
): Promise<VerificationComment> {
  const db = getDbClient();

  const { data, error } = await db
    .from('verification_comments')
    .insert({
      user_id: userId,
      document_id: documentId,
      admin_id: adminId,
      admin_name: adminName,
      comment,
      action,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  return mapDbRowToComment(data);
}

/**
 * Get unread comments for a user.
 */
export async function getUnreadComments(userId: string): Promise<VerificationComment[]> {
  const db = getDbClient();

  const { data, error } = await db
    .from('verification_comments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  return (data || []).map(mapDbRowToComment);
}

/**
 * Get all comments for a user.
 */
export async function getAllComments(userId: string): Promise<VerificationComment[]> {
  const db = getDbClient();

  const { data, error } = await db
    .from('verification_comments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  return (data || []).map(mapDbRowToComment);
}

/**
 * Mark comment as read.
 */
export async function markCommentAsRead(userId: string, commentId: string): Promise<void> {
  const db = getDbClient();

  await db
    .from('verification_comments')
    .update({ is_read: true })
    .eq('id', commentId)
    .eq('user_id', userId);
}

/**
 * Mark all comments as read.
 */
export async function markAllCommentsAsRead(userId: string): Promise<void> {
  const db = getDbClient();

  await db
    .from('verification_comments')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create verification profile.
 */
export async function getOrCreateVerificationProfile(userId: string, agentId: string): Promise<any> {
  const db = getDbClient();

  const { data: existing } = await db
    .from('agent_verification_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new profile
  const { data, error } = await db
    .from('agent_verification_profiles')
    .insert({
      user_id: userId,
      agent_id: agentId,
      business_type: BusinessType.INDIVIDUAL,
      first_login_prompt_shown: false,
      documents_submitted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create verification profile: ${error.message}`);
  }

  return data;
}

/**
 * Update business information.
 */
export async function updateBusinessInfo(
  userId: string,
  businessInfo: {
    businessType?: BusinessType;
    businessName?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessPincode?: string;
    primaryPhone?: string;
    secondaryPhone?: string;
    whatsappNumber?: string;
    businessEmail?: string;
    websiteUrl?: string;
    panNumber?: string;
    gstin?: string;
    iataNumber?: string;
  }
): Promise<any> {
  const db = getDbClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (businessInfo.businessType) updateData.business_type = businessInfo.businessType;
  if (businessInfo.businessName) updateData.business_name = businessInfo.businessName;
  if (businessInfo.businessAddress) updateData.business_address = businessInfo.businessAddress;
  if (businessInfo.businessCity) updateData.business_city = businessInfo.businessCity;
  if (businessInfo.businessState) updateData.business_state = businessInfo.businessState;
  if (businessInfo.businessPincode) updateData.business_pincode = businessInfo.businessPincode;
  if (businessInfo.primaryPhone) updateData.primary_phone = businessInfo.primaryPhone;
  if (businessInfo.secondaryPhone) updateData.secondary_phone = businessInfo.secondaryPhone;
  if (businessInfo.whatsappNumber) updateData.whatsapp_number = businessInfo.whatsappNumber;
  if (businessInfo.businessEmail) updateData.business_email = businessInfo.businessEmail;
  if (businessInfo.websiteUrl) updateData.website_url = businessInfo.websiteUrl;
  if (businessInfo.panNumber) updateData.pan_number = businessInfo.panNumber;
  if (businessInfo.gstin) updateData.gstin = businessInfo.gstin;
  if (businessInfo.iataNumber) updateData.iata_number = businessInfo.iataNumber;

  const { data, error } = await db
    .from('agent_verification_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update business info: ${error.message}`);
  }

  return data;
}

/**
 * Mark first login prompt as shown.
 */
export async function markFirstLoginPromptShown(userId: string): Promise<void> {
  const db = getDbClient();

  await db
    .from('agent_verification_profiles')
    .update({
      first_login_prompt_shown: true,
      verification_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function updateVerificationProfileTimestamp(userId: string): Promise<void> {
  const db = getDbClient();

  await db
    .from('agent_verification_profiles')
    .update({
      last_document_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

async function addVerificationHistory(
  userId: string,
  documentId: string | null,
  action: string,
  previousStatus: string | null,
  newStatus: string | null,
  performedBy: string,
  performedByName: string,
  notes: string
): Promise<void> {
  const db = getDbClient();

  await db.from('verification_history').insert({
    user_id: userId,
    document_id: documentId,
    action,
    previous_status: previousStatus,
    new_status: newStatus,
    performed_by: performedBy,
    performed_by_name: performedByName,
    notes,
    created_at: new Date().toISOString(),
  });
}

async function checkAndCompleteVerification(userId: string, adminId: string, adminName: string): Promise<void> {
  const db = getDbClient();

  const documents = await getDocuments(userId);

  // Check if all required documents are approved
  const requiredDocs = MINIMUM_REQUIRED_DOCUMENTS;
  const approvedDocTypes = new Set(
    documents
      .filter(d => d.status === DocumentStatus.APPROVED)
      .map(d => d.documentType)
  );

  const allRequiredApproved = requiredDocs.every(docType => approvedDocTypes.has(docType));

  if (allRequiredApproved) {
    // Auto-complete verification
    await db
      .from('agent_profiles')
      .update({
        verification_status: 'VERIFIED',
        verification_completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Update agents table
    await db
      .from('agents')
      .update({
        is_verified: true,
        is_available: true,
      })
      .eq('user_id', userId);

    // Update user status
    await db
      .from('users')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Update verification profile
    await db
      .from('agent_verification_profiles')
      .update({
        verification_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Add history
    await addVerificationHistory(userId, null, 'VERIFICATION_COMPLETED', 'PENDING_REVIEW', 'VERIFIED', adminId, adminName, 'All required documents approved');

    // Add congratulatory comment
    await addComment(
      userId,
      null,
      adminId,
      adminName,
      'Congratulations! Your verification is complete. You can now receive travel requests.',
      'APPROVE'
    );

    // TODO: Trigger matching service notification
    console.log(`Agent ${userId} verification completed - triggering matching notification`);
  }
}

function mapDbRowToDocument(row: any): VerificationDocument {
  return {
    id: row.id,
    userId: row.user_id,
    documentType: row.document_type,
    category: row.category,
    documentUrl: row.document_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    extractedData: row.extracted_data,
    status: row.status,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    adminComments: row.admin_comments,
    rejectionReason: row.rejection_reason,
    reuploadRequestedAt: row.reupload_requested_at,
    reuploadDeadline: row.reupload_deadline,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  };
}

function mapDbRowToComment(row: any): VerificationComment {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    comment: row.comment,
    action: row.action,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
