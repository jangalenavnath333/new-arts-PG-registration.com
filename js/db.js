// ============================================
// CET EXAM ONLINE - DATA STORE (localStorage)
// ============================================

const DB = {
  // Keys
  KEYS: {
    STUDENTS: 'cet_students',
    QUESTIONS: 'cet_questions',
    EXAM_SCHEDULE: 'cet_exam_schedule',
    RESULTS: 'cet_results',
    CURRENT_STUDENT: 'cet_current_student',
    ADMIN_SESSION: 'cet_admin_session',
  },

  // ---- Helpers ----
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ---- Students ----
  getStudents() { return this.get(this.KEYS.STUDENTS) || []; },
  saveStudents(students) { this.set(this.KEYS.STUDENTS, students); },
  addStudent(student) {
    const students = this.getStudents();
    student.id = 'STU' + Date.now();
    student.studentId = null;
    student.status = 'pending';
    student.appliedAt = new Date().toISOString();
    student.hasAttempted = false;
    student.password = student.mobile; // default password = mobile
    students.push(student);
    this.saveStudents(students);
    return student;
  },
  getStudentById(id) { return this.getStudents().find(s => s.id === id); },
  getStudentByEmail(email) { return this.getStudents().find(s => s.email === email); },
  updateStudent(id, updates) {
    const students = this.getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx !== -1) {
      students[idx] = { ...students[idx], ...updates };
      this.saveStudents(students);
      return students[idx];
    }
    return null;
  },
  approveStudent(id) {
    const studentId = 'CET' + new Date().getFullYear() + String(Math.floor(Math.random()*9000+1000));
    return this.updateStudent(id, { status: 'approved', studentId });
  },
  rejectStudent(id, reason) {
    return this.updateStudent(id, { status: 'rejected', rejectionReason: reason });
  },

  // ---- Questions ----
  getQuestions() { return this.get(this.KEYS.QUESTIONS) || getDefaultQuestions(); },
  saveQuestions(questions) { this.set(this.KEYS.QUESTIONS, questions); },
  addQuestion(q) {
    const questions = this.getQuestions();
    q.id = 'Q' + Date.now();
    questions.push(q);
    this.saveQuestions(questions);
    return q;
  },
  deleteQuestion(id) {
    const questions = this.getQuestions().filter(q => q.id !== id);
    this.saveQuestions(questions);
  },
  updateQuestion(id, updates) {
    const questions = this.getQuestions();
    const idx = questions.findIndex(q => q.id === id);
    if (idx !== -1) { questions[idx] = { ...questions[idx], ...updates }; this.saveQuestions(questions); }
  },

  // ---- Exam Schedule ----
  getSchedule() {
    return this.get(this.KEYS.EXAM_SCHEDULE) || {
      date: '', time: '', duration: 60,
      instructions: [
        'Ensure stable internet connection',
        'Use Chrome or Firefox browser',
        'Webcam is mandatory throughout the exam',
        'No books or notes allowed',
        'Keep your National ID ready for verification'
      ],
      rules: [
        'Do not switch tabs or windows during exam',
        'Fullscreen mode is mandatory',
        'No mobile phones allowed',
        'No copying or pasting',
        'One attempt only - exam cannot be retaken',
        'Auto-submit after 3 violations'
      ],
      isActive: false,
    };
  },
  saveSchedule(schedule) { this.set(this.KEYS.EXAM_SCHEDULE, schedule); },

  // ---- Results ----
  getResults() { return this.get(this.KEYS.RESULTS) || []; },
  saveResult(result) {
    const results = this.getResults();
    result.id = 'RES' + Date.now();
    result.submittedAt = new Date().toISOString();
    results.push(result);
    this.set(this.KEYS.RESULTS, results);
    // Mark student as attempted
    this.updateStudent(result.studentId, { hasAttempted: true, resultId: result.id });
    return result;
  },
  getResultByStudentId(studentId) {
    return this.getResults().find(r => r.studentId === studentId);
  },

  // ---- Session ----
  getCurrentStudent() { return this.get(this.KEYS.CURRENT_STUDENT); },
  setCurrentStudent(student) { this.set(this.KEYS.CURRENT_STUDENT, student); },
  clearCurrentStudent() { localStorage.removeItem(this.KEYS.CURRENT_STUDENT); },

  isAdminLoggedIn() { return this.get(this.KEYS.ADMIN_SESSION) === true; },
  setAdminLogin(val) { this.set(this.KEYS.ADMIN_SESSION, val); },
};

// ---- Default Questions Bank ----
function getDefaultQuestions() {
  return [
    { id: 'Q1', subject: 'Logical Reasoning', text: 'If A > B, B > C, and C > D, which is the largest?', options: ['B','C','A','D'], correct: 2 },
    { id: 'Q2', subject: 'Mathematics', text: 'What is 15% of 200?', options: ['20','25','30','35'], correct: 2 },
    { id: 'Q3', subject: 'Computer Science', text: 'Which data structure uses LIFO (Last In, First Out) order?', options: ['Queue','Stack','Array','Linked List'], correct: 1 },
    { id: 'Q4', subject: 'English', text: 'Choose the correct spelling:', options: ['Accomodate','Accommodate','Acommodate','Accommodat'], correct: 1 },
    { id: 'Q5', subject: 'Logical Reasoning', text: 'If 5 cats can catch 5 mice in 5 minutes, how many cats are needed to catch 100 mice in 100 minutes?', options: ['5','10','20','100'], correct: 0 },
    { id: 'Q6', subject: 'Mathematics', text: 'What is the value of √144?', options: ['11','12','13','14'], correct: 1 },
    { id: 'Q7', subject: 'Computer Science', text: 'What does HTML stand for?', options: ['HyperText Markup Language','HighText Markup Language','HyperText Machine Language','HyperTool Markup Language'], correct: 0 },
    { id: 'Q8', subject: 'General Knowledge', text: 'Which planet is known as the Red Planet?', options: ['Venus','Jupiter','Mars','Saturn'], correct: 2 },
    { id: 'Q9', subject: 'Mathematics', text: 'What is the next number in the sequence: 2, 6, 12, 20, 30, __?', options: ['40','42','44','46'], correct: 1 },
    { id: 'Q10', subject: 'Logical Reasoning', text: 'A train travels 60 km in 45 minutes. What is its speed in km/h?', options: ['70','75','80','90'], correct: 2 },
    { id: 'Q11', subject: 'Computer Science', text: 'Which of the following is NOT a programming language?', options: ['Java','Python','HTML','C++'], correct: 2 },
    { id: 'Q12', subject: 'English', text: 'The synonym of "Eloquent" is:', options: ['Mute','Articulate','Confused','Silent'], correct: 1 },
    { id: 'Q13', subject: 'General Knowledge', text: 'Who is known as the father of computers?', options: ['Bill Gates','Steve Jobs','Charles Babbage','Alan Turing'], correct: 2 },
    { id: 'Q14', subject: 'Mathematics', text: 'If x + 5 = 12, what is x?', options: ['6','7','8','9'], correct: 1 },
    { id: 'Q15', subject: 'Logical Reasoning', text: 'Complete the pattern: 1, 1, 2, 3, 5, 8, 13, __?', options: ['18','20','21','24'], correct: 2 },
  ];
}

// ---- Export ----
window.DB = DB;
window.getDefaultQuestions = getDefaultQuestions;
export default DB;
