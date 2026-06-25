const fs = require('fs');
const pdf = require('pdf-parse');

async function extractEmails(filePath) {
    let dataBuffer = fs.readFileSync(filePath);
    let data = await pdf(dataBuffer);
    
    // Extract emails using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = data.text.match(emailRegex) || [];
    
    // Convert to lowercase and deduplicate
    return [...new Set(matches.map(e => e.toLowerCase()))];
}

async function run() {
    try {
        const caEmails = await extractEmails('c:/CET EXAM ONLINE/MSC CA Attendance.pdf');
        const csEmails = await extractEmails('c:/CET EXAM ONLINE/MSC CS Attendance.pdf');
        
        const allPdfEmails = [...new Set([...caEmails, ...csEmails])];
        
        console.log("Extracted total unique emails from PDFs:", allPdfEmails.length);
        
        fs.writeFileSync('c:/CET EXAM ONLINE/pdf_emails.json', JSON.stringify(allPdfEmails, null, 2));
        console.log("Saved to pdf_emails.json");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
