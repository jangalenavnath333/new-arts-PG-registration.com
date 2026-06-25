const fs = require('fs');
const xlsx = require('xlsx');

const supabaseUrl = 'https://zyzigmlqzzqxhhwplkdf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emlnbWxxenpxeGhod3Bsa2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODE2MjMsImV4cCI6MjA5NTM1NzYyM30.6X_JC5GVVzZGsI1sG5hhmIE5ezA_yLbxjx57EsDG-U0';

async function fetchAll(table, selectStr) {
    let allData = [];
    let offset = 0;
    const limit = 1000;
    
    while(true) {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${selectStr}&limit=${limit}&offset=${offset}`, {
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

async function insertData(table, dataArray) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(dataArray)
    });
    if(!res.ok) {
        console.log('Error inserting:', await res.text());
    }
}

async function checkData() {
    try {
        console.log("Reading Excel file...");
        const wb = xlsx.readFile('c:/CET EXAM ONLINE/payments - 01 Jun 26 - 24 Jun 26.xlsx');
        const sheetName = wb.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
        
        const captured = data.filter(d => d.status === 'captured');
        console.log(`Total captured payments in Excel: ${captured.length}`);
        
        console.log("Fetching DB records...");
        const dbStudents = await fetchAll('students', 'email,mobile,full_name,transaction_id,payment_utr');
        console.log(`Fetched ${dbStudents.length} students`);
        
        const dbPayments = await fetchAll('payments', 'email,payment_utr,payment_id');
        console.log(`Fetched ${dbPayments.length} payments`);
        
        const dbEmails = new Set(dbStudents.map(s => (s.email || '').toLowerCase().trim()));
        const dbPhones = new Set(dbStudents.map(s => (s.mobile || '').trim()));
        const dbUtrs = new Set(dbStudents.map(s => s.payment_utr).filter(Boolean));
        
        const paymentDbEmails = new Set(dbPayments.map(p => (p.email || '').toLowerCase().trim()));
        const paymentDbUtrs = new Set(dbPayments.map(p => p.payment_utr).filter(Boolean));
        const paymentDbIds = new Set(dbPayments.map(p => p.payment_id).filter(Boolean));
        
        const missingStudents = [];
        
        for (const p of captured) {
            const pEmail = (p.email || '').toLowerCase().trim();
            const pContact = (p.contact || '').replace('+91', '').trim();
            const pOrderId = p.order_id;
            const pId = p.id;
            
            const inStudents = dbEmails.has(pEmail) || dbPhones.has(pContact) || dbUtrs.has(pOrderId) || dbUtrs.has(pId);
            const inPayments = paymentDbEmails.has(pEmail) || paymentDbUtrs.has(pOrderId) || paymentDbUtrs.has(pId) || paymentDbIds.has(pId);
            
            if (!inStudents && !inPayments) {
                missingStudents.push(p);
            }
        }
        
        console.log(`Missing students (Paid but not in any table): ${missingStudents.length}`);
        
        if (missingStudents.length > 0) {
            console.log("\nTop 5 Missing Students:");
            missingStudents.slice(0, 5).forEach((m, i) => {
                console.log(`${i+1}. Email: ${m.email}, Contact: ${m.contact}, Amount: ${m.amount}, Date: ${m.created_at}`);
            });
            
            fs.writeFileSync('c:/CET EXAM ONLINE/missing_payments_temp.json', JSON.stringify(missingStudents, null, 2));
            
            console.log("\nSyncing missing to payments table...");
            const newRecords = missingStudents.map(m => ({
                 full_name: 'Missing Application',
                 email: m.email || '',
                 course_applied: 'Unknown Course',
                 payment_status: 'MISSING_APP',
                 payment_amount: String(m.amount),
                 payment_utr: m.order_id,
                 payment_id: m.id,
                 payment_date: new Date(m.created_at * 1000).toISOString()
             }));
             
             for(let i = 0; i < newRecords.length; i += 50) {
                 const chunk = newRecords.slice(i, i + 50);
                 await insertData('payments', chunk);
                 console.log(`Inserted chunk ${Math.floor(i/50) + 1}`);
             }
             console.log("Sync complete!");
        }
        
    } catch (e) {
        console.error(e);
    }
}

checkData();
