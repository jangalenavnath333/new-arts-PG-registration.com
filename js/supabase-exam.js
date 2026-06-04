// ============================================
// CET EXAM ENGINE - SUPABASE LAYER (Phase 4)
// Dual-write for exam: eligibility, questions,
// autosave, submit, security, lock/unlock
// All functions are fail-safe — localStorage always works
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[ExamSupa] ✅ Supabase client initialized for exam engine');
  } catch (e) {
    console.warn('[ExamSupa] Failed to init:', e.message);
  }
}

export function isReady() { return supabase !== null; }
export function getClient() { return supabase; }

// =============================================
// 1. ELIGIBILITY: Check student status from Supabase
// Returns student object or null
// =============================================
export async function checkEligibility(studentId, email) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('check_eligibility', { p_identifier: email || studentId });
    if (error) { console.warn('[ExamSupa] Eligibility check error:', error.message); return null; }
    if (!data || data.length === 0) return null;
    console.log('[ExamSupa] ✅ Eligibility check:', data[0].status, data[0].exam_status);
    return data[0];
  } catch (e) {
    console.warn('[ExamSupa] Eligibility fetch error:', e);
    return null;
  }
}

// =============================================
// 2. ACTIVE QUESTION SET: Fetch from Supabase
// Returns { questions: [...], setId, setName } or null
// =============================================
export async function fetchActiveQuestionSet() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('question_sets')
      .select('id, name, questions, is_active')
      .eq('is_active', true)
      .limit(1)
      .single();
    if (error) { console.warn('[ExamSupa] Question set fetch error:', error.message); return null; }
    if (!data || !data.questions || data.questions.length === 0) return null;
    console.log('[ExamSupa] ✅ Loaded question set:', data.name, '—', data.questions.length, 'questions');
    return { questions: data.questions, setId: data.id, setName: data.name };
  } catch (e) {
    console.warn('[ExamSupa] Question set fetch error:', e);
    return null;
  }
}

// =============================================
// 2b. EXAM CONFIG: Fetch from Supabase
// =============================================
export async function fetchExamConfig(course = null) {
  if (!supabase) return null;
  try {
    let query = supabase
      .from('exam_config')
      .select('*')
      .eq('is_active', true);
      
    if (course) {
      // First try to find a specific course config, if not fallback to the first active one
      const { data, error } = await query.eq('course', course).limit(1).single();
      if (!error && data) {
         console.log(`[ExamSupa] ✅ Loaded exam config for ${course} from cloud`);
         return {
           examDate: data.exam_date,
           startTime: data.start_time,
           durationMinutes: data.duration_minutes,
           isActive: data.is_active,
           instructions: data.instructions,
           rules: data.rules,
           course: data.course
         };
      }
    }
    
    // Fallback if course not provided or not found
    const { data: fbData, error: fbError } = await supabase.from('exam_config').select('*').eq('is_active', true).limit(1).single();
    if (fbError) { console.warn('[ExamSupa] Exam config fetch error:', fbError.message); return null; }
    console.log('[ExamSupa] ✅ Loaded global exam config from cloud');
    return {
      examDate: fbData.exam_date,
      startTime: fbData.start_time,
      durationMinutes: fbData.duration_minutes,
      isActive: fbData.is_active,
      instructions: fbData.instructions,
      rules: fbData.rules,
      course: fbData.course
    };
  } catch (e) {
    console.warn('[ExamSupa] Exam config fetch error:', e);
    return null;
  }
}

export function getExamStatus(examDate, startTime, durationMinutes) {
   if (!examDate || !startTime) return 'NOT_STARTED';
   
   // Parse safely for Mobile Safari which fails on standard Date parsing without seconds
   let start;
   try {
      const parts = examDate.split('-');
      const timeParts = startTime.split(':');
      if (parts.length === 3 && timeParts.length >= 2) {
         start = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
      } else {
         start = new Date(`${examDate}T${startTime}`);
      }
   } catch(e) {
      start = new Date(`${examDate}T${startTime}`);
   }
   
   const preStart = new Date(start.getTime() - (60 * 60000)); // Allow 60 mins early access
   const end = new Date(start.getTime() + (durationMinutes * 60000));
   const now = new Date();
   
   if (now < preStart) return 'NOT_STARTED';
   if (now > end) return 'ENDED';
   return 'LIVE';
}

// =============================================
// 3. EXAM ATTEMPT: Create/update attempt record
// Returns attempt UUID or null
// =============================================
let _attemptId = null;

export async function startExamAttempt(supabaseStudentUUID, cetStudentId, totalQuestions) {
  if (!supabase || !supabaseStudentUUID) return null;
  try {
    const { data, error } = await supabase.rpc('start_exam_attempt', {
      p_student_uuid: supabaseStudentUUID,
      p_cet_student_id: cetStudentId,
      p_total_questions: totalQuestions
    });
    if (error || !data) { console.warn('[ExamSupa] Start attempt error:', error?.message); return null; }
    _attemptId = data;
    console.log('[ExamSupa] ✅ Exam attempt started/resumed:', _attemptId);
    return _attemptId;
  } catch (e) {
    console.warn('[ExamSupa] Start attempt error:', e);
    return null;
  }
}

