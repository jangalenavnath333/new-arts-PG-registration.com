const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from dist directory (built UI)
app.use(express.static(path.join(__dirname, 'dist')));

// Ensure data file exists
const DB_FILE = path.join(__dirname, 'offline_data.json');
if (!fs.existsSync(DB_FILE)) {
  console.error("❌ offline_data.json not found! Run 'node download-offline-data.js' first.");
  process.exit(1);
}

function loadDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// ============================================
// MOCK SUPABASE REST API
// ============================================

// 0. Student Login (RPC)
app.post('/rest/v1/rpc/student_login', (req, res) => {
  const { p_email } = req.body;
  console.log(`[student_login] Received login attempt for: ${p_email}`);
  const db = loadDB();
  const input = (p_email || '').toLowerCase();
  const student = db.students.find(s => (s.email || '').toLowerCase() === input || (s.student_id || '').toLowerCase() === input);
  if (student) {
    res.json([{
      id: student.id, student_id: student.student_id, full_name: student.full_name,
      email: student.email, mobile: student.mobile || '1234', password_hash: student.password_hash || '1234',
      status: student.status, application_status: student.application_status,
      exam_status: student.exam_status, has_attempted: student.has_attempted,
      course_applied: student.course_applied, exam_date: student.exam_date
    }]);
  } else {
    res.json([]);
  }
});

// 1. Check Eligibility (RPC)
app.post('/rest/v1/rpc/check_eligibility', (req, res) => {
  const { p_identifier } = req.body;
  const db = loadDB();
  const student = db.students.find(s => s.email === p_identifier || s.student_id === p_identifier);
  if (student) {
    res.json([{
      id: student.id, student_id: student.student_id, full_name: student.full_name,
      email: student.email, status: student.status, application_status: student.application_status,
      exam_status: student.exam_status, has_attempted: student.has_attempted,
      active_violations: student.active_violations || 0, course_applied: student.course_applied,
      category: student.category
    }]);
  } else {
    res.json([]);
  }
});

// 2. Start Exam Attempt (RPC)
app.post('/rest/v1/rpc/start_exam_attempt', (req, res) => {
  const { p_student_uuid, p_cet_student_id, p_total_questions } = req.body;
  const db = loadDB();
  const attemptId = 'attempt_' + Date.now();
  db.exam_attempts.push({
    id: attemptId, student_id: p_student_uuid, cet_student_id: p_cet_student_id,
    started_at: new Date().toISOString(), total_questions: p_total_questions, answers: {}, violations: 0
  });
  saveDB(db);
  res.json(attemptId);
});

// 3. Save Exam Progress (RPC)
app.post('/rest/v1/rpc/save_exam_progress', (req, res) => {
  const { p_attempt_id, p_answers, p_time_left, p_violations } = req.body;
  const db = loadDB();
  const attempt = db.exam_attempts.find(a => a.id === p_attempt_id);
  if (attempt) {
    attempt.answers = p_answers;
    attempt.time_left_secs = p_time_left;
    attempt.violations = p_violations;
    saveDB(db);
  }
  res.json(null);
});

// 4. Submit Final Exam (RPC)
app.post('/rest/v1/rpc/submit_final_exam', (req, res) => {
  const payload = req.body;
  const db = loadDB();
  
  const resultId = 'result_' + Date.now();
  db.exam_results.push({
    id: resultId,
    student_id: payload.p_student_uuid, attempt_id: payload.p_attempt_id,
    cet_student_id: payload.p_cet_student_id, student_name: payload.p_name,
    score: payload.p_score, total: payload.p_total, correct_answers: payload.p_correct,
    wrong_answers: payload.p_wrong, unanswered: payload.p_unanswered,
    violations: payload.p_violations, time_used_secs: payload.p_time_used,
    course: payload.p_course, category: payload.p_category,
    submitted_at: new Date().toISOString(), answers: payload.p_answers
  });
  
  const student = db.students.find(s => s.id === payload.p_student_uuid);
  if (student) {
    student.has_attempted = true;
    student.exam_status = payload.p_submit_status.includes('Terminated') ? 'TERMINATED' : 'COMPLETED';
  }
  
  saveDB(db);
  res.json(resultId);
});

// 5. Get Exam Status (RPC)
app.post('/rest/v1/rpc/get_exam_status', (req, res) => {
  const { p_student_uuid } = req.body;
  const db = loadDB();
  const student = db.students.find(s => s.id === p_student_uuid);
  res.json(student ? student.exam_status : null);
});

// 6. Security Logs
app.post('/rest/v1/security_logs', (req, res) => {
  const db = loadDB();
  db.security_logs.push({ ...req.body, created_at: new Date().toISOString() });
  saveDB(db);
  res.json(null);
});

// Helper to filter results based on PostgREST eq query params
function applyPostgrestFilters(data, query) {
  let result = [...data];
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' && value.startsWith('eq.')) {
      const matchVal = value.substring(3);
      result = result.filter(item => String(item[key]) === matchVal);
    }
  }
  return result;
}

// 7. Exam Configs
app.get('/rest/v1/exam_config', (req, res) => {
  const db = loadDB();
  let result = db.exam_config.filter(c => c.is_active);
  result = applyPostgrestFilters(result, req.query);
  console.log('[exam_config] ACCEPT:', req.headers.accept);
  
  if (req.headers.accept && req.headers.accept.includes('application/vnd.pgrst.object')) {
    if (result.length === 0) return res.status(406).json({ message: "No rows found" });
    return res.json(result[0]);
  }
  res.json(result);
});

// 8. Question Sets
app.get('/rest/v1/question_sets', (req, res) => {
  const db = loadDB();
  let result = db.question_sets.filter(q => q.is_active);
  result = applyPostgrestFilters(result, req.query);
  console.log('[question_sets] ACCEPT:', req.headers.accept);
  
  if (req.headers.accept && req.headers.accept.includes('application/vnd.pgrst.object')) {
    if (result.length === 0) return res.status(406).json({ message: "No rows found" });
    return res.json(result[0]);
  }
  res.json(result);
});

// 9. Redirect root to offline mode
app.get('/', (req, res) => {
  res.redirect('/student/login.html?offline=true');
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`✅ OFFLINE EXAM SERVER IS RUNNING`);
  console.log(`========================================`);
  console.log(`\nTo take the exam from this PC, open:\n👉 http://localhost:${PORT}`);
  
  // Find local IP
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`\nTo take the exam from OTHER PCs (over LAN), open:\n👉 http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`\nMake sure to append "?offline=true" if it doesn't automatically redirect!\n`);
});
