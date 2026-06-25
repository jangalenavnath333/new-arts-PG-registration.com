require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function fetchAll(table, selectStr, filter = '') {
    let allData = [];
    let offset = 0;
    const limit = 1000;
    
    while(true) {
        let url = `${supabaseUrl}/rest/v1/${table}?select=${selectStr}&limit=${limit}&offset=${offset}`;
        if (filter) url += `&${filter}`;
        
        const res = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!res.ok) {
            console.error(`Error fetching ${table}:`, await res.text());
            break;
        }
        
        const data = await res.json();
        if(!Array.isArray(data) || data.length === 0) break;
        allData = allData.concat(data);
        offset += limit;
    }
    return allData;
}

async function run() {
    try {
        console.log("Fetching student_applications added today...");
        const students = await fetchAll('student_applications', '*');
        
        // Use 24th June 2026 local time
        const addedToday = students.filter(s => {
            const date = new Date(s.created_at || s.updated_at);
            return date.getDate() === 24 && date.getMonth() === 5 && date.getFullYear() === 2026;
        });
        
        console.log(`\n--- STUDENTS ADDED TODAY (24 June 2026) : Total ${addedToday.length} ---`);
        addedToday.forEach((s, i) => {
            console.log(`${i+1}. Name: ${s.full_name}, Phone: ${s.mobile}, Email: ${s.email}, Course: ${s.course_applied}, Time: ${new Date(s.created_at || s.updated_at).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
        });

        console.log("\nFetching missing applications from student_applications...");
        const missingApps = students.filter(s => s.status === 'MISSING' || s.payment_status === 'MISSING_APP' || !s.full_name);
        
        console.log(`\n--- MISSING APPLICATIONS (Payment Received, No Form) : Total ${missingApps.length} ---`);
        missingApps.forEach((p, i) => {
            console.log(`${i+1}. Email: ${p.email}, Phone: ${p.mobile}`);
        });

        console.log("\nFetching payments table for MISSING_APP...");
        const payments = await fetchAll('payments', '*');
        const missingPayments = payments.filter(p => p.payment_status === 'MISSING_APP');
        console.log(`\n--- MISSING PAYMENTS TABLE : Total ${missingPayments.length} ---`);
        missingPayments.forEach((p, i) => {
             console.log(`${i+1}. Email: ${p.email}, Date: ${new Date(p.payment_date || p.created_at).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}, UTR: ${p.payment_utr}`);
        });
        
    } catch(e) {
        console.error(e);
    }
}

run();