// =============================================
// 4. AUTOSAVE: Periodically save answers to Supabase
// Called after each answer selection + on a 30s interval
// =============================================
let _autosaveTimer = null;
let _pendingAnswers = null;

export function scheduleAutosave(answersStore, timeLeft, violations) {
  _pendingAnswers = { answers: answersStore, time_left_secs: timeLeft, violations };
  // Debounce: don't save more than once per 5 seconds
  if (_autosaveTimer) return;
  _autosaveTimer = setTimeout(() => {
    _autosaveTimer = null;
    flushAutosave();
  }, 5000);
}

async function flushAutosave() {
  if (!supabase || !_attemptId || !_pendingAnswers) return;
  try {
    const { error } = await supabase.rpc('save_exam_progress', {
      p_attempt_id: _attemptId,
      p_answers: _pendingAnswers.answers,
      p_time_left: _pendingAnswers.time_left_secs,
      p_violations: _pendingAnswers.violations
    });
    if (error) console.warn('[ExamSupa] Autosave error:', error.message);
    else console.log('[ExamSupa] ☁️ Answers autosaved to cloud');
  } catch (e) {
    console.warn('[ExamSupa] Autosave error:', e);
  }
}

// Force immediate save (used before submit)
export async function forceAutosave(answersStore, timeLeft, violations) {
  if (!supabase || !_attemptId) return;
  try {
    await supabase.rpc('save_exam_progress', {
      p_attempt_id: _attemptId,
      p_answers: answersStore,
      p_time_left: timeLeft,
      p_violations: violations
    });
    console.log('[ExamSupa] ☁️ Force-saved answers before submit');
  } catch (e) {
    console.warn('[ExamSupa] Force autosave error:', e);
  }
}

// =============================================
// 5. FINAL SUBMIT: Save exam result to Supabase
// =============================================
export async function submitExamResult(supabaseStudentUUID, cetStudentId, resultData) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('submit_final_exam', {
      p_student_uuid: supabaseStudentUUID,
      p_attempt_id: _attemptId,
      p_cet_student_id: cetStudentId,
      p_name: resultData.name,
      p_score: resultData.score,
      p_total: resultData.total,
      p_correct: resultData.correctAnswers,
      p_wrong: resultData.wrongAnswers,
      p_unanswered: resultData.unanswered,
      p_violations: resultData.violations,
      p_time_used: resultData.timeUsed,
      p_course: resultData.course,
      p_category: resultData.category,
      p_submit_status: resultData.submitStatus,
      p_is_auto: resultData.isAuto,
      p_answers: resultData.answers
    });

    if (error || !data) { console.warn('[ExamSupa] Result insert error:', error?.message); return null; }

    console.log('[ExamSupa] ✅ Exam result submitted to cloud:', data);
    return data;
  } catch (e) {
    console.warn('[ExamSupa] Submit result error:', e);
    return null;
  }
}

// =============================================
// 6. SECURITY LOGS: Save violations to Supabase
// =============================================
export async function logSecurityToSupabase(supabaseStudentUUID, cetStudentId, studentName, eventType, message) {
  if (!supabase) return;
  try {
    await supabase
      .from('security_logs')
      .insert({
        student_id: supabaseStudentUUID,
        cet_student_id: cetStudentId,
        student_name: studentName,
        event_type: eventType,
        message: message,
      });
    console.log('[ExamSupa] 🔒 Security event logged:', eventType);
  } catch (e) {
    console.warn('[ExamSupa] Security log error:', e);
  }
}

// =============================================
// 7. LOCK EXAM: Save to locked_exams table
// =============================================
export async function lockExamInSupabase(supabaseStudentUUID, cetStudentId, studentName, course, warningCount, reason) {
  if (!supabase) return;
  try {
    await supabase.rpc('lock_exam_procedure', {
      p_student_uuid: supabaseStudentUUID,
      p_cet_student_id: cetStudentId,
      p_name: studentName,
      p_course: course,
      p_warnings: warningCount,
      p_reason: reason,
      p_attempt_id: _attemptId
    });
    console.log('[ExamSupa] 🔒 Exam locked in cloud for:', cetStudentId);
  } catch (e) {
    console.warn('[ExamSupa] Lock exam error:', e);
  }
}

// =============================================
// 8. POLL UNLOCK: Check if admin unlocked/terminated
// Returns 'LOCKED' | 'ACTIVE' | 'TERMINATED' | null
// =============================================
export async function pollExamStatus(supabaseStudentUUID) {
  if (!supabase || !supabaseStudentUUID) return null;
  try {
    const { data, error } = await supabase.rpc('get_exam_status', { p_student_uuid: supabaseStudentUUID });
    if (error) return null;
    return data || null;
  } catch (e) {
    return null;
  }
}

export default {
  isReady, getClient, checkEligibility, fetchActiveQuestionSet, fetchExamConfig, getExamStatus,
  startExamAttempt, scheduleAutosave, forceAutosave, submitExamResult,
  logSecurityToSupabase, lockExamInSupabase, pollExamStatus,
};
