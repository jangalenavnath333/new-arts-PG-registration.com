require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function tryDelete() {
    console.log("Attempting to delete test users...");
    
    const testEmails = [
        'payaltest@gmail.com',
        'test_rpc_9999@example.com',
        'test_rpc_9998@example.com',
        'adityadhotre1515@gmail.com',
        'vipulzirape@gmail.com',
        'jangalenavnath333@gmail.com'
    ];
    
    // We can't use supabase-js easily without installing it, so we'll use raw fetch
    const url = `${SUPABASE_URL}/rest/v1/students?email=in.(${testEmails.join(',')})`;
    
    const res = await fetch(url, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
        }
    });
    
    if (!res.ok) {
        console.error("Delete failed:", await res.text());
    } else {
        const deleted = await res.json();
        console.log(`Deleted ${deleted.length} records from students table.`);
    }
}

tryDelete();
