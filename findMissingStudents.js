require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});

async function run() {
  console.log("Fetching payments from Razorpay...");
  
  const paymentsResponse = await razorpay.payments.all({ count: 100, skip: 0 });
  const successfulPayments = paymentsResponse.items.filter(p => p.status === 'captured');
  console.log(`Found ${successfulPayments.length} successful payments in Razorpay.`);

  console.log("Fetching active students from Supabase...");
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
  const res = await fetch(`${supabaseUrl}/rest/v1/students?select=email,mobile,status`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (!res.ok) {
    console.error("Supabase API error:", await res.text());
    return;
  }
  
  const allStudents = await res.json();
  const students = allStudents.filter(s => s.status !== 'deleted');
  console.log(`Found ${students.length} active students in Supabase.`);
  
  const activeEmails = new Set(students.map(s => (s.email || '').toLowerCase()));
  const activePhones = new Set(students.map(s => s.mobile || ''));
  
  console.log("\n===========================================");
  console.log("MISSING STUDENTS (Paid in Razorpay but not in Supabase)");
  console.log("===========================================\n");
  
  let missingCount = 0;
  
  for (const p of successfulPayments) {
     const email = (p.email || '').toLowerCase();
     const contact = (p.contact || '').replace('+91', '');
     
     let found = false;
     if (email && activeEmails.has(email)) found = true;
     if (contact && activePhones.has(contact)) found = true;
     
     if (!found) {
        missingCount++;
        console.log(`⚠️ Missing Student #${missingCount}`);
        console.log(`   - Payment ID: ${p.id}`);
        console.log(`   - Email:      ${p.email}`);
        console.log(`   - Phone:      ${p.contact}`);
        console.log(`   - Amount:     ₹${p.amount / 100}`);
        console.log(`   - Date:       ${new Date(p.created_at * 1000).toLocaleString('en-IN')}`);
        console.log("-------------------------------------------");
     }
  }
  
  if (missingCount === 0) {
     console.log("✅ All paid students are present in Supabase!");
  } else {
     console.log(`Total missing students found: ${missingCount}`);
  }
}

run().catch(console.error);
