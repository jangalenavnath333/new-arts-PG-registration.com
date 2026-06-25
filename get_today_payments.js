const xlsx = require('xlsx');

function checkToday() {
  try {
    const wb = xlsx.readFile('payments - 01 Jun 26 - 24 Jun 26.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // Dates in Excel are often "DD/MM/YYYY HH:mm:ss" like "24/06/2026 14:13:31"
    const todayData = data.filter(x => {
        if (!x.created_at) return false;
        return x.created_at.startsWith('24/06/2026') && x.status === 'captured';
    });
    
    console.log(`--- Students who paid TODAY (24 June 2026) --- Total: ${todayData.length}`);
    todayData.forEach((x, i) => {
        console.log(`${i+1}. Email: ${x.email}, Contact: ${x.contact}, Time: ${x.created_at}, Amount: ${x.amount}`);
    });
    
    // Let's also check offline_data.json
    const d = require('./offline_data.json');
    const students = d.students || d;
    const todayStudents = students.filter(x => {
        if (!x.created_at) return false;
        return x.created_at.startsWith('2026-06-24');
    });
    
    console.log(`\n--- Students added to offline_data.json TODAY --- Total: ${todayStudents.length}`);
    todayStudents.forEach((x, i) => {
        console.log(`${i+1}. Name: ${x.full_name || x.fullName}, Email: ${x.email}, Time: ${x.created_at}`);
    });

  } catch(e) {
    console.error(e);
  }
}

checkToday();
