import EmailSvc from './email-service.js';
import SupaDB from './supabase-db.js';

window.openOfflineResultModal = function() {
    document.getElementById('offlineResultModal').classList.remove('hidden');
};

window.closeOfflineResultModal = function() {
    document.getElementById('offlineResultModal').classList.add('hidden');
    document.getElementById('offlineResultFile').value = '';
    document.getElementById('offlinePreviewArea').classList.add('hidden');
    document.getElementById('offlineResultConfirmBtn').classList.add('hidden');
};

window.handleOfflineResultUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('offlineUploadFileName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        processOfflineResults(json);
    };
    reader.readAsArrayBuffer(file);
};

let offlineParsedData = [];

async function processOfflineResults(rows) {
    const tableBody = document.getElementById('offlineParsedTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Matching students with database...</td></tr>';
    document.getElementById('offlinePreviewArea').classList.remove('hidden');

    // Fetch all approved students to match names
    const supabase = SupaDB.getClient();
    let dbStudents = [];
    try {
        const { data, error } = await supabase.from('students').select('cet_student_id, full_name, email');
        if (!error && data) dbStudents = data;
    } catch (err) {
        console.error("Error fetching students:", err);
    }

    offlineParsedData = [];
    let html = '';
    
    rows.forEach((row, index) => {
        // Try to find Name and Score columns
        const keys = Object.keys(row);
        let nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('student'));
        let scoreKey = keys.find(k => k.toLowerCase().includes('score') || k.toLowerCase().includes('mark') || k.toLowerCase().includes('result') || k.toLowerCase().includes('total'));
        let emailKey = keys.find(k => k.toLowerCase().includes('email'));
        
        if (!nameKey || !scoreKey) return; // Skip if no name or score found

        const rawName = (row[nameKey] || '').toString().trim();
        const score = (row[scoreKey] || '').toString().trim();
        const rowEmail = emailKey ? (row[emailKey] || '').toString().trim() : '';

        if (!rawName) return;

        // Try to match with DB
        let matchedEmail = rowEmail;
        let matchedId = 'NOT FOUND';
        let statusHtml = '<span class="text-red-500 font-bold">No DB Match</span>';
        
        const match = dbStudents.find(s => s.full_name && s.full_name.toLowerCase() === rawName.toLowerCase() || (rowEmail && s.email && s.email.toLowerCase() === rowEmail.toLowerCase()));
        
        if (match) {
            matchedEmail = match.email || rowEmail;
            matchedId = match.cet_student_id || 'Matched';
            statusHtml = '<span class="text-emerald-500 font-bold">Matched</span>';
        } else if (matchedEmail) {
             statusHtml = '<span class="text-amber-500 font-bold">Email from Excel</span>';
        } else {
             statusHtml = '<span class="text-red-500 font-bold">Missing Email</span>';
        }

        offlineParsedData.push({
            name: rawName,
            email: matchedEmail,
            score: score,
            cetId: matchedId,
            canSend: !!matchedEmail
        });

        html += `
            <tr>
                <td class="p-3 border-b">${index + 1}</td>
                <td class="p-3 border-b font-bold">${rawName}</td>
                <td class="p-3 border-b text-blue-600">${matchedEmail || 'N/A'}</td>
                <td class="p-3 border-b font-bold">${score}</td>
                <td class="p-3 border-b text-center">${statusHtml}</td>
            </tr>
        `;
    });

    if (offlineParsedData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500 font-bold">No valid Name/Score columns found in Excel.</td></tr>';
        return;
    }

    tableBody.innerHTML = html;
    document.getElementById('offlineParsedCount').textContent = offlineParsedData.length;
    
    const validEmails = offlineParsedData.filter(d => d.canSend).length;
    if (validEmails > 0) {
        document.getElementById('offlineResultConfirmBtn').classList.remove('hidden');
        document.getElementById('offlineResultConfirmBtn').textContent = `Send Result Emails to ${validEmails} Students`;
    }
}

window.sendOfflineResultEmails = async function() {
    const validData = offlineParsedData.filter(d => d.canSend);
    if (validData.length === 0) return alert("No valid emails found to send.");

    if (!confirm(`Are you sure you want to send result emails to ${validData.length} students?`)) return;

    const btn = document.getElementById('offlineResultConfirmBtn');
    btn.disabled = true;
    btn.textContent = "Sending Emails...";

    let successCount = 0;
    
    // We assume the total marks are 100 for the CET exam, you can change this if needed.
    const totalMarks = 100;

    for (let i = 0; i < validData.length; i++) {
        const d = validData[i];
        btn.textContent = `Sending Email ${i+1} of ${validData.length}...`;
        try {
            const html = EmailSvc.EmailTemplates.resultPublished(d.name, d.score, totalMarks).html;
            const subject = EmailSvc.EmailTemplates.resultPublished(d.name, d.score, totalMarks).subject;
            await EmailSvc.sendEmail(d.email, subject, html);
            successCount++;
        } catch (e) {
            console.error(`Failed to send email to ${d.email}`, e);
        }
    }

    alert(`Successfully sent ${successCount} out of ${validData.length} emails!`);
    closeOfflineResultModal();
};
