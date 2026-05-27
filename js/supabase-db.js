// ============================================
// CET EXAM ONLINE - SUPABASE DATABASE LAYER
// Dual-write helper: writes to Supabase alongside localStorage
// All functions are fire-and-forget safe — never block the UI
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn('[SupaDB] Failed to init Supabase client:', e.message);
  }
}

/**
 * Check if Supabase is available
 */
export function isReady() {
  return supabase !== null;
}

/**
 * Get the raw Supabase client (for advanced queries)
 */
export function getClient() {
  return supabase;
}

// ============================================
// STORAGE HELPERS
// ============================================

/**
 * Convert a Base64 data URL to a Blob for upload
 */
function dataUrlToBlob(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const [header, b64data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(b64data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * Get file extension from a base64 data URL
 */
function getExtFromDataUrl(dataUrl) {
  if (!dataUrl) return 'bin';
  const mime = dataUrl.match(/data:(.*?);/)?.[1] || '';
  const map = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/gif': 'gif', 'image/webp': 'webp', 'application/pdf': 'pdf',
  };
  return map[mime] || 'bin';
}

/**
 * Upload a base64 file to a Supabase Storage bucket.
 * Returns the public URL on success, null on failure.
 * @param {string} bucket - Bucket name
 * @param {string} path - File path inside the bucket (e.g. "stu123/photo.jpg")
 * @param {string} dataUrl - Base64 data URL
 */
export async function uploadFile(bucket, path, dataUrl) {
  if (!supabase || !dataUrl) return null;
  try {
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return null;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: true,  // overwrite if re-submitting
      });

    if (error) {
      console.warn(`[SupaDB] Upload to ${bucket}/${path} failed:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.warn(`[SupaDB] Upload error:`, e.message);
    return null;
  }
}

// ============================================
// STUDENT REGISTRATION (Phase 2)
// ============================================

/**
 * Save a student application to Supabase (dual-write).
 * This is called AFTER localStorage save succeeds.
 * If Supabase fails, it logs and returns null — never throws.
 *
 * @param {Object} appData - The full applicationData object from apply.html
 * @param {Object} fileDataMap - Map of fileId -> base64 data URL
 * @returns {Promise<{studentId: string, supabaseId: string}|null>}
 */
export async function saveStudentApplication(appData, fileDataMap) {
  if (!supabase) {
    console.warn('[SupaDB] Supabase not available, skipping cloud save.');
    return null;
  }

  try {
    const email = appData.email?.toLowerCase();
    const studentFolder = email.replace(/[^a-z0-9]/g, '_');

    // 1. Upload files to Storage (non-blocking individual failures)
    const docUrls = {};
    const uploadTasks = [];

    const fileMapping = [
      { key: 'photoFile',         bucket: 'student-photos',      name: 'passport_photo' },
      { key: 'signatureFile',     bucket: 'student-photos',      name: 'signature' },
      { key: 'tenthFile',         bucket: 'student-documents',   name: '10th_marksheet' },
      { key: 'twelfthFile',       bucket: 'student-documents',   name: '12th_marksheet' },
      { key: 'paymentScreenshot', bucket: 'payment-screenshots', name: 'payment_proof' },
    ];

    // Add caste-specific documents
    const casteDocKeys = Object.keys(fileDataMap).filter(k =>
      !fileMapping.some(m => m.key === k) && fileDataMap[k]
    );
    for (const docKey of casteDocKeys) {
      fileMapping.push({
        key: docKey,
        bucket: 'student-documents',
        name: docKey.replace(/File$/, '').replace(/([A-Z])/g, '_$1').toLowerCase(),
      });
    }

    for (const fm of fileMapping) {
      const dataUrl = fileDataMap[fm.key];
      if (!dataUrl) continue;
      const ext = getExtFromDataUrl(dataUrl);
      const path = `${studentFolder}/${fm.name}.${ext}`;
      uploadTasks.push(
        uploadFile(fm.bucket, path, dataUrl).then(url => {
          if (url) docUrls[fm.key] = { url, bucket: fm.bucket, path };
        })
      );
    }

    // Wait for all uploads (parallel)
    await Promise.allSettled(uploadTasks);
    console.log('[SupaDB] Uploaded files:', Object.keys(docUrls));

    // 2. Upsert student record
    const studentRow = {
      student_id:         appData.studentId,
      full_name:          appData.fullName,
      email:              email,
      mobile:             appData.mobile,
      dob:                appData.dob,
      address:            appData.address,
      category:           appData.category,
      status:             appData.status || 'pending',
      application_status: appData.applicationStatus || 'PENDING_APPROVAL',
      exam_status:        appData.examStatus || 'NOT_SCHEDULED',
      has_attempted:      false,
      payment_status:     appData.paymentStatus || 'PAID_DEMO',
      payment_utr:        appData.paymentUtr || appData.transactionId,
      payment_date:       appData.paymentDate,
      payment_amount:     appData.paymentAmount || 'Rs.1',
      transaction_id:     appData.transactionId,
      course_applied:     appData.courseApplied,
      stream:             appData.stream,
      academic_details:   appData.academicDetails,
      password_hash:      appData.password,  // Will be replaced with proper auth in Phase 3
      submitted_at:       appData.submittedAt,
      applied_at:         appData.appliedAt,
    };

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .upsert(studentRow, { onConflict: 'email' })
      .select('id')
      .single();

    if (studentError) {
      console.error('[SupaDB] Student upsert error:', studentError.message);
      return null;
    }

    const supabaseStudentId = studentData.id;
    console.log('[SupaDB] Student saved with ID:', supabaseStudentId);

    // 3. Save document references
    if (Object.keys(docUrls).length > 0) {
      const docRows = Object.entries(docUrls).map(([key, info]) => ({
        student_id: supabaseStudentId,
        doc_type:   key,
        file_url:   info.url,
        file_name:  info.path.split('/').pop(),
      }));

      // Delete old docs for this student first (re-submission)
      await supabase
        .from('student_documents')
        .delete()
        .eq('student_id', supabaseStudentId);

      const { error: docError } = await supabase
        .from('student_documents')
        .insert(docRows);

      if (docError) {
        console.warn('[SupaDB] Document refs save error:', docError.message);
      } else {
        console.log('[SupaDB] Saved', docRows.length, 'document references');
      }
    }

    // 4. Save payment record
    const paymentRow = {
      student_id:     supabaseStudentId,
      application_id: appData.applicationId,
      cet_student_id: appData.studentId,
      full_name:      appData.fullName,
      email:          email,
      course_applied: appData.courseApplied,
      payment_status: appData.paymentStatus || 'PAID_DEMO',
      payment_amount: appData.paymentAmount || 'Rs.1',
      payment_utr:    appData.paymentUtr || appData.transactionId,
      payment_date:   appData.paymentDate,
      screenshot_url: docUrls['paymentScreenshot']?.url || null,
      submitted_at:   appData.submittedAt,
    };

    const { error: payError } = await supabase
      .from('payments')
      .insert(paymentRow);

    if (payError) {
      console.warn('[SupaDB] Payment save error:', payError.message);
    }

    console.log('[SupaDB] ✅ Full application saved to Supabase successfully!');
    return { studentId: appData.studentId, supabaseId: supabaseStudentId };

  } catch (e) {
    console.error('[SupaDB] Unexpected error during save:', e);
    return null;  // Never break the flow
  }
}

export default { isReady, getClient, uploadFile, saveStudentApplication };
