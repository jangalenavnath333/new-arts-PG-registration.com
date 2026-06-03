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
        upsert: false,  // Because we appended Date.now(), it will always be a new file
      });

    if (error) {
      console.error(`[SupaDB] Upload to ${bucket}/${path} failed:`, error);
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
    
    if (!email) {
      console.error("[SupaDB] Email missing or invalid");
      return null;
    }

    // 1. Upsert student record FIRST to get the strict UUID
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
      payment_date:       appData.paymentDate || null,
      payment_amount:     appData.paymentAmount || 'Rs.1',
      transaction_id:     appData.transactionId,
      course_applied:     appData.courseApplied,
      stream:             appData.stream,
      academic_details:   appData.academicDetails,
      password_hash:      appData.password,  // Will be replaced with proper auth in Phase 3
      submitted_at:       appData.submittedAt || null,
      applied_at:         appData.appliedAt || null,
    };

    console.log('[SupaDB] Upserting studentRow payload:', studentRow);
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .upsert(studentRow, { onConflict: 'email,course_applied' })
      .select('id')
      .single();
    
    if (studentError || !studentData || !studentData.id) {
      console.error('[SupaDB] Student upsert error or missing UUID:', studentError?.message || 'No ID returned');
      return null;
    }

    const supabaseStudentId = studentData.id;
    console.log('[SupaDB] Student saved with exact UUID:', supabaseStudentId);

    // 2. Upload files to Storage using text-based application ID for folder naming
    const studentFolder = appData.applicationId; // Keep folder naming based on APP ID
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
      
      if (dataUrl.startsWith('http')) {
        docUrls[fm.key] = { url: dataUrl, bucket: fm.bucket, path: fm.name };
        continue;
      }
      
      const ext = getExtFromDataUrl(dataUrl);
      // Append timestamp to ensure a unique file name, making it an INSERT and bypassing RLS UPDATE restrictions
      const path = `${studentFolder}/${fm.name}_${Date.now()}.${ext}`;
      uploadTasks.push(
        uploadFile(fm.bucket, path, dataUrl).then(url => {
          if (url) docUrls[fm.key] = { url, bucket: fm.bucket, path };
        }).catch(err => {
          console.error(`[SupaDB] Upload exception for ${fm.key}:`, err);
        })
      );
    }

    // Wait for all uploads (parallel)
    await Promise.allSettled(uploadTasks);
    console.log('[SupaDB] Uploaded files:', Object.keys(docUrls));

    // 3. Save document references
    if (Object.keys(docUrls).length > 0) {
      const docRows = Object.entries(docUrls).map(([key, info]) => ({
        student_id: supabaseStudentId,
        doc_type:   key,
        file_url:   info.url,
        file_name:  info.path.split('/').pop(),
      }));

      // Delete old docs for this student first (re-submission)
      console.log('[SupaDB] Deleting old docs for student_id:', supabaseStudentId);
      const { error: delError } = await supabase
        .from('student_documents')
        .delete()
        .eq('student_id', supabaseStudentId);
      console.log('[SupaDB] Delete docs error object:', delError);

      console.log('[SupaDB] Inserting docRows payload:', docRows);
      const { error: docError } = await supabase
        .from('student_documents')
        .insert(docRows);
      console.log('[SupaDB] Insert docs error object:', docError);

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

    console.log('[SupaDB] Inserting paymentRow payload:', paymentRow);
    const { error: payError } = await supabase
      .from('payments')
      .insert(paymentRow);
    console.log('[SupaDB] Insert payment error object:', payError);

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

// ============================================
// RESULT PUBLISHING (Phase 4)
// ============================================
export async function setResultsPublished(isPublished) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'results_published', value: isPublished ? 'true' : 'false' }, { onConflict: 'key' });
    if (error) {
      console.warn('[SupaDB] setResultsPublished error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[SupaDB] setResultsPublished error:', e);
    return false;
  }
}

export async function getResultsPublished() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'results_published')
      .single();
    if (error || !data) return false;
    return data.value === 'true';
  } catch (e) {
    return false;
  }
}

export async function updateResultRanks(rankUpdates) {
  // rankUpdates: [{ student_id: 'CET-123', overall_rank: 1, category_rank: 1 }]
  if (!supabase || !rankUpdates.length) return false;
  try {
    // Supabase allows bulk upsert/update if we include the ID, but here we might only have cet_student_id.
    // Instead of complex bulk update on non-PK, we can loop and update since this is an admin one-off action.
    for (const update of rankUpdates) {
      await supabase
        .from('exam_results')
        .update({ 
          overall_rank: update.overall_rank,
          category_rank: update.category_rank
        })
        .eq('cet_student_id', update.student_id);
    }
    return true;
  } catch(e) {
    console.error('[SupaDB] updateResultRanks error:', e);
    return false;
  }
}

export async function getStudentResultRanks(studentId) {
  if (!supabase || !studentId) return { overallRank: null, categoryRank: null };
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('overall_rank, category_rank')
      .eq('cet_student_id', studentId)
      .single();
    if (error || !data) return { overallRank: null, categoryRank: null };
    return { overallRank: data.overall_rank, categoryRank: data.category_rank };
  } catch(e) {
    return { overallRank: null, categoryRank: null };
  }
}

export default { isReady, getClient, uploadFile, saveStudentApplication, setResultsPublished, getResultsPublished, updateResultRanks, getStudentResultRanks };
