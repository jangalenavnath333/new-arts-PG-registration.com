require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 

async function check() { 
  try {
    const payRes = await fetch(`${supabaseUrl}/rest/v1/payments?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const payments = await payRes.json();
    
    const appRes = await fetch(`${supabaseUrl}/rest/v1/student_documents?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const apps = await appRes.json();
    
    console.log(`Total apps (student_documents): ${apps.length}`);
    console.log(`Total payments: ${payments.length}`);

    const emailCounts = {};
    payments.forEach(p => {
        if (!['PAID', 'VERIFIED', 'SUCCESS'].includes(p.payment_status)) return;
        const email = (p.email || '').toLowerCase();
        if (email) {
            emailCounts[email] = (emailCounts[email] || 0) + 1;
        }
    });

    const duplicates = Object.entries(emailCounts).filter(([e, c]) => c > 1);
    
    if (duplicates.length > 0) {
        console.log("\n--- DUPLICATE PAYMENTS FOR SAME STUDENT ---");
        duplicates.forEach(([dupEmail, count]) => {
            console.log(`\nEmail: ${dupEmail} has ${count} verified payment records.`);
            const dupPayments = payments.filter(p => p.email && p.email.toLowerCase() === dupEmail && ['PAID', 'VERIFIED', 'SUCCESS'].includes(p.payment_status));
            dupPayments.forEach(p => console.log(`   Payment ID: ${p.id}, Method: ${p.payment_method}, Amount: ${p.amount}, Date: ${p.created_at}`));
        });
    }

    const appEmails = new Set(apps.map(a => (a.email || '').toLowerCase()));
    const appStudentIds = new Set(apps.map(a => a.student_id));
    
    const roguePayments = payments.filter(p => {
        if (!['PAID', 'VERIFIED', 'SUCCESS'].includes(p.payment_status)) return false;
        const pEmail = (p.email || '').toLowerCase();
        const pCetId = p.cet_student_id || p.student_id;
        return (pEmail && !appEmails.has(pEmail)) && (!pCetId || !appStudentIds.has(pCetId));
    });

    if (roguePayments.length > 0) {
        console.log(`\n--- ROGUE PAYMENTS (No Active Application) ---`);
        console.log(`Found ${roguePayments.length} payment records that do not belong to any active student:`);
        roguePayments.forEach(p => console.log(` - Email: ${p.email}, UTR/ID: ${p.payment_utr || p.payment_id}`));
    }
  } catch (e) {
    console.error(e);
  }
} 
check();
