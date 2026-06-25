require('dotenv').config();

async function getPayments() {
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/payments?select=*';
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    
    const res = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }});
    const data = await res.json();
    
    console.log(`Total records in Supabase payments table: ${data.length}`);
    
    const manualOrTest = data.filter(p => {
        const pid = (p.payment_id || p.payment_utr || '').toLowerCase();
        const isManual = pid.includes('manual') || pid.includes('bank') || pid.includes('utr') || !pid.startsWith('pay_');
        
        // Also check if email contains test
        const isTest = (p.email || '').toLowerCase().includes('test') || (p.full_name || '').toLowerCase().includes('test');
        
        return isManual || isTest;
    });
    
    console.log(`\n--- Test or Manual Accounts (Count: ${manualOrTest.length}) ---`);
    manualOrTest.forEach((p, i) => {
        console.log(`${i+1}. Name: ${p.full_name}, Email: ${p.email}, Payment ID/UTR: ${p.payment_id || p.payment_utr}, Status: ${p.payment_status}`);
    });
    
    // Let's also check who has MISSING_APP or PENDING status
    const pendingOrMissing = data.filter(p => !['PAID', 'VERIFIED', 'SUCCESS', 'PAID_DEMO', 'REJECTED'].includes(p.payment_status));
    console.log(`\n--- Pending or Missing App Status (Count: ${pendingOrMissing.length}) ---`);
    pendingOrMissing.forEach((p, i) => {
        console.log(`${i+1}. Name: ${p.full_name}, Email: ${p.email}, Status: ${p.payment_status}`);
    });
}
getPayments().catch(console.error);
