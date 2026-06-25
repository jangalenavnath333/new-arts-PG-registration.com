const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: apps } = await supabase.from('student_applications').select('email, student_id');
  const { data: payments } = await supabase.from('payments').select('*');
  
  const emailCounts = {};
  payments.forEach(p => {
      const email = p.email ? p.email.toLowerCase() : 'unknown';
      emailCounts[email] = (emailCounts[email] || 0) + 1;
  });
  
  const duplicates = Object.entries(emailCounts).filter(([e, c]) => c > 1);
  console.log("Duplicate payments by email:", duplicates);
  
  if (duplicates.length > 0) {
      const dupEmail = duplicates[0][0];
      const dupPayments = payments.filter(p => p.email && p.email.toLowerCase() === dupEmail);
      console.log("\nDetails of duplicate payments:");
      dupPayments.forEach(p => console.log(`ID: ${p.id}, Method: ${p.payment_method}, Status: ${p.payment_status}, UTR: ${p.payment_utr}, Razorpay ID: ${p.payment_id}`));
  }
}
check();
