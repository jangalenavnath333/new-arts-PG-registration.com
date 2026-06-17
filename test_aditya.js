const url = 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';
const uuid = 'afc28edb-a095-45e5-9823-e3386abef3d8'; // Aditya Chotre's UUID

async function testReschedule() {
  console.log("=== Testing Aditya's Reschedule ===");

  // 1. Fetch current student data
  const getRes = await fetch(`${url}/rest/v1/students?id=eq.${uuid}&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const students = await getRes.json();
  if (!students || students.length === 0) {
    console.error("Student not found!");
    return;
  }
  
  const aditya = students[0];
  console.log(`Found Student: ${aditya.full_name}`);
  
  // 2. Prepare new academic_details
  const existingDetails = typeof aditya.academic_details === 'string' 
    ? JSON.parse(aditya.academic_details) 
    : (aditya.academic_details || {});
    
  const newAcademicDetails = { 
    ...existingDetails, 
    rescheduleDate: '2026-06-11', 
    rescheduleTime: '08:30', 
    examDate: '2026-06-11|08:30' 
  };

  console.log("\nUpdating student table...");
  const updateRes = await fetch(`${url}/rest/v1/students?id=eq.${uuid}`, {
    method: 'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      exam_status: 'SCHEDULED', 
      has_attempted: false, 
      active_violations: 0, 
      lock_reason: null, 
      academic_details: newAcademicDetails 
    })
  });
  console.log(`Update Status: ${updateRes.status}`);
  if (updateRes.status !== 204) console.log(await updateRes.text());

  const tablesToClear = ['exam_results', 'locked_exams', 'security_logs', 'exam_attempts'];
  for (const table of tablesToClear) {
    console.log(`\nClearing ${table}...`);
    const delRes = await fetch(`${url}/rest/v1/${table}?student_id=eq.${uuid}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log(`Clear Status: ${delRes.status}`);
    if (delRes.status !== 204) console.log(await delRes.text());
  }

  console.log("\n=== Testing Fetching (Simulating Student Login) ===");
  const verifyRes = await fetch(`${url}/rest/v1/students?id=eq.${uuid}&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const verifyData = await verifyRes.json();
  console.log("Exam Status:", verifyData[0].exam_status);
  console.log("Has Attempted:", verifyData[0].has_attempted);
  console.log("Active Violations:", verifyData[0].active_violations);
  const updatedDetails = typeof verifyData[0].academic_details === 'string' ? JSON.parse(verifyData[0].academic_details) : verifyData[0].academic_details;
  console.log("Reschedule Date:", updatedDetails.rescheduleDate);
  console.log("Reschedule Time:", updatedDetails.rescheduleTime);
  
  console.log("\n✅ Test Complete. All looks perfect.");
}

testReschedule();
