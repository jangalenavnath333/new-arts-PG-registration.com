const url = 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';

async function test() {
  const uuid = 'afc28edb-a095-45e5-9823-e3386abef3d8'; // from the screenshot

  console.log("Testing students update...");
  const res1 = await fetch(`${url}/rest/v1/students?id=eq.${uuid}`, {
    method: 'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ exam_date: '2026-06-11|07:57' })
  });
  console.log("Students status:", res1.status);
  console.log("Students body:", await res1.text());

  console.log("Testing exam_results delete...");
  const res2 = await fetch(`${url}/rest/v1/exam_results?student_id=eq.${uuid}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log("Exam_results status:", res2.status);
  console.log("Exam_results body:", await res2.text());
}

test();
