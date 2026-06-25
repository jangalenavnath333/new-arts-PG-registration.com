const xlsx = require('xlsx');

function reconcile() {
    console.log("=== FINAL RECONCILIATION ===");
    
    // 1. Load Razorpay
    const wb = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rzpData = xlsx.utils.sheet_to_json(sheet);
    const captured = rzpData.filter(r => r.status === 'captured');
    
    console.log(`\n[RAZORPAY SOURCE OF TRUTH]`);
    console.log(`Total Successful Transactions: ${captured.length}`);
    
    // Deduplicate Razorpay to find UNIQUE students
    const rzpEmails = {};
    const duplicatesRzp = [];
    captured.forEach(r => {
        const e = (r.email || '').toLowerCase().trim();
        if (!rzpEmails[e]) rzpEmails[e] = [];
        rzpEmails[e].push(r);
    });
    
    let uniqueRzpCount = 0;
    for (const e in rzpEmails) {
        uniqueRzpCount++;
        if (rzpEmails[e].length > 1) {
            duplicatesRzp.push({email: e, count: rzpEmails[e].length});
        }
    }
    console.log(`Total Unique Students who paid in Razorpay: ${uniqueRzpCount}`);
    console.log(`Duplicate Payments in Razorpay (Double payments): ${duplicatesRzp.length} students paid twice.`);

    // 2. Load Offline Data (Forms)
    const d = require('./offline_data.json');
    const apps = d.students || d;
    
    console.log(`\n[APPLICATIONS SOURCE OF TRUTH (offline_data.json)]`);
    console.log(`Total Application Forms: ${apps.length}`);
    
    // Deduplicate Forms
    const appEmails = {};
    const duplicatesApp = [];
    apps.forEach(a => {
        const e = (a.email || '').toLowerCase().trim();
        if (!appEmails[e]) appEmails[e] = [];
        appEmails[e].push(a);
    });
    let uniqueAppCount = 0;
    for (const e in appEmails) {
        uniqueAppCount++;
        if (appEmails[e].length > 1) {
            duplicatesApp.push({email: e, count: appEmails[e].length});
        }
    }
    console.log(`Total Unique Students who filled Form: ${uniqueAppCount}`);
    console.log(`Duplicate Forms: ${duplicatesApp.length} students filled form twice.`);

    // 3. Cross Reference
    // A. Paid in Razorpay but NO Form
    const missingForms = [];
    for (const e in rzpEmails) {
        if (!appEmails[e]) {
            missingForms.push(e);
        }
    }
    console.log(`\n[CROSS-REFERENCE DISCREPANCIES]`);
    console.log(`1. Paid in Razorpay but NO FORM SUBMITTED: ${missingForms.length} students`);
    missingForms.forEach((e, i) => console.log(`   ${i+1}. ${e}`));

    // B. Form Submitted but NOT in Razorpay (Manual / Test / Failed)
    const missingPayments = [];
    for (const e in appEmails) {
        if (!rzpEmails[e]) {
            missingPayments.push(appEmails[e][0]); // push the first form
        }
    }
    console.log(`\n2. Form Submitted but NOT in Razorpay (Test/Failed): ${missingPayments.length} students`);
    missingPayments.forEach((a, i) => {
        console.log(`   ${i+1}. ${a.full_name||a.fullName} (${a.email}) - Status: ${a.payment_status}`);
    });

}

reconcile();
