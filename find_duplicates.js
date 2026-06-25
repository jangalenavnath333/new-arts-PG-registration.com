const d = require('./offline_data.json');
const students = d.students || d;

const emailMap = {};
const phoneMap = {};

students.forEach(s => {
    // Ignore explicit test accounts
    const email = (s.email || '').toLowerCase().trim();
    if (email.includes('test') || email.includes('example.com') || (s.full_name || '').toLowerCase().includes('test')) return;
    
    if (email) {
        if (!emailMap[email]) emailMap[email] = [];
        emailMap[email].push(s);
    }
    
    const phone = (s.mobile || s.phone || '').trim();
    if (phone && phone !== '9999999999') {
        if (!phoneMap[phone]) phoneMap[phone] = [];
        phoneMap[phone].push(s);
    }
});

console.log("--- DUPLICATE BY EMAIL ---");
for (const email in emailMap) {
    if (emailMap[email].length > 1) {
        console.log(`\nEmail: ${email} (${emailMap[email].length} records)`);
        emailMap[email].forEach((s, i) => {
            console.log(`  ${i+1}. Name: ${s.full_name || s.fullName}, Status: ${s.payment_status}, Created: ${s.created_at}`);
        });
    }
}

console.log("\n--- DUPLICATE BY PHONE ---");
for (const phone in phoneMap) {
    if (phoneMap[phone].length > 1) {
        // Only print if we didn't already print them by email to avoid noise
        const emailsForThisPhone = phoneMap[phone].map(s => (s.email||'').toLowerCase().trim());
        const allSameEmail = emailsForThisPhone.every(e => e === emailsForThisPhone[0]);
        if (!allSameEmail || !emailMap[emailsForThisPhone[0]] || emailMap[emailsForThisPhone[0]].length <= 1) {
            console.log(`\nPhone: ${phone} (${phoneMap[phone].length} records)`);
            phoneMap[phone].forEach((s, i) => {
                console.log(`  ${i+1}. Name: ${s.full_name || s.fullName}, Email: ${s.email}, Status: ${s.payment_status}`);
            });
        }
    }
}
