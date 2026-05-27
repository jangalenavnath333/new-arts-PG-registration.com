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
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, full_name, email, status, application_status, exam_status, has_attempted, active_violations, course_applied, category')
      .or(`student_id.eq.${studentId},email.eq.${email}`)
      .limit(1)
      .single();
    if (error) { console.warn('[ExamSupa] Eligibility check error:', error.message); return null; }
    console.log('[ExamSupa] ✅ Eligibility check:', data.status, data.exam_status);
    return data;
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
// 3. EXAM ATTEMPT: Create/update attempt record
// Returns attempt UUID or null
// =============================================
let _attemptId = null;

export async function startExamAttempt(supabaseStudentUUID, cetStudentId, totalQuestions) {
  if (!supabase || !supabaseStudentUUID) return null;
  try {
    // Upsert: if student already has an attempt row (resume), update it
    const { data, error } = await supabase
      .from('exam_attempts')
      .upsert({
        student_id: supabaseStudentUUID,
        cet_student_id: cetStudentId,
        started_at: new Date().toISOString(),
        total_questions: totalQuestions,
        answers: {},
        violations: 0,
      }, { onConflict: 'student_id' })
      .select('id')
      .single();
    if (error) { console.warn('[ExamSupa] Start attempt error:', error.message); return null; }
    _attemptId = data.id;
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
    const { error } = await supabase
      .from('exam_attempts')
      .update({
        answers: _pendingAnswers.answers,
        time_left_secs: _pendingAnswers.time_left_secs,
        violations: _pendingAnswers.violations,
      })
      .eq('id', _attemptId);
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
    await supabase
      .from('exam_attempts')
      .update({
        answers: answersStore,
        time_left_secs: timeLeft,
        violations: violations,
      })
      .eq('id', _attemptId);
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
    // 1. Update attempt as submitted
    if (_attemptId) {
      await supabase
        .from('exam_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          score: resultData.score,
          violations: resultData.violations,
          submit_status: resultData.submitStatus,
          is_auto_submit: resultData.isAuto,
          answers: resultData.answers,
          time_left_secs: 0,
        })
        .eq('id', _attemptId);
    }

    // 2. Insert exam result
    const { data, error } = await supabase
      .from('exam_results')
      .insert({
        student_id: supabaseStudentUUID,
        attempt_id: _attemptId,
        cet_student_id: cetStudentId,
        student_name: resultData.name,
        score: resultData.score,
        total: resultData.total,
        correct_answers: resultData.correctAnswers,
        wrong_answers: resultData.wrongAnswers,
        unanswered: resultData.unanswered,
        violations: resultData.violations,
        time_used_secs: resultData.timeUsed,
        course: resultData.course,
        category: resultData.category,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) { console.warn('[ExamSupa] Result insert error:', error.message); return null; }

    // 3. Update student status
    await supabase
      .from('students')
      .update({
        has_attempted: true,
        exam_status: resultData.submitStatus.includes('Terminated') ? 'TERMINATED' : 'COMPLETED',
      })
      .eq('id', supabaseStudentUUID);

    console.log('[ExamSupa] ✅ Exam result submitted to cloud:', data.id);
    return data.id;
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
    // Update student status
    await supabase
      .from('students')
      .update({ exam_status: 'LOCKED', active_violations: warningCount })
      .eq('id', supabaseStudentUUID);

    // Upsert locked_exams record
    await supabase
      .from('locked_exams')
      .upsert({
        student_id: supabaseStudentUUID,
        cet_student_id: cetStudentId,
        student_name: studentName,
        course: course,
        warning_count: warningCount,
        reason: reason,
        locked_at: new Date().toISOString(),
      }, { onConflict: 'cet_student_id' });

    // Save remaining time in attempt
    if (_attemptId) {
      await supabase
        .from('exam_attempts')
        .update({ submit_status: 'LOCKED' })
        .eq('id', _attemptId);
    }

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
    const { data, error } = await supabase
      .from('students')
      .select('exam_status')
      .eq('id', supabaseStudentUUID)
      .single();
    if (error) return null;
    return data?.exam_status || null;
  } catch (e) {
    return null;
  }
}

export default {
  isReady, getClient, checkEligibility, fetchActiveQuestionSet,
  startExamAttempt, scheduleAutosave, forceAutosave, submitExamResult,
  logSecurityToSupabase, lockExamInSupabase, pollExamStatus,
};
