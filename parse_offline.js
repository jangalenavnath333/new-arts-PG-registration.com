const fs = require('fs');

function run() {
    try {
        const raw = fs.readFileSync('c:/CET EXAM ONLINE/offline_data.json', 'utf-8');
        const data = JSON.parse(raw);
        
        // Let's see what keys are in offline_data.json
        console.log("Keys in offline_data.json:", Object.keys(data));
        
        let students = [];
        if (Array.isArray(data)) {
            students = data;
        } else if (data.students) {
            students = data.students;
        } else if (data.applications) {
            students = data.applications;
        }
        
        if (!students || students.length === 0) {
            console.log("Could not find students array.");
            return;
        }
        
        console.log(`Total students in offline_data: ${students.length}`);
        
        // Find students added today (24 June 2026)
        const addedToday = students.filter(s => {
            const dateStr = s.created_at || s.timestamp || s.date || s.submitted_at;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            return date.getDate() === 24 && date.getMonth() === 5 && date.getFullYear() === 2026;
        });
        
        console.log(`\n--- STUDENTS ADDED TODAY (24 June 2026) : Total ${addedToday.length} ---`);
        addedToday.forEach((s, i) => {
            console.log(`${i+1}. Name: ${s.full_name || s.fullName}, Phone: ${s.mobile || s.phone}, Email: ${s.email}, Course: ${s.course_applied || s.courseApplied}`);
        });

        // Missing applications
        // Criteria for missing: could be status='MISSING', or payment_status='MISSING_APP', or missing form data
        const missingApps = students.filter(s => {
            return s.status === 'MISSING' || 
                   s.payment_status === 'MISSING_APP' || 
                   !s.full_name || 
                   !s.fullName || 
                   (s.fullName === 'Missing Application') ||
                   (s.full_name === 'Missing Application');
        });
        
        console.log(`\n--- MISSING APPLICATIONS : Total ${missingApps.length} ---`);
        missingApps.forEach((s, i) => {
            console.log(`${i+1}. Email: ${s.email}, Phone: ${s.mobile || s.contact}, Payment Date: ${s.payment_date || s.created_at}`);
        });

    } catch (e) {
        console.error(e);
    }
}

run();
