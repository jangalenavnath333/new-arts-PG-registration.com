const xlsx = require('xlsx');
const fs = require('fs');

const pdfNames = JSON.parse(fs.readFileSync('pdf_names.json', 'utf8')).map(n => n.toLowerCase().trim());
const offline = require('./offline_data.json');
const studentsDb = offline.students || offline;

const workbook = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const captured = data.filter(d => d.status === 'captured');

const students = [];
const seenEmails = new Set();
captured.forEach(d => {
    const email = (d.email || '').toLowerCase().trim();
    if (!seenEmails.has(email) && parseFloat(d.amount) === 500) {
        seenEmails.add(email);
        
        let name = 'Unknown';
        // Try to find name in offline_data.json
        const matched = studentsDb.find(s => (s.email || '').toLowerCase().trim() === email);
        if (matched) {
            name = matched.full_name || matched.fullName || matched.name;
        } else {
            // Try to extract from email prefix for the 8 missing ones
            name = email.split('@')[0];
            // Fix some manual ones based on email
            if (email === 'bhusalvaishnavi@gmail.com') name = 'Vaishnavi Bhusal';
            if (email === 'garudkarneha2004@gmail.com') name = 'Neha Garudkar';
            if (email === 'sanketg0410@gmail.com') name = 'Sanket Gunjal';
            if (email === 'akankshatarate96@gmail.com') name = 'Akanksha Tarate';
            if (email === 'anandkarale4743@gmail.com') name = 'Anand Karale';
            if (email === 'luniyaaaditi83@gmail.com') name = 'Aditi Luniya';
            if (email === 'siddhisangale2022@gmail.com') name = 'Siddhi Sangale';
            if (email === 'sakshisalunke162004@gmail.com') name = 'Sakshi Salunke';
        }
        
        students.push({
            name: name,
            email: email,
            mobile: d.contact,
            date: d.created_at,
            amount: d.amount,
            txnid: d.id
        });
    }
});

const missing = [];

// Helper function to check if name matches approximately
function isNameInPdf(name) {
    const n = name.toLowerCase().trim();
    if (n === 'unknown' || n === '') return false;
    
    // Direct match
    if (pdfNames.includes(n)) return true;
    
    // Check if parts of the name match strongly
    const parts = n.split(' ');
    for (const pName of pdfNames) {
        if (pName.includes(n)) return true;
        if (n.includes(pName)) return true;
        
        // Match first and last name
        if (parts.length >= 2) {
            const first = parts[0];
            const last = parts[parts.length - 1];
            if (pName.includes(first) && pName.includes(last)) return true;
        }
    }
    return false;
}

students.forEach(s => {
    if (!isNameInPdf(s.name)) {
        missing.push(s);
    }
});

console.log("Students NOT in PDFs:", missing.length);

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(missing);
xlsx.utils.book_append_sheet(wb, ws, "Missing Students");
xlsx.writeFile(wb, "Missing_Students_From_PDFs.xlsx");
console.log("Generated Missing_Students_From_PDFs.xlsx");

fs.writeFileSync('missing_students_from_pdfs.json', JSON.stringify(missing, null, 2));
