require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';

async function fetchTodayStudents() {
    console.log("Fetching students added today from Supabase...");
    
    // We can query the 'payments' table or 'student_applications' table since students might be restricted.
    // Let's query 'payments' where submitted_at >= '2026-06-24T00:00:00.000Z'
    // Or we can query the 'offline_data.json' to see if any local ones were added today.
    
    let url = `${SUPABASE_URL}/rest/v1/payments?select=*&created_at=gte.2026-06-24T00:00:00Z`;
    
    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    
    if (!res.ok) {
        console.error(`Error fetching:`, await res.text());
        return;
    }
    
    const data = await res.json();
    console.log(`Found ${data.length} records added today.`);
    
    if(data.length > 0) {
        data.forEach(d => {
            console.log(`Name: ${d.full_name}, Email: ${d.email}, Date: ${d.created_at}`);
        });
    }
}

fetchTodayStudents();
