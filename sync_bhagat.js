require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';

async function syncBhagat() {
  const fs = require('fs');
  const d = require('./offline_data.json');
  const students = d.students || d;
  const student = students.find(x => x.email === 'bhagatajay359@gmail.com');

  if (!student) {
    console.log("Student not found in offline_data.json");
    return;
  }

  const studentRow = {
    student_id:         student.student_id || student.studentId,
    full_name:          student.full_name || student.fullName,
    email:              student.email.toLowerCase(),
    mobile:             student.mobile || student.phone,
    dob:                student.dob,
    address:            student.address,
    category:           student.category,
    status:             student.status || 'APPROVED',
    application_status: student.application_status || 'APPROVED',
    exam_status:        student.exam_status || 'NOT_SCHEDULED',
    payment_status:     student.payment_status || 'Payment Done',
    payment_utr:        student.payment_utr || student.transaction_id,
    payment_amount:     student.payment_amount || 'Rs.500',
    transaction_id:     student.transaction_id || student.payment_utr,
    course_applied:     student.course_applied || student.courseApplied,
    stream:             student.stream,
    academic_details:   student.academic_details || student.academicDetails,
    password_hash:      student.password_hash || student.mobile || student.phone
  };

  const paymentRow = {
    application_id: student.applicationId || 'APP-' + Date.now(),
    cet_student_id: studentRow.student_id,
    full_name:      studentRow.full_name,
    email:          studentRow.email,
    course_applied: studentRow.course_applied,
    payment_status: 'SUCCESS',
    payment_amount: 'Rs.500',
    payment_utr:    studentRow.payment_utr
  };

  const payload = {
    p_student_row: studentRow,
    p_doc_rows: null,
    p_payment_row: paymentRow
  };

  console.log("Syncing student to Supabase...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_student_application`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const body = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", body);
  
  // Workaround for RPC ON CONFLICT not updating status
  if (res.status === 200) {
      const studentIdStr = body.replace(/['"]/g, ''); // Extract UUID
      console.log("UUID returned:", studentIdStr);
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentIdStr}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              application_status: studentRow.application_status,
              status: studentRow.status,
              exam_status: studentRow.exam_status
          })
      });
      console.log("Update status:", updateRes.status);
  }
}

syncBhagat();
