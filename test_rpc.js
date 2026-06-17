require('dotenv').config();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function testRpc() {
  const payload = {
    p_student_row: {
      student_id: "MSC-CS-2026-9998",
      full_name: "Test User 2",
      email: "test_rpc_9998@example.com",
      mobile: "9999999998",
      course_applied: "M.Sc. Computer Science",
      password_hash: "9999999998"
    },
    p_doc_rows: [{
       doc_type: "passport_photo",
       file_url: "http://example.com/photo.jpg",
       file_name: "photo.jpg"
    }],
    p_payment_row: {
      application_id: "APP-9998",
      cet_student_id: "MSC-CS-2026-9998",
      full_name: "Test User 2",
      email: "test_rpc_9998@example.com",
      course_applied: "M.Sc. Computer Science",
      payment_status: "SUCCESS"
    }
  };

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

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
testRpc();
