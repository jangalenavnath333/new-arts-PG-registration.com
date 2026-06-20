// ============================================
// CET EXAM ONLINE - SUPABASE DATABASE LAYER
// Dual-write helper: writes to Supabase alongside localStorage
// All functions are fire-and-forget safe — never block the UI
// ============================================

import { createClient } from '@supabase/supabase-js';

const offlineUrl = localStorage.getItem('OFFLINE_API_URL');
const supabaseUrl = offlineUrl || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = offlineUrl ? 'offline-key' : import.meta.env.VITE_SUPABASE_ANON_KEY;

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
      payment_status:     appData.paymentStatus || 'PAID_DEMO',
      payment_utr:        appData.paymentUtr || appData.transactionId,
      payment_amount:     appData.paymentAmount || 'Rs.1',
      transaction_id:     appData.transactionId,
      course_applied:     appData.courseApplied,
      stream:             appData.stream,
      academic_details:   appData.academicDetails,
      password_hash:      appData.password
    };

    // 1. Upload files to Storage
    const studentFolder = appData.applicationId;
    const docUrls = {};
    const uploadTasks = [];

    const fileMapping = [
      { key: 'photoFile',         bucket: 'student-photos',      name: 'passport_photo' },
      { key: 'signatureFile',     bucket: 'student-photos',      name: 'signature' },
      { key: 'tenthFile',         bucket: 'student-documents',   name: '10th_marksheet' },
      { key: 'twelfthFile',       bucket: 'student-documents',   name: '12th_marksheet' },
      { key: 'paymentScreenshot', bucket: 'payment-screenshots', name: 'payment_proof' },
    ];

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
      const path = `${studentFolder}/${fm.name}_${Date.now()}.${ext}`;
      uploadTasks.push(
        uploadFile(fm.bucket, path, dataUrl).then(url => {
          if (url) docUrls[fm.key] = { url, bucket: fm.bucket, path };
        }).catch(err => {
          console.error(`[SupaDB] Upload exception for ${fm.key}:`, err);
        })
      );
    }

    await Promise.allSettled(uploadTasks);
    
    // 2. Prepare Docs Payload
    let docRows = [];
    if (Object.keys(docUrls).length > 0) {
      docRows = Object.entries(docUrls).map(([key, info]) => ({
        doc_type:   key,
        file_url:   info.url,
        file_name:  info.path.split('/').pop(),
      }));
    }

    // 3. Prepare Payment Payload
    const paymentRow = {
      application_id: appData.applicationId,
      cet_student_id: appData.studentId,
      full_name:      appData.fullName,
      email:          email,
      course_applied: appData.courseApplied,
      payment_status: appData.paymentStatus || 'PAID_DEMO',
      payment_amount: appData.paymentAmount || 'Rs.1',
      payment_utr:    appData.paymentUtr || appData.transactionId,
      screenshot_url: docUrls['paymentScreenshot']?.url || null,
    };

    console.log('[SupaDB] Submitting application via RPC...');
    const { data: supabaseStudentId, error: rpcError } = await supabase.rpc('submit_student_application', {
      p_student_row: studentRow,
      p_doc_rows: docRows.length ? docRows : null,
      p_payment_row: paymentRow
    });

    if (rpcError || !supabaseStudentId) {
      console.error('[SupaDB] Application RPC error:', rpcError?.message || 'No UUID returned');
      return null;
    }

    // Workaround for RPC ON CONFLICT not updating status: 
    // Force reset the status so that previously deleted students can re-apply successfully
    await supabase.from('students').update({ 
      application_status: studentRow.application_status, 
      status: studentRow.status,
      exam_status: studentRow.exam_status
    }).eq('id', supabaseStudentId);

    console.log('[SupaDB] Application saved atomically via RPC:', supabaseStudentId);
    return { studentId: appData.studentId, supabaseId: supabaseStudentId };

  } catch (e) {
    console.error('[SupaDB] Unexpected error during save:', e);
    return null; 
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
