const paymentsUrl = 'https://zyzigmlqzzqxhhwplkdf.supabase.co/rest/v1/payments?select=*';
const appsUrl = 'https://zyzigmlqzzqxhhwplkdf.supabase.co/rest/v1/student_documents?select=email,student_id,full_name,status';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';

async function check() {
  const payRes = await fetch(paymentsUrl, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }});
  const payments = await payRes.json();
  // console.log("Payments API response:", payments.slice(0,2));

  const appRes = await fetch(appsUrl, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }});
  const apps = await appRes.json();
  
  const appEmails = new Set(apps.map(a => a.email ? a.email.toLowerCase() : ''));
  const appStudentIds = new Set(apps.map(a => a.student_id));
  
  console.log(`Total active applications (documents): ${apps.length}`);
  
  const roguePayments = payments.filter(p => {
      const pEmail = p.email ? p.email.toLowerCase() : '';
      const pCetId = p.cet_student_id || p.student_id;
      
      return !appEmails.has(pEmail) && !appStudentIds.has(pCetId);
  });
  
  console.log(`\nPayments found that do not match any active student document: ${roguePayments.length}`);
  if (roguePayments.length > 0) {
      roguePayments.forEach(p => console.log(`Email: ${p.email}, ID: ${p.cet_student_id || p.student_id}`));
  }
}
check();
